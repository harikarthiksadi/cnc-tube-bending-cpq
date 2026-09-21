from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
import json
from datetime import datetime
from pathlib import Path

from app.core.database import get_db
from app.core.config import QUOTES_DIR
from app.models.quote import Quote
from app.models.company import CompanyProfile
from app.services.pricing_engine import PricingEngine
from app.services.pdf_generator import PDFQuoteGenerator

router = APIRouter(prefix="/api/quotes", tags=["Quotes"])

class CreateQuoteRequest(BaseModel):
    customer_name: str = "Valued Customer"
    customer_company: str = "Client Dynamics Corp"
    customer_email: str = "procurement@client.com"
    customer_phone: Optional[str] = ""
    customer_gstin: Optional[str] = ""
    part_name: str = "Custom Formed Tube Assembly"
    # Vendor / Issuing Company overrides
    vendor_company_name: Optional[str] = None
    vendor_tagline: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_gstin: Optional[str] = None
    # Commercial Terms
    validity_days: Optional[int] = 30
    lead_time: Optional[str] = "5 – 7 Business Days"
    payment_terms: Optional[str] = "50% Advance with PO, Balance before dispatch"
    delivery_terms: Optional[str] = "Ex-Works Factory"
    notes: Optional[str] = ""
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
    # Material Sourcing & GST parameters
    material_mode: Optional[str] = "making_cost_only"
    material_rate_per_kg: Optional[float] = None
    scrap_allowance_pct: Optional[float] = 5.0
    gst_type: Optional[str] = "intra_state"
    gst_rate_pct: Optional[float] = 18.0

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
            clr_mm=payload.clr_mm,
            material_mode=payload.material_mode or "making_cost_only",
            material_rate_per_kg=payload.material_rate_per_kg,
            scrap_allowance_pct=payload.scrap_allowance_pct if payload.scrap_allowance_pct is not None else 5.0,
            gst_type=payload.gst_type or "intra_state",
            gst_rate_pct=payload.gst_rate_pct if payload.gst_rate_pct is not None else 18.0
        )

        quote_num = f"QTE-{datetime.utcnow().strftime('%Y%m%d')}-{int(datetime.utcnow().timestamp()) % 10000:04d}"

        # Fetch active company profile for vendor branding
        comp_res = await db.execute(select(CompanyProfile).order_by(CompanyProfile.id.asc()))
        comp_profile = comp_res.scalars().first()

        vendor_name = payload.vendor_company_name or (comp_profile.company_name if comp_profile else "Precision Tube & Bending Works")
        vendor_tagline = payload.vendor_tagline or (comp_profile.tagline if comp_profile else "CNC Rotary Draw Bending & Metal Fabrication")
        vendor_address = payload.vendor_address or (
            f"{comp_profile.address}, {comp_profile.city_state_zip}" if comp_profile else "Plot 42, Phase II, Industrial Area, Sector 58, Bangalore 560058"
        )
        vendor_phone = payload.vendor_phone or (comp_profile.phone if comp_profile else "+91 (800) 555-TUBE")
        vendor_email = payload.vendor_email or (comp_profile.email if comp_profile else "quotes@precisionbending.com")
        vendor_gstin = payload.vendor_gstin or (comp_profile.gstin if comp_profile else "29AAACK1234M1Z5")
        validity_days = payload.validity_days or (comp_profile.default_validity_days if comp_profile else 30)
        lead_time = payload.lead_time or (comp_profile.default_lead_time if comp_profile else "5 – 7 Business Days")
        payment_terms = payload.payment_terms or (comp_profile.default_payment_terms if comp_profile else "50% Advance with PO, Balance before dispatch")
        delivery_terms = payload.delivery_terms or (comp_profile.default_delivery_terms if comp_profile else "Ex-Works Factory")
        notes = payload.notes or ""
        terms_and_conditions = comp_profile.default_terms_and_conditions if comp_profile else ""

        # 2. Build PDF Payload
        pdf_payload = {
            "quote_number": quote_num,
            "vendor_company_name": vendor_name,
            "vendor_tagline": vendor_tagline,
            "vendor_address": vendor_address,
            "vendor_phone": vendor_phone,
            "vendor_email": vendor_email,
            "vendor_gstin": vendor_gstin,
            "validity_days": validity_days,
            "lead_time": lead_time,
            "payment_terms": payment_terms,
            "delivery_terms": delivery_terms,
            "notes": notes,
            "terms_and_conditions": terms_and_conditions,
            "customer_name": payload.customer_name,
            "customer_company": payload.customer_company,
            "customer_email": payload.customer_email,
            "customer_phone": payload.customer_phone,
            "customer_gstin": payload.customer_gstin,
            "part_name": payload.part_name,
            "quantity": payload.quantity,
            "tube_shape": payload.tube_shape,
            "tube_size": pricing["breakdown"].get("size", f"{payload.tube_od_mm}mm"),
            "tube_od_mm": payload.tube_od_mm,
            "wall_thickness_mm": payload.wall_thickness_mm,
            "material_name": pricing["rate_snapshot"].get("material", payload.material_code),
            "material_code": payload.material_code,
            "detected_bends": payload.detected_bends,
            "flattened_length_mm": payload.flattened_length_mm,
            "tube_weight_kg": pricing["breakdown"].get("tube_weight_kg_per_pc", 0.0),
            "material_mode": payload.material_mode or "making_cost_only",
            "material_rate_per_kg": pricing["breakdown"].get("material_rate_per_kg", 280.0),
            "scrap_allowance_pct": pricing["breakdown"].get("scrap_allowance_pct", 5.0),
            "material_cost_per_piece": pricing["breakdown"].get("material_cost_per_pc", 0.0),
            "bending_rate_per_pc": pricing["breakdown"]["bending_rate_base"],
            "cutting_rate_per_pc": pricing["breakdown"]["cutting_rate_per_pc"],
            "setting_charge": pricing["breakdown"]["setting_charge"],
            "final_rate_per_piece": pricing["summary"]["final_rate_per_piece"],
            "total_job_cost": pricing["summary"]["total_job_cost"],
            "gst_type": pricing["tax"]["gst_type"],
            "gst_rate_pct": pricing["tax"]["gst_rate_pct"],
            "cgst_amount": pricing["tax"]["cgst_amount"],
            "sgst_amount": pricing["tax"]["sgst_amount"],
            "igst_amount": pricing["tax"]["igst_amount"],
            "total_gst_amount": pricing["tax"]["total_gst_amount"],
            "grand_total": pricing["tax"]["grand_total"],
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
            customer_gstin=payload.customer_gstin or "",
            part_name=payload.part_name,
            vendor_company_name=vendor_name,
            vendor_gstin=vendor_gstin,
            validity_days=validity_days,
            lead_time=lead_time,
            payment_terms=payment_terms,
            delivery_terms=delivery_terms,
            notes=notes,
            quantity=payload.quantity,
            tube_shape=payload.tube_shape,
            tube_od_mm=payload.tube_od_mm,
            wall_thickness_mm=payload.wall_thickness_mm,
            material_code=payload.material_code,
            material_mode=payload.material_mode or "making_cost_only",
            detected_bends=payload.detected_bends,
            flattened_length_mm=payload.flattened_length_mm,
            labor_cost_per_piece=pricing["breakdown"]["part_labor_cost"],
            material_cost_per_piece=pricing["breakdown"].get("material_cost_per_pc", 0.0),
            base_setting_charge=pricing["breakdown"]["setting_charge"],
            custom_setting_charge=payload.custom_setting_charge,
            calculated_rate_per_piece=pricing["summary"]["calculated_rate_per_piece"],
            manual_rate_per_piece=payload.manual_rate_per_piece,
            total_job_cost=pricing["summary"]["total_job_cost"],
            gst_type=pricing["tax"]["gst_type"],
            gst_rate_pct=pricing["tax"]["gst_rate_pct"],
            gst_amount=pricing["tax"]["total_gst_amount"],
            grand_total=pricing["tax"]["grand_total"],
            rate_per_piece_incl_tax=pricing["summary"]["rate_per_piece_incl_tax"],
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
            "vendor_company_name": new_quote.vendor_company_name,
            "customer_company": new_quote.customer_company,
            "customer_name": new_quote.customer_name,
            "final_rate_per_piece": new_quote.calculated_rate_per_piece if not new_quote.manual_rate_per_piece else new_quote.manual_rate_per_piece,
            "rate_per_piece_incl_tax": pricing["summary"]["rate_per_piece_incl_tax"],
            "total_job_cost": new_quote.total_job_cost,
            "grand_total": pricing["summary"]["grand_total"],
            "lead_time": new_quote.lead_time,
            "payment_terms": new_quote.payment_terms,
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
            "vendor_company_name": q.vendor_company_name or "Precision Tube & Bending Works",
            "customer_company": q.customer_company,
            "customer_name": q.customer_name,
            "part_name": q.part_name,
            "quantity": q.quantity,
            "tube_od_mm": q.tube_od_mm,
            "detected_bends": q.detected_bends,
            "flattened_length_mm": q.flattened_length_mm,
            "rate_per_piece": effective_rate,
            "rate_per_piece_incl_tax": q.rate_per_piece_incl_tax if q.rate_per_piece_incl_tax else effective_rate,
            "total_job_cost": q.total_job_cost,
            "grand_total": q.grand_total if q.grand_total else q.total_job_cost,
            "gst_type": q.gst_type,
            "lead_time": q.lead_time,
            "payment_terms": q.payment_terms,
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


@router.delete("/{quote_id}")
async def delete_quote(quote_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a single quote and its associated PDF file."""
    stmt = select(Quote).where(Quote.id == quote_id)
    res = await db.execute(stmt)
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Remove PDF file from disk if it exists
    if quote.pdf_file_path:
        pdf = Path(quote.pdf_file_path)
        if pdf.exists():
            pdf.unlink(missing_ok=True)

    await db.delete(quote)
    await db.commit()
    return {"status": "deleted", "id": quote_id}


class BulkDeleteRequest(BaseModel):
    ids: List[int]


@router.post("/bulk-delete")
async def bulk_delete_quotes(payload: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    """Delete multiple quotes by IDs along with their PDF files."""
    if not payload.ids:
        return {"status": "ok", "deleted_count": 0}

    # Fetch quotes to get PDF paths before deletion
    res = await db.execute(select(Quote).where(Quote.id.in_(payload.ids)))
    quotes = res.scalars().all()

    # Remove PDF files from disk
    for q in quotes:
        if q.pdf_file_path:
            pdf = Path(q.pdf_file_path)
            if pdf.exists():
                pdf.unlink(missing_ok=True)

    # Bulk delete from DB
    await db.execute(delete(Quote).where(Quote.id.in_(payload.ids)))
    await db.commit()
    return {"status": "deleted", "deleted_count": len(quotes)}
