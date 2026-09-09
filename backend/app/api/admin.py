from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.models.rate_master import (
    TubeRateMaster,
    SetupChargeMaster,
    ToolingDie
)

router = APIRouter(prefix="/api/admin", tags=["Admin Rate Master"])

class TubeRateUpdate(BaseModel):
    bending_rate_per_pc: float
    cutting_rate_per_pc: float
    thickness_mm: Optional[float] = 1.5

class SetupChargeUpdate(BaseModel):
    id: int
    base_setting_charge: float
    hourly_rate: float

class ToolingDieCreate(BaseModel):
    tube_od_mm: float
    tube_shape: str = "Round"
    clr_mm: float
    is_standard_stock: bool = True
    mandrel_available: bool = True
    custom_tooling_charge: float = 5000.0

@router.get("/tube-rates")
async def get_tube_rates(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(TubeRateMaster))
    return res.scalars().all()

@router.put("/tube-rate/{rate_id}")
async def update_tube_rate(rate_id: int, payload: TubeRateUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(TubeRateMaster).where(TubeRateMaster.id == rate_id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Rate row not found")

    item.bending_rate_per_pc = payload.bending_rate_per_pc
    item.cutting_rate_per_pc = payload.cutting_rate_per_pc
    if payload.thickness_mm is not None:
        item.thickness_mm = payload.thickness_mm
    item.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success", "message": f"Updated {item.shape} {item.size} rates"}

@router.put("/setup-charge/{setup_id}")
async def update_setup_charge(setup_id: int, payload: SetupChargeUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(SetupChargeMaster).where(SetupChargeMaster.id == setup_id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Setup charge entry not found")

    item.base_setting_charge = payload.base_setting_charge
    item.hourly_rate = payload.hourly_rate
    item.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success", "message": f"Updated {item.machine_type} setup to ₹{payload.base_setting_charge:.2f}"}

@router.get("/all-rates")
async def get_all_rate_master_data(db: AsyncSession = Depends(get_db)):
    tube_res = await db.execute(select(TubeRateMaster))
    setup_res = await db.execute(select(SetupChargeMaster))
    tool_res = await db.execute(select(ToolingDie))

    return {
        "tube_rates": tube_res.scalars().all(),
        "setup_charges": setup_res.scalars().all(),
        "tooling_dies": tool_res.scalars().all()
    }

@router.post("/tooling-die")
async def add_tooling_die(payload: ToolingDieCreate, db: AsyncSession = Depends(get_db)):
    die = ToolingDie(
        tube_od_mm=payload.tube_od_mm,
        tube_shape=payload.tube_shape,
        clr_mm=payload.clr_mm,
        is_standard_stock=payload.is_standard_stock,
        mandrel_available=payload.mandrel_available,
        custom_tooling_charge=payload.custom_tooling_charge
    )
    db.add(die)
    await db.commit()
    await db.refresh(die)
    return {"status": "success", "die": die}

@router.delete("/tooling-die/{die_id}")
async def delete_tooling_die(die_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ToolingDie).where(ToolingDie.id == die_id)
    res = await db.execute(stmt)
    die = res.scalars().first()
    if not die:
        raise HTTPException(status_code=404, detail="Tooling die not found")

    await db.delete(die)
    await db.commit()
    return {"status": "success", "message": "Tooling die deleted"}
