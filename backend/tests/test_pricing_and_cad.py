import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.rate_master import Base, TubeRateMaster, SetupChargeMaster, ToolingDie
from app.services.sketch_analyzer import SketchAnalyzer
from app.services.pricing_engine import PricingEngine
from app.services.pdf_generator import PDFQuoteGenerator

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Seed exact rates matching Image 1
        session.add(TubeRateMaster(shape="Square", size="25x25", thickness_mm=1.5, material="SS", bending_rate_per_pc=30.0, cutting_rate_per_pc=5.0))
        session.add(TubeRateMaster(shape="Round", size='1"', thickness_mm=1.5, material="SS", bending_rate_per_pc=25.0, cutting_rate_per_pc=5.0))
        session.add(SetupChargeMaster(machine_type="CNC Pipe Bending Machine", base_setting_charge=500.0))
        await session.commit()
        yield session

    await engine.dispose()

def test_sketch_line_drawing_analysis():
    # Test U-Pipe line drawing: Leg 1 (250mm), 90 deg bend, Leg 2 (400mm), 90 deg bend, Leg 3 (250mm)
    segments = [
        {"length_mm": 250.0},
        {"bend_angle_deg": 90.0, "direction": "right"},
        {"length_mm": 400.0},
        {"bend_angle_deg": 90.0, "direction": "right"},
        {"length_mm": 250.0}
    ]
    result = SketchAnalyzer.analyze_line_drawing(segments, clr_mm=50.8)
    assert result["bends_count"] == 2
    assert len(result["bends"]) == 2
    assert result["bends"][0]["angle_deg"] == 90.0
    assert result["flattened_length_mm"] > 900.0
    assert len(result["centerline"]) > 10

@pytest.mark.asyncio
async def test_job_121_costing_version_3(test_session):
    # Image 2 Job 121: Square 25x25, 1.5mm SS, Qty 100, Setting ₹500, Bend ₹30, Cut ₹5
    # Total Labour Cost = ((30 + 5) * 100) + 500 = 3500 + 500 = 4,000.00
    # Rate / Pc = 40.00
    pricing = await PricingEngine.calculate_quote_pricing(
        session=test_session,
        tube_shape="Square",
        tube_size="25x25",
        wall_thickness_mm=1.5,
        material_code="SS",
        detected_bends=1,
        quantity=100,
        custom_setting_charge=500.0,
        job_number="121"
    )

    assert pricing["breakdown"]["bending_rate_per_pc"] == 30.0
    assert pricing["breakdown"]["cutting_rate_per_pc"] == 5.0
    assert pricing["breakdown"]["part_labor_cost"] == 35.0
    assert pricing["summary"]["total_labour_cost"] == 4000.0
    assert pricing["summary"]["final_rate_per_piece"] == 40.0

@pytest.mark.asyncio
async def test_job_122_costing_version_3(test_session):
    # Image 2 Job 122: Round 1", 1.5mm SS, Qty 10, Setting ₹200, Bend ₹25, Cut ₹5
    # Total Labour Cost = ((25 + 5) * 10) + 200 = 300 + 200 = 500.00
    # Rate / Pc = 50.00
    pricing = await PricingEngine.calculate_quote_pricing(
        session=test_session,
        tube_shape="Round",
        tube_size='1"',
        wall_thickness_mm=1.5,
        material_code="SS",
        detected_bends=1,
        quantity=10,
        custom_setting_charge=200.0,
        job_number="122"
    )

    assert pricing["breakdown"]["bending_rate_per_pc"] == 25.0
    assert pricing["breakdown"]["cutting_rate_per_pc"] == 5.0
    assert pricing["breakdown"]["part_labor_cost"] == 30.0
    assert pricing["summary"]["total_labour_cost"] == 500.0
    assert pricing["summary"]["final_rate_per_piece"] == 50.0

def test_pdf_generation():
    test_data = {
        "job_number": "121",
        "quote_number": "TEST-QTE-121",
        "customer_name": "Ramesh Patel",
        "customer_company": "Patel Engineering Works",
        "tube_shape": "Square",
        "tube_size": "25x25",
        "wall_thickness_mm": 1.5,
        "material_code": "SS",
        "detected_bends": 1,
        "flattened_length_mm": 450.0,
        "quantity": 100,
        "bending_rate_per_pc": 30.0,
        "cutting_rate_per_pc": 5.0,
        "setting_charge": 500.0,
        "final_rate_per_piece": 40.0,
        "total_job_cost": 4000.0
    }
    pdf_path = PDFQuoteGenerator.generate_quote_pdf(test_data)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000

@pytest.mark.asyncio
async def test_full_quote_payload_structure(test_session):
    pricing = await PricingEngine.calculate_quote_pricing(
        session=test_session,
        tube_shape="Square",
        tube_size="25x25",
        detected_bends=2,
        quantity=100,
        custom_setting_charge=500.0,
        job_number="121"
    )
    assert pricing["summary"]["total_job_cost"] == 7000.0
    assert pricing["summary"]["final_rate_per_piece"] == 70.0
    assert len(pricing["quantity_tiers"]) == 6
    assert pricing["formula_trace"]["job_cost_formula"] == "(₹65.00 × 100 pcs) + ₹500.00 setup = ₹7000.00"

