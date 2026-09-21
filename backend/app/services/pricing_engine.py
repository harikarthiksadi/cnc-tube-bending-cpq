import math
import re
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.rate_master import (
    TubeRateMaster,
    SetupChargeMaster,
    ToolingDie
)

# Material densities in g/cm³ -> 1 g/cm³ = 1e-6 kg/mm³
MATERIAL_DENSITIES = {
    "SS": 7.93,
    "SS304": 7.93,
    "SS316": 8.00,
    "MS": 7.85,
    "MS_CRCA": 7.85,
    "AL": 2.70,
    "ALUMINUM": 2.70,
    "COPPER": 8.96,
    "BRASS": 8.50,
}

# Standard industrial raw material benchmark rates (₹/kg)
DEFAULT_MATERIAL_RATES = {
    "SS": 280.0,
    "SS304": 280.0,
    "SS316": 380.0,
    "MS": 85.0,
    "MS_CRCA": 85.0,
    "AL": 260.0,
    "ALUMINUM": 260.0,
    "COPPER": 750.0,
    "BRASS": 520.0,
}

def parse_tube_dimensions(tube_shape: str, tube_size: str, tube_od_mm: float) -> tuple[float, float]:
    """Extract width and height in mm from tube_size or tube_od_mm."""
    shape_lower = tube_shape.lower()
    if "square" in shape_lower:
        match = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)", tube_size or "")
        if match:
            s = float(match.group(1))
            return s, s
        return tube_od_mm, tube_od_mm
    elif "rect" in shape_lower:
        match = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)", tube_size or "")
        if match:
            return float(match.group(1)), float(match.group(2))
        return tube_od_mm, max(10.0, tube_od_mm * 0.5)
    else:  # Round
        return tube_od_mm, tube_od_mm

def calculate_tube_weight_kg(
    tube_shape: str,
    tube_size: str,
    tube_od_mm: float,
    wall_thickness_mm: float,
    flattened_length_mm: float,
    material_code: str
) -> float:
    """Computes exact metal weight per piece in kilograms."""
    shape_lower = tube_shape.lower()
    t = max(0.1, wall_thickness_mm)
    length_mm = max(1.0, flattened_length_mm)
    w, h = parse_tube_dimensions(tube_shape, tube_size, tube_od_mm)

    if "round" in shape_lower:
        od = max(t * 2 + 0.1, tube_od_mm)
        # Metal cross-sectional area: pi * (OD - t) * t
        area_mm2 = math.pi * (od - t) * t
    elif "square" in shape_lower:
        s = max(t * 2 + 0.1, w)
        # Metal cross-sectional area: 4 * (s - t) * t
        area_mm2 = 4.0 * (s - t) * t
    else:  # Rectangular
        w_eff = max(t * 2 + 0.1, w)
        h_eff = max(t * 2 + 0.1, h)
        # Metal cross-sectional area: 2 * (w + h - 2t) * t
        area_mm2 = 2.0 * (w_eff + h_eff - 2.0 * t) * t

    volume_mm3 = area_mm2 * length_mm
    mat_key = (material_code or "SS").upper()
    density_g_cm3 = MATERIAL_DENSITIES.get(mat_key, 7.85)
    weight_kg = volume_mm3 * density_g_cm3 * 1e-6
    return round(max(0.01, weight_kg), 4)

