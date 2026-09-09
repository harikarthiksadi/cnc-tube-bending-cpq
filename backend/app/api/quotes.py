from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import json
from datetime import datetime
from pathlib import Path

from app.core.database import get_db
from app.core.config import QUOTES_DIR
from app.models.quote import Quote
from app.services.pricing_engine import PricingEngine
from app.services.pdf_generator import PDFQuoteGenerator

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

class CreateQuoteRequest(BaseModel):
    customer_name: str = "Valued Customer"
    customer_company: str = "Client Dynamics Corp"
    customer_email: str = "procurement@client.com"
    customer_phone: Optional[str] = ""
    part_name: str = "Custom Formed Tube Assembly"
    quantity: int = Field(100, ge=1)
    tube_shape: str = "Round"
    tube_od_mm: float = Field(25.4, gt=0)
    wall_thickness_mm: float = Field(1.65, gt=0)
    material_code: str = "MS_CRCA"
    detected_bends: int = Field(1, ge=0)
    flattened_length_mm: float = Field(400.0, gt=0)
    clr_mm: Optional[float] = None
    custom_setting_charge: Optional[float] = None
    manual_rate_per_piece: Optional[float] = None
    secondary_operations: Optional[List[str]] = []
    cad_file_path: Optional[str] = None
    cad_geometry_snapshot: Optional[Dict[str, Any]] = {}

@router.post("/create")
async def create_quote(payload: CreateQuoteRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Run Pricing Engine
        pricing = await PricingEngine.calculate_quote_pricing(
            session=db,
            tube_od_mm=payload.tube_od_mm,
            wall_thickness_mm=payload.wall_thickness_mm,
            flattened_length_mm=payload.flattened_length_mm,
            detected_bends=payload.detected_bends,
            quantity=payload.quantity,
            material_code=payload.material_code,
            tube_shape=payload.tube_shape,
            custom_setting_charge=payload.custom_setting_charge,
            manual_rate_per_piece=payload.manual_rate_per_piece,
            secondary_operations=payload.secondary_operations,
            clr_mm=payload.clr_mm
        )

        quote_num = f"QTE-{datetime.utcnow().strftime('%Y%m%d')}-{int(datetime.utcnow().timestamp()) % 10000:04d}"

        # 2. Build PDF Payload
        pdf_payload = {
            "quote_number": quote_num,
            "customer_name": payload.customer_name,
            "customer_company": payload.customer_company,
            "customer_email": payload.customer_email,
            "customer_phone": payload.customer_phone,
            "part_name": payload.part_name,
            "quantity": payload.quantity,
            "tube_shape": payload.tube_shape,
            "tube_size": pricing["breakdown"].get("size", "25x25"),
            "tube_od_mm": payload.tube_od_mm,
            "wall_thickness_mm": payload.wall_thickness_mm,
            "material_name": pricing["rate_snapshot"].get("material", payload.material_code),
            "material_code": payload.material_code,
            "detected_bends": payload.detected_bends,
            "flattened_length_mm": payload.flattened_length_mm,
            "bending_rate_per_pc": pricing["breakdown"]["bending_rate_base"],
            "cutting_rate_per_pc": pricing["breakdown"]["cutting_rate_per_pc"],
            "setting_charge": pricing["breakdown"]["setting_charge"],
            "final_rate_per_piece": pricing["summary"]["final_rate_per_piece"],
            "total_job_cost": pricing["summary"]["total_job_cost"],
            "quantity_tiers": pricing.get("quantity_tiers", [])
        }

        pdf_path = PDFQuoteGenerator.generate_quote_pdf(pdf_payload)

        # 3. Save Quote Record to Database
        new_quote = Quote(
            quote_number=quote_num,
            customer_name=payload.customer_name,
            customer_company=payload.customer_company,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone or "",
            part_name=payload.part_name,
            quantity=payload.quantity,
            tube_shape=payload.tube_shape,
            tube_od_mm=payload.tube_od_mm,
            wall_thickness_mm=payload.wall_thickness_mm,
            material_code=payload.material_code,
            detected_bends=payload.detected_bends,
            flattened_length_mm=payload.flattened_length_mm,
            labor_cost_per_piece=pricing["breakdown"]["part_labor_cost"],
            material_cost_per_piece=0.0,
            base_setting_charge=pricing["breakdown"]["setting_charge"],
            custom_setting_charge=payload.custom_setting_charge,
            calculated_rate_per_piece=pricing["summary"]["calculated_rate_per_piece"],
            manual_rate_per_piece=payload.manual_rate_per_piece,
            total_job_cost=pricing["summary"]["total_job_cost"],
            secondary_ops=json.dumps(payload.secondary_operations or []),
            rate_snapshot=json.dumps(pricing["rate_snapshot"]),
            cad_geometry_snapshot=json.dumps(payload.cad_geometry_snapshot or {}),
            cad_file_path=payload.cad_file_path,
            pdf_file_path=str(pdf_path),
            status="Draft"
        )
        db.add(new_quote)
        await db.commit()
        await db.refresh(new_quote)

        return {
            "id": new_quote.id,
            "quote_number": new_quote.quote_number,
            "customer_company": new_quote.customer_company,
            "final_rate_per_piece": new_quote.calculated_rate_per_piece if not new_quote.manual_rate_per_piece else new_quote.manual_rate_per_piece,
            "total_job_cost": new_quote.total_job_cost,
            "pdf_download_url": f"/api/quotes/{new_quote.id}/pdf",
            "pricing": pricing,
            "created_at": new_quote.created_at.isoformat()
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate quote: {str(e)}")

@router.get("")
async def list_quotes(db: AsyncSession = Depends(get_db)):
    stmt = select(Quote).order_by(desc(Quote.created_at)).limit(50)
    res = await db.execute(stmt)
    quotes = res.scalars().all()
    results = []
    for q in quotes:
        effective_rate = q.manual_rate_per_piece if q.manual_rate_per_piece is not None else q.calculated_rate_per_piece
        results.append({
            "id": q.id,
            "quote_number": q.quote_number,
            "customer_company": q.customer_company,
            "customer_name": q.customer_name,
            "part_name": q.part_name,
            "quantity": q.quantity,
            "tube_od_mm": q.tube_od_mm,
            "detected_bends": q.detected_bends,
            "flattened_length_mm": q.flattened_length_mm,
            "rate_per_piece": effective_rate,
            "total_job_cost": q.total_job_cost,
            "status": q.status,
            "created_at": q.created_at.strftime("%Y-%m-%d %H:%M"),
            "pdf_url": f"/api/quotes/{q.id}/pdf"
        })
    return results

@router.get("/{quote_id}/pdf")
async def download_quote_pdf(quote_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Quote).where(Quote.id == quote_id)
    res = await db.execute(stmt)
    quote = res.scalars().first()
    if not quote or not quote.pdf_file_path:
        raise HTTPException(status_code=404, detail="Quote PDF not found")

    file_path = Path(quote.pdf_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file missing on server")

    return FileResponse(
        path=str(file_path),
        filename=f"{quote.quote_number}.pdf",
        media_type="application/pdf"
    )
