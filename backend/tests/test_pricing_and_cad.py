import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.rate_master import Base, TubeRateMaster, SetupChargeMaster, ToolingDie
from app.services.sketch_analyzer import SketchAnalyzer
from app.services.pricing_engine import PricingEngine, calculate_tube_weight_kg
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

def test_tube_weight_calculations():
    # SS Round tube 25.4mm OD, 1.5mm wall, 400mm length
    w_round = calculate_tube_weight_kg("Round", "1\"", 25.4, 1.5, 400.0, "SS")
    assert 0.30 < w_round < 0.45

    # MS Square tube 25x25, 1.5mm wall, 400mm length
    w_sq = calculate_tube_weight_kg("Square", "25x25", 25.0, 1.5, 400.0, "MS")
    assert 0.40 < w_sq < 0.50

@pytest.mark.asyncio
async def test_job_121_costing_making_cost_only(test_session):
    # Job 121: Square 25x25, 1.5mm SS, Qty 100, Setting ₹500, Bend ₹30, Cut ₹5
    # Total Labour Cost = ((30 + 5) * 100) + 500 = 3500 + 500 = 4,000.00
    pricing = await PricingEngine.calculate_quote_pricing(
        session=test_session,
        tube_shape="Square",
        tube_size="25x25",
        wall_thickness_mm=1.5,
        material_code="SS",
        detected_bends=1,
        quantity=100,
        custom_setting_charge=500.0,
        job_number="121",
        material_mode="making_cost_only"
    )

    assert pricing["breakdown"]["bending_rate_per_pc"] == 30.0
    assert pricing["breakdown"]["cutting_rate_per_pc"] == 5.0
    assert pricing["breakdown"]["part_labor_cost"] == 35.0
    assert pricing["summary"]["total_labour_cost"] == 4000.0
    assert pricing["summary"]["final_rate_per_piece"] == 40.0
    assert pricing["summary"]["total_material_cost"] == 0.0
    assert pricing["tax"]["total_gst_amount"] == 720.0  # 18% of 4000
    assert pricing["summary"]["grand_total"] == 4720.0

@pytest.mark.asyncio
async def test_costing_with_material(test_session):
    pricing = await PricingEngine.calculate_quote_pricing(
        session=test_session,
        tube_shape="Square",
        tube_size="25x25",
        wall_thickness_mm=1.5,
        flattened_length_mm=400.0,
        material_code="SS",
        detected_bends=1,
        quantity=100,
        custom_setting_charge=500.0,
        material_mode="with_material",
        material_rate_per_kg=280.0
    )

    assert pricing["summary"]["is_with_material"] is True
    assert pricing["breakdown"]["material_cost_per_pc"] > 0
    assert pricing["summary"]["total_material_cost"] > 0
    # Taxable subtotal includes material + labor
    assert pricing["summary"]["taxable_subtotal"] > 4000.0
    # 18% GST properly calculated on grand total
    assert pricing["summary"]["grand_total"] > pricing["summary"]["taxable_subtotal"]

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
        "tube_weight_kg": 0.45,
        "material_mode": "with_material",
        "material_rate_per_kg": 280.0,
        "material_cost_per_piece": 132.30,
        "quantity": 100,
        "bending_rate_per_pc": 30.0,
        "cutting_rate_per_pc": 5.0,
        "setting_charge": 500.0,
        "final_rate_per_piece": 172.30,
        "total_job_cost": 17230.0,
        "gst_type": "intra_state",
        "gst_rate_pct": 18.0,
        "cgst_amount": 1550.70,
        "sgst_amount": 1550.70,
        "total_gst_amount": 3101.40,
        "grand_total": 20331.40
    }
    pdf_path = PDFQuoteGenerator.generate_quote_pdf(test_data)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000