class PricingEngine:
    """
    Automated CPQ Pricing Engine translating company Excel logic:
    'CNC PIPE / TUBE BENDING COSTING - VERSION 3' and Rate Master table,
    with Material Sourcing Toggle (Job Work vs Full Supply) and 18% GST Engine.
    """

    @classmethod
    async def calculate_quote_pricing(
        cls,
        session: AsyncSession,
        tube_od_mm: float = 25.4,
        wall_thickness_mm: float = 1.5,
        flattened_length_mm: float = 400.0,
        detected_bends: int = 1,
        quantity: int = 100,
        material_code: str = "SS",
        tube_shape: str = "Square",
        tube_size: str = "25x25",
        cutting_method: str = "Cold Saw",
        machine_type: Optional[str] = None,
        custom_setting_charge: Optional[float] = None,
        manual_rate_per_piece: Optional[float] = None,
        secondary_operations: Optional[List[str]] = None,
        clr_mm: Optional[float] = None,
        job_number: Optional[str] = "121",
        # New Parameters for Material Sourcing & GST
        material_mode: str = "making_cost_only",  # "making_cost_only" | "with_material"
        material_rate_per_kg: Optional[float] = None,
        scrap_allowance_pct: float = 5.0,
        gst_type: str = "intra_state",  # "intra_state" | "inter_state" | "exempt"
        gst_rate_pct: float = 18.0
    ) -> Dict[str, Any]:
        """
        Calculates exact Version 3 pricing with Material Sourcing & GST handling.
        """
        secondary_operations = secondary_operations or []
        num_bends = max(1, detected_bends)

        # 1. Fetch exact rates from TubeRateMaster (Sheet 1)
        clean_shape = tube_shape.capitalize()
        stmt = select(TubeRateMaster).where(
            and_(
                TubeRateMaster.shape == clean_shape,
                TubeRateMaster.size == tube_size
            )
        )
        res = await session.execute(stmt)
        rate_row = res.scalars().first()

        if not rate_row:
            stmt_shape = select(TubeRateMaster).where(TubeRateMaster.shape == clean_shape)
            res_shape = await session.execute(stmt_shape)
            rate_row = res_shape.scalars().first()

        if rate_row:
            base_bending_rate = rate_row.bending_rate_per_pc
            base_cutting_rate = rate_row.cutting_rate_per_pc
            effective_thickness = rate_row.thickness_mm
            effective_material = rate_row.material
            effective_size = rate_row.size
        else:
            base_bending_rate = 30.0  # ₹30 default
            base_cutting_rate = 5.0   # ₹5 default
            effective_thickness = wall_thickness_mm
            effective_material = material_code or "SS"
            effective_size = tube_size

        # 2. Base Setting Charge from Master or Default
        if custom_setting_charge is not None:
            active_setting_charge = float(custom_setting_charge)
        else:
            setup_stmt = select(SetupChargeMaster)
            setup_res = await session.execute(setup_stmt)
            setup_obj = setup_res.scalars().first()
            active_setting_charge = setup_obj.base_setting_charge if setup_obj else 500.0

        # 3. Part Labor / Making Cost Calculation
        total_bending_cost_per_pc = round(base_bending_rate * num_bends, 2)
        total_cutting_cost_per_pc = round(base_cutting_rate, 2)
        part_labor_cost = round(total_bending_cost_per_pc + total_cutting_cost_per_pc, 2)
        total_labor_cost = round((part_labor_cost * quantity) + active_setting_charge, 2)

        # 4. Material Sourcing & Cost Calculation
        mat_key = (material_code or effective_material or "SS").upper()
        weight_kg_per_piece = calculate_tube_weight_kg(
            tube_shape=clean_shape,
            tube_size=effective_size,
            tube_od_mm=tube_od_mm,
            wall_thickness_mm=effective_thickness,
            flattened_length_mm=flattened_length_mm,
            material_code=mat_key
        )

        effective_material_rate_per_kg = (
            float(material_rate_per_kg)
            if material_rate_per_kg is not None and float(material_rate_per_kg) > 0
            else DEFAULT_MATERIAL_RATES.get(mat_key, 85.0)
        )

        is_with_material = (material_mode == "with_material")
        if is_with_material:
            scrap_multiplier = 1.0 + (max(0.0, scrap_allowance_pct) / 100.0)
            material_cost_per_piece = round(weight_kg_per_piece * effective_material_rate_per_kg * scrap_multiplier, 2)
            total_material_cost = round(material_cost_per_piece * quantity, 2)
        else:
            material_cost_per_piece = 0.0
            total_material_cost = 0.0

        # 5. Taxable Subtotal (Total Excl. Tax)
        total_taxable_cost = round(total_labor_cost + total_material_cost, 2)
        calculated_rate_per_piece = round(total_taxable_cost / max(1, quantity), 2)

        # 6. Manual Overrides
        if manual_rate_per_piece is not None and manual_rate_per_piece > 0:
            final_rate_per_piece = round(manual_rate_per_piece, 2)
            final_taxable_cost = round(final_rate_per_piece * quantity, 2)
            discount_pct = round(100.0 * (final_rate_per_piece - calculated_rate_per_piece) / calculated_rate_per_piece, 1)
        else:
            final_rate_per_piece = calculated_rate_per_piece
            final_taxable_cost = total_taxable_cost
            discount_pct = 0.0

        # 7. GST Calculation (Standard 18%)
        effective_gst_rate = float(gst_rate_pct) if gst_type != "exempt" else 0.0
        if gst_type == "exempt":
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = 0.0
            cgst_amount = 0.0
            sgst_amount = 0.0
            igst_amount = 0.0
            total_gst_amount = 0.0
        elif gst_type == "inter_state":
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = effective_gst_rate
            cgst_amount = 0.0
            sgst_amount = 0.0
            total_gst_amount = round(final_taxable_cost * (effective_gst_rate / 100.0), 2)
            igst_amount = total_gst_amount
        else:  # intra_state (default: CGST 9% + SGST 9%)
            cgst_rate = round(effective_gst_rate / 2.0, 2)
            sgst_rate = round(effective_gst_rate / 2.0, 2)
            igst_rate = 0.0
            total_gst_amount = round(final_taxable_cost * (effective_gst_rate / 100.0), 2)
            cgst_amount = round(total_gst_amount / 2.0, 2)
            sgst_amount = round(total_gst_amount - cgst_amount, 2)
            igst_amount = 0.0

        grand_total = round(final_taxable_cost + total_gst_amount, 2)
        rate_per_piece_incl_tax = round(grand_total / max(1, quantity), 2)

        # 8. Quantity Tier Breakdown (Volume breaks)
        tier_quantities = [10, 25, 50, 100, 250, 500]
        tiers = []
        for q in tier_quantities:
            tier_labor = round((part_labor_cost * q) + active_setting_charge, 2)
            tier_material = round(material_cost_per_piece * q, 2) if is_with_material else 0.0
            tier_taxable = round(tier_labor + tier_material, 2)
            tier_gst = round(tier_taxable * (effective_gst_rate / 100.0), 2)
            tier_grand_total = round(tier_taxable + tier_gst, 2)
            tier_unit_excl = round(tier_taxable / q, 2)
            tier_unit_incl = round(tier_grand_total / q, 2)

            tiers.append({
                "quantity": q,
                "labor_cost_per_pc": part_labor_cost,
                "material_cost_per_pc": material_cost_per_piece,
                "setup_amortized_per_pc": round(active_setting_charge / q, 2),
                "rate_per_piece": tier_unit_excl,
                "rate_per_piece_incl_tax": tier_unit_incl,
                "taxable_total": tier_taxable,
                "gst_total": tier_gst,
                "total_cost": tier_grand_total
            })

        return {
            "summary": {
                "job_number": job_number or "121",
                "final_rate_per_piece": final_rate_per_piece,
                "rate_per_piece_incl_tax": rate_per_piece_incl_tax,
                "total_job_cost": final_taxable_cost,      # Taxable Subtotal
                "taxable_subtotal": final_taxable_cost,
                "grand_total": grand_total,                # Total with GST
                "total_labour_cost": total_labor_cost,
                "total_material_cost": total_material_cost,
                "quantity": quantity,
                "material_mode": material_mode,
                "is_with_material": is_with_material,
                "gst_type": gst_type,
                "gst_rate_pct": effective_gst_rate,
                "total_gst_amount": total_gst_amount,
                "cgst_amount": cgst_amount,
                "sgst_amount": sgst_amount,
                "igst_amount": igst_amount,
                "is_overridden": manual_rate_per_piece is not None,
                "discount_or_markup_pct": discount_pct,
                "calculated_rate_per_piece": calculated_rate_per_piece,
                "currency": "₹"
            },
            "breakdown": {
                "shape": clean_shape,
                "size": effective_size,
                "thickness_mm": effective_thickness,
                "material": effective_material,
                "tube_weight_kg_per_pc": weight_kg_per_piece,
                "total_batch_weight_kg": round(weight_kg_per_piece * quantity, 2),
                "material_mode": material_mode,
                "is_with_material": is_with_material,
                "material_rate_per_kg": effective_material_rate_per_kg,
                "scrap_allowance_pct": scrap_allowance_pct,
                "material_cost_per_pc": material_cost_per_piece,
                "total_material_cost": total_material_cost,
                "bending_rate_base": base_bending_rate,
                "detected_bends": num_bends,
                "bending_rate_per_pc": total_bending_cost_per_pc,
                "cutting_rate_per_pc": total_cutting_cost_per_pc,
                "part_labor_cost": part_labor_cost,
                "setting_charge": active_setting_charge,
                "setting_charge_amortized_per_pc": round(active_setting_charge / quantity, 2),
                "is_custom_setting_charge": custom_setting_charge is not None
            },
            "tax": {
                "gst_type": gst_type,
                "gst_rate_pct": effective_gst_rate,
                "cgst_rate_pct": cgst_rate,
                "sgst_rate_pct": sgst_rate,
                "igst_rate_pct": igst_rate,
                "cgst_amount": cgst_amount,
                "sgst_amount": sgst_amount,
                "igst_amount": igst_amount,
                "total_gst_amount": total_gst_amount,
                "taxable_amount": final_taxable_cost,
                "grand_total": grand_total
            },
            "formula_trace": {
                "material_formula": (
                    f"{weight_kg_per_piece:.3f} kg × ₹{effective_material_rate_per_kg:.1f}/kg (+{scrap_allowance_pct}% scrap) = ₹{material_cost_per_piece:.2f}/pc"
                    if is_with_material else "Customer Material (Job Work) = ₹0.00/pc"
                ),
                "part_labor_formula": f"(₹{base_bending_rate:.2f} × {num_bends} bend{'s' if num_bends>1 else ''}) + ₹{base_cutting_rate:.2f} cut = ₹{part_labor_cost:.2f}/pc",
                "job_cost_formula": (
                    f"((₹{part_labor_cost:.2f} labor + ₹{material_cost_per_piece:.2f} mat) × {quantity} pcs) + ₹{active_setting_charge:.2f} setup = ₹{total_taxable_cost:.2f}"
                    if is_with_material else f"(₹{part_labor_cost:.2f} labor × {quantity} pcs) + ₹{active_setting_charge:.2f} setup = ₹{total_labor_cost:.2f}"
                ),
                "rate_per_piece_formula": f"₹{total_taxable_cost:.2f} / {quantity} pcs = ₹{calculated_rate_per_piece:.2f}/pc (Excl. Tax)",
                "tax_formula": (
                    f"Subtotal ₹{final_taxable_cost:.2f} + {effective_gst_rate}% GST (₹{total_gst_amount:.2f}) = ₹{grand_total:.2f}"
                    if gst_type != "exempt" else f"Subtotal ₹{final_taxable_cost:.2f} (Tax Exempt) = ₹{grand_total:.2f}"
                )
            },
            "quantity_tiers": tiers,
            "rate_snapshot": {
                "shape": clean_shape,
                "size": effective_size,
                "thickness_mm": effective_thickness,
                "material": effective_material,
                "bending_rate_per_pc": base_bending_rate,
                "cutting_rate_per_pc": base_cutting_rate,
                "base_setting_charge": active_setting_charge,
                "material_rate_per_kg": effective_material_rate_per_kg,
                "weight_kg_per_pc": weight_kg_per_piece,
                "material_mode": material_mode,
                "gst_type": gst_type,
                "gst_rate_pct": effective_gst_rate
            }
        }
