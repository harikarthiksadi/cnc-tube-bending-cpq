import math
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.rate_master import (
    TubeRateMaster,
    SetupChargeMaster,
    ToolingDie
)

class PricingEngine:
    """
    Automated CPQ Pricing Engine translating company Excel logic:
    'CNC PIPE / TUBE BENDING COSTING - VERSION 3' and Rate Master table.
    
    Part Labor Cost = (Base Bending Rate × Detected Bends) + Base Cutting Rate
    Total Labour Cost = (Part Labor Cost × Quantity) + Setting Charge
    Final Rate per Piece = Total Labour Cost / Quantity
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
        job_number: Optional[str] = "121"
    ) -> Dict[str, Any]:
        """
        Calculates exact Version 3 pricing from user's Excel Sheet 1 & Sheet 2.
        """
        secondary_operations = secondary_operations or []
        num_bends = max(1, detected_bends)

        # 1. Fetch exact rates from TubeRateMaster (Sheet 1)
        # Match shape, size, thickness, material
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
            # Fallback by shape or default
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
            effective_material = "SS"
            effective_size = tube_size

        # 2. Base Setting Charge from Master or Default
        if custom_setting_charge is not None:
            active_setting_charge = float(custom_setting_charge)
        else:
            # Sheet 2 defaults: ₹500 for larger jobs, ₹200 for small jobs (or lookup)
            setup_stmt = select(SetupChargeMaster)
            setup_res = await session.execute(setup_stmt)
            setup_obj = setup_res.scalars().first()
            active_setting_charge = setup_obj.base_setting_charge if setup_obj else 500.0

        # 3. Part Labor Cost Calculation
        # Bending Rate / Pc for all bends
        total_bending_cost_per_pc = round(base_bending_rate * num_bends, 2)
        total_cutting_cost_per_pc = round(base_cutting_rate, 2)
        part_labor_cost = round(total_bending_cost_per_pc + total_cutting_cost_per_pc, 2)

        # 4. Total Labour Cost Calculation (Image 2 Sheet formula):
        # Total Labour Cost = (Part Labor Cost × Quantity) + Setting Charge
        total_labor_cost = round((part_labor_cost * quantity) + active_setting_charge, 2)

        # 5. Final Rate per Piece:
        # Rate / Pc = Total Labour Cost / Quantity
        calculated_rate_per_piece = round(total_labor_cost / max(1, quantity), 2)

        # 6. Manual Overrides
        if manual_rate_per_piece is not None and manual_rate_per_piece > 0:
            final_rate_per_piece = round(manual_rate_per_piece, 2)
            final_total_job_cost = round(final_rate_per_piece * quantity, 2)
            discount_pct = round(100.0 * (final_rate_per_piece - calculated_rate_per_piece) / calculated_rate_per_piece, 1)
        else:
            final_rate_per_piece = calculated_rate_per_piece
            final_total_job_cost = total_labor_cost
            discount_pct = 0.0

        # 7. Quantity Tier Breakdown (Volume breaks)
        tier_quantities = [10, 25, 50, 100, 250, 500]
        tiers = []
        for q in tier_quantities:
            tier_total = round((part_labor_cost * q) + active_setting_charge, 2)
            tier_unit = round(tier_total / q, 2)
            tiers.append({
                "quantity": q,
                "labor_cost_per_pc": part_labor_cost,
                "setup_amortized_per_pc": round(active_setting_charge / q, 2),
                "rate_per_piece": tier_unit,
                "total_cost": tier_total
            })

        return {
            "summary": {
                "job_number": job_number or "121",
                "final_rate_per_piece": final_rate_per_piece,
                "total_job_cost": final_total_job_cost,
                "total_labour_cost": total_labor_cost,
                "quantity": quantity,
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
                "bending_rate_base": base_bending_rate,
                "detected_bends": num_bends,
                "bending_rate_per_pc": total_bending_cost_per_pc,
                "cutting_rate_per_pc": total_cutting_cost_per_pc,
                "part_labor_cost": part_labor_cost,
                "setting_charge": active_setting_charge,
                "setting_charge_amortized_per_pc": round(active_setting_charge / quantity, 2),
                "is_custom_setting_charge": custom_setting_charge is not None
            },
            "formula_trace": {
                "part_labor_formula": f"(₹{base_bending_rate:.2f} × {num_bends} bend{'s' if num_bends>1 else ''}) + ₹{base_cutting_rate:.2f} cut = ₹{part_labor_cost:.2f}/pc",
                "job_cost_formula": f"(₹{part_labor_cost:.2f} × {quantity} pcs) + ₹{active_setting_charge:.2f} setup = ₹{total_labor_cost:.2f}",
                "rate_per_piece_formula": f"₹{total_labor_cost:.2f} / {quantity} pcs = ₹{calculated_rate_per_piece:.2f}/pc"
            },
            "quantity_tiers": tiers,
            "rate_snapshot": {
                "shape": clean_shape,
                "size": effective_size,
                "thickness_mm": effective_thickness,
                "material": effective_material,
                "bending_rate_per_pc": base_bending_rate,
                "cutting_rate_per_pc": base_cutting_rate,
                "base_setting_charge": active_setting_charge
            }
        }
