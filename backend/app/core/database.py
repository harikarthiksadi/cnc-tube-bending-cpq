from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import DATABASE_URL
from app.models.rate_master import (
    Base,
    TubeRateMaster,
    SetupChargeMaster,
    ToolingDie
)
from app.models.company import CompanyProfile
from app.models.quote import Quote

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def _migrate_columns(connection):
    from sqlalchemy import text
    try:
        res = connection.execute(text("PRAGMA table_info(quotes);")).fetchall()
        existing_cols = {row[1] for row in res}
        new_cols = [
            ("customer_gstin", "TEXT DEFAULT ''"),
            ("vendor_company_name", "TEXT DEFAULT 'Precision Tube & Bending Works'"),
            ("vendor_gstin", "TEXT DEFAULT '29AAACK1234M1Z5'"),
            ("validity_days", "INTEGER DEFAULT 30"),
            ("lead_time", "TEXT DEFAULT '5 – 7 Business Days'"),
            ("payment_terms", "TEXT DEFAULT '50% Advance with PO, Balance before dispatch'"),
            ("delivery_terms", "TEXT DEFAULT 'Ex-Works Factory'"),
            ("notes", "TEXT DEFAULT ''"),
            ("material_mode", "TEXT DEFAULT 'making_cost_only'"),
            ("gst_type", "TEXT DEFAULT 'intra_state'"),
            ("gst_rate_pct", "FLOAT DEFAULT 18.0"),
            ("gst_amount", "FLOAT DEFAULT 0.0"),
            ("grand_total", "FLOAT DEFAULT 0.0"),
            ("rate_per_piece_incl_tax", "FLOAT DEFAULT 0.0"),
        ]
        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                connection.execute(text(f"ALTER TABLE quotes ADD COLUMN {col_name} {col_type};"))
    except Exception as e:
        print("Column migration check error:", e)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_columns)

    async with AsyncSessionLocal() as session:
        # Seed Exact Rate Master from User Spreadsheet (Image 1)
        res = await session.execute(select(TubeRateMaster))
        if not res.scalars().first():
            rates = [
                # Round Profiles
                TubeRateMaster(shape="Round", size='1/2"', thickness_mm=1.5, material="SS", bending_rate_per_pc=20.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Round", size='3/4"', thickness_mm=1.5, material="SS", bending_rate_per_pc=20.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Round", size='1"', thickness_mm=1.5, material="SS", bending_rate_per_pc=25.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Round", size='1-1/4"', thickness_mm=1.5, material="SS", bending_rate_per_pc=40.0, cutting_rate_per_pc=8.0),
                TubeRateMaster(shape="Round", size='1-1/2"', thickness_mm=1.5, material="SS", bending_rate_per_pc=40.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Round", size='2"', thickness_mm=1.5, material="SS", bending_rate_per_pc=60.0, cutting_rate_per_pc=10.0),

                # Square Profiles
                TubeRateMaster(shape="Square", size="20x20", thickness_mm=1.5, material="SS", bending_rate_per_pc=20.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Square", size="25x25", thickness_mm=1.5, material="SS", bending_rate_per_pc=30.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Square", size="25x12", thickness_mm=1.5, material="SS", bending_rate_per_pc=35.0, cutting_rate_per_pc=5.0),
                TubeRateMaster(shape="Square", size="40x40", thickness_mm=1.5, material="SS", bending_rate_per_pc=70.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Square", size="45x45", thickness_mm=1.5, material="SS", bending_rate_per_pc=80.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Square", size="50x50", thickness_mm=1.5, material="SS", bending_rate_per_pc=100.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Square", size="60x60", thickness_mm=1.5, material="SS", bending_rate_per_pc=120.0, cutting_rate_per_pc=15.0),
                TubeRateMaster(shape="Square", size="1/2x1/2", thickness_mm=1.2, material="SS", bending_rate_per_pc=25.0, cutting_rate_per_pc=5.0),

                # Rectangular Profiles
                TubeRateMaster(shape="Rectangular", size="40x20", thickness_mm=1.5, material="SS", bending_rate_per_pc=50.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Rectangular", size="40x20", thickness_mm=1.2, material="SS", bending_rate_per_pc=50.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Rectangular", size="50x25", thickness_mm=1.5, material="SS", bending_rate_per_pc=50.0, cutting_rate_per_pc=10.0),
                TubeRateMaster(shape="Rectangular", size="60x40", thickness_mm=1.5, material="SS", bending_rate_per_pc=80.0, cutting_rate_per_pc=15.0),
                TubeRateMaster(shape="Rectangular", size="80x40", thickness_mm=1.5, material="SS", bending_rate_per_pc=100.0, cutting_rate_per_pc=20.0),
            ]
            session.add_all(rates)

        # Setup charges check
        setup_res = await session.execute(select(SetupChargeMaster))
        if not setup_res.scalars().first():
            setups = [
                SetupChargeMaster(machine_type="CNC Pipe Bending Machine", base_setting_charge=500.0, hourly_rate=500.0, setup_hours=1.0),
                SetupChargeMaster(machine_type="Quick Setup Bender", base_setting_charge=200.0, hourly_rate=400.0, setup_hours=0.5),
            ]
            session.add_all(setups)

        # Tooling dies check
        tool_res = await session.execute(select(ToolingDie))
        if not tool_res.scalars().first():
            dies = [
                ToolingDie(tube_od_mm=25.4, tube_shape="Round", clr_mm=50.8, is_standard_stock=True),
                ToolingDie(tube_od_mm=38.1, tube_shape="Round", clr_mm=76.2, is_standard_stock=True),
                ToolingDie(tube_od_mm=50.8, tube_shape="Round", clr_mm=101.6, is_standard_stock=True),
                ToolingDie(tube_od_mm=25.0, tube_shape="Square", clr_mm=50.0, is_standard_stock=True),
                ToolingDie(tube_od_mm=40.0, tube_shape="Square", clr_mm=80.0, is_standard_stock=True),
                ToolingDie(tube_od_mm=50.0, tube_shape="Square", clr_mm=100.0, is_standard_stock=True),
            ]
            session.add_all(dies)

        # Company profile check
        comp_res = await session.execute(select(CompanyProfile))
        if not comp_res.scalars().first():
            company = CompanyProfile(
                company_name="Precision Tube & Bending Works",
                tagline="CNC Rotary Draw Bending & Precision Metal Fabrication",
                address="Plot 42, Phase II, Industrial Area, Sector 58",
                city_state_zip="Bangalore, Karnataka 560058, India",
                phone="+91 (800) 555-TUBE / +91 98765 43210",
                email="quotes@precisionbending.com",
                gstin="29AAACK1234M1Z5",
                website="www.precisionbending.com",
                bank_name="HDFC Bank",
                account_no="50200012345678",
                ifsc_code="HDFC0001234",
                default_lead_time="5 – 7 Business Days",
                default_payment_terms="50% Advance with PO, Balance before dispatch",
                default_validity_days=30,
                default_delivery_terms="Ex-Works Factory",
                default_terms_and_conditions=(
                    "1. Validity: 30 days from quote date.\n"
                    "2. Delivery: 5-7 business days from receipt of confirmed PO & raw material.\n"
                    "3. Payment Terms: 50% advance along with purchase order, balance against proforma before dispatch.\n"
                    "4. Freight & Packaging: Ex-Works our facility. Transport & special packaging charged at actuals.\n"
                    "5. Tolerances: Bend angles ±0.5°, straight leg lengths ±1.0mm per ISO 2768-m.\n"
                    "6. Material: Customer supplied raw tube must be free from rust, severe seams, or excessive ovality."
                )
            )
            session.add(company)

        await session.commit()
