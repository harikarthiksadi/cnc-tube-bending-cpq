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

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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

        await session.commit()
