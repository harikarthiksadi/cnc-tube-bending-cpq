from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.pricing_engine import PricingEngine

router = APIRouter(prefix="/api/pricing", tags=["Pricing"])

class PricingRequest(BaseModel):
    job_number: Optional[str] = "121"
    tube_shape: str = "Square"
    tube_size: str = "25x25"
    tube_od_mm: float = Field(25.4, gt=0)
    wall_thickness_mm: float = Field(1.5, gt=0)
    flattened_length_mm: float = Field(400.0, gt=0)
    detected_bends: int = Field(1, ge=0)
    quantity: int = Field(100, ge=1)
    material_code: str = "SS"
    custom_setting_charge: Optional[float] = None
    manual_rate_per_piece: Optional[float] = None
    secondary_operations: Optional[List[str]] = []
    clr_mm: Optional[float] = None
    # Material Sourcing & GST parameters
    material_mode: Optional[str] = "making_cost_only"  # "making_cost_only" | "with_material"
    material_rate_per_kg: Optional[float] = None
    scrap_allowance_pct: Optional[float] = 5.0
    gst_type: Optional[str] = "intra_state"  # "intra_state" | "inter_state" | "exempt"
    gst_rate_pct: Optional[float] = 18.0

@router.post("/calculate")
async def calculate_pricing(payload: PricingRequest, db: AsyncSession = Depends(get_db)):
    try:
        pricing = await PricingEngine.calculate_quote_pricing(
            session=db,
            tube_od_mm=payload.tube_od_mm,
            wall_thickness_mm=payload.wall_thickness_mm,
            flattened_length_mm=payload.flattened_length_mm,
            detected_bends=payload.detected_bends,
            quantity=payload.quantity,
            material_code=payload.material_code,
            tube_shape=payload.tube_shape,
            tube_size=payload.tube_size,
            custom_setting_charge=payload.custom_setting_charge,
            manual_rate_per_piece=payload.manual_rate_per_piece,
            secondary_operations=payload.secondary_operations,
            clr_mm=payload.clr_mm,
            job_number=payload.job_number,
            material_mode=payload.material_mode or "making_cost_only",
            material_rate_per_kg=payload.material_rate_per_kg,
            scrap_allowance_pct=payload.scrap_allowance_pct if payload.scrap_allowance_pct is not None else 5.0,
            gst_type=payload.gst_type or "intra_state",
            gst_rate_pct=payload.gst_rate_pct if payload.gst_rate_pct is not None else 18.0
        )
        return pricing
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")
