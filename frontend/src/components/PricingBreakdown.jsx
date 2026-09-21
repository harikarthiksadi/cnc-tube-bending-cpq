import React, { useState } from "react";
import {
  FileText,
  Calculator,
  CheckCircle,
  Wrench,
  Tag,
  Package,
  ShieldCheck,
  Percent,
  Layers,
  ArrowRight
} from "lucide-react";

export default function PricingBreakdown({
  pricing,
  quantity,
  materialMode = "making_cost_only",
  onMaterialModeChange,
  materialRatePerKg,
  onMaterialRateChange,
  gstType = "intra_state",
  onGstTypeChange,
  customSettingCharge,
  onCustomSettingChargeChange,
  manualRatePerPiece,
  onManualRateChange,
  onOpenQuoteModal
}) {
  const [showFormulas, setShowFormulas] = useState(false);

  if (!pricing) {
    return (
      <div className="card">
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
          Calculating Pricing Engine Matrix...
        </div>
      </div>
    );
  }

  const { summary, breakdown, formula_trace, quantity_tiers } = pricing;
  const isOverridden = summary.is_overridden;
  const isWithMaterial = (materialMode === "with_material" || breakdown.material_mode === "with_material");

  // Correctly extract tube weight and material cost from backend breakdown schema
  const matWeightKg = breakdown.tube_weight_kg_per_pc ?? breakdown.weight_kg_per_pc ?? breakdown.weight_kg_per_piece ?? 0;
  const matCostPerPc = breakdown.material_cost_per_pc ?? breakdown.material_cost_per_piece ?? 0;

  // Format currency helper using clean tabular formatting without awkward monospace gaps
  const fmt = (val) => {
    if (val === undefined || val === null) return "0.00";
    return Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="right-column">
      {/* Primary Hero Pricing Card */}
      <div className="pricing-hero" style={{ paddingBottom: 24 }}>
        
        {/* Scope of Manufacturing Segmented Control (Clean Fit) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>
            Scope of Manufacturing
          </div>
          <div className="quote-segmented-tabs">
            <button
              type="button"
              className={`quote-segmented-tab ${!isWithMaterial ? "active" : ""}`}
              onClick={() => onMaterialModeChange && onMaterialModeChange("making_cost_only")}
              title="Customer supplies raw pipe blanks - Job work only"
            >
              <Wrench size={13} />
              <span>Job Work Only</span>
            </button>
            <button
              type="button"
              className={`quote-segmented-tab ${isWithMaterial ? "active" : ""}`}
              onClick={() => onMaterialModeChange && onMaterialModeChange("with_material")}
              title="Full supply including raw tube material & bending"
            >
              <Package size={13} />
              <span>Full Supply (Tube)</span>
            </button>
          </div>
        </div>

        {/* GST Tax Treatment Toggle (Clean Fit) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 5 }}>
            GST Tax Treatment
          </div>
          <div className="quote-segmented-tabs">
            <button
              type="button"
              className={`quote-segmented-tab ${gstType === "intra_state" ? "active" : ""}`}
              onClick={() => onGstTypeChange && onGstTypeChange("intra_state")}
              title="Intra-State: CGST 9% + SGST 9%"
            >
              <span>Intra-State (9+9%)</span>
            </button>
            <button
              type="button"
              className={`quote-segmented-tab ${gstType === "inter_state" ? "active" : ""}`}
              onClick={() => onGstTypeChange && onGstTypeChange("inter_state")}
              title="Inter-State: IGST 18%"
            >
              <span>Inter-State (18%)</span>
            </button>
            <button
              type="button"
              className={`quote-segmented-tab ${gstType === "exempt" ? "active" : ""}`}
              onClick={() => onGstTypeChange && onGstTypeChange("exempt")}
              title="Exempt / SEZ Zero-Rated (0%)"
            >
              <span>Exempt (0%)</span>
            </button>
          </div>
        </div>

        {/* Dual Rate Display: Landed Rate (Incl. GST) & Total Order Value */}
        <div className="price-main-display">
          <div>
            <div className="price-per-pc-label">
              Landed Rate / Pc (All-Inclusive)
            </div>
            <div className="price-per-pc-value" style={{ color: "var(--accent-primary)", fontVariantNumeric: "tabular-nums" }}>
              ₹{summary.rate_per_piece_incl_tax ? summary.rate_per_piece_incl_tax.toFixed(2) : summary.final_rate_per_piece.toFixed(2)}
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}> / pc</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              Excl. Tax: <strong style={{ color: "var(--text-main)" }}>₹{summary.final_rate_per_piece.toFixed(2)} / pc</strong>
            </div>

            {isOverridden && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--accent-amber)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  Override ({summary.discount_or_markup_pct > 0 ? `+${summary.discount_or_markup_pct}%` : `${summary.discount_or_markup_pct}%`})
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  Base: ₹{summary.calculated_rate_per_piece.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="total-job-box" style={{ textAlign: "right" }}>
            <div className="total-job-label">Total Order Value</div>
            <div className="total-job-value" style={{ fontSize: "1.4rem", color: "var(--accent-primary)", fontFamily: "var(--font-heading)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              ₹{fmt(summary.grand_total || summary.total_job_cost)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
              Job #{summary.job_number} &bull; {quantity} pcs
            </div>
          </div>
        </div>

        {/* 4 Costing Metric Tiles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 16
        }}>
          <div style={{
            background: "var(--bg-card-hover)",
            border: "1px solid var(--border-color)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)"
          }}>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Order Size
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {quantity} pcs
            </div>
          </div>

          <div style={{
            background: "var(--bg-card-hover)",
            border: "1px solid var(--border-color)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)"
          }}>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Labor / pc
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              ₹{breakdown.part_labor_cost.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: "var(--bg-card-hover)",
            border: "1px solid var(--border-color)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)"
          }}>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Setup / pc
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              ₹{breakdown.setting_charge_amortized_per_pc.toFixed(2)}
            </div>
          </div>

          <div style={{
            background: "var(--bg-card-hover)",
            border: "1px solid var(--border-color)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)"
          }}>
            <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Material / pc
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700, color: isWithMaterial ? "var(--accent-secondary)" : "var(--text-muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {isWithMaterial ? `₹${matCostPerPc.toFixed(2)}` : "₹0.00"}
            </div>
          </div>
        </div>

        {/* Transparent Cost Itemization Rows */}
        <div style={{ marginBottom: 16 }}>
          <div className="cost-breakdown-row">
            <span className="name">Part Labor ({breakdown.detected_bends} bend{breakdown.detected_bends > 1 ? "s" : ""} @ ₹{breakdown.bending_rate_base} + ₹{breakdown.cutting_rate_per_pc} cut)</span>
            <span className="val" style={{ fontVariantNumeric: "tabular-nums" }}>₹{breakdown.part_labor_cost.toFixed(2)} / pc</span>
          </div>

          <div className="cost-breakdown-row">
            <span className="name">Batch Setup & Tooling (₹{breakdown.setting_charge.toFixed(2)} / {quantity} pcs)</span>
            <span className="val" style={{ fontVariantNumeric: "tabular-nums" }}>₹{breakdown.setting_charge_amortized_per_pc.toFixed(2)} / pc</span>
          </div>

          {isWithMaterial && (
            <div className="cost-breakdown-row" style={{ color: "var(--accent-secondary)" }}>
              <span className="name">
                Raw Tube Material ({matWeightKg.toFixed(2)} kg @ ₹{breakdown.material_rate_per_kg || 85}/kg + 5% scrap)
              </span>
              <span className="val" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                ₹{matCostPerPc.toFixed(2)} / pc
              </span>
            </div>
          )}

          <div className="cost-breakdown-row" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 6, marginTop: 4 }}>
            <span className="name" style={{ fontWeight: 600 }}>Subtotal (Taxable Value)</span>
            <span className="val" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              ₹{fmt(summary.total_taxable_cost || summary.total_job_cost)}
            </span>
          </div>

          <div className="cost-breakdown-row">
            <span className="name">
              GST ({gstType === "exempt" ? "0% Exempt" : "18.0%"})
            </span>
            <span className="val" style={{ fontVariantNumeric: "tabular-nums" }}>
              ₹{fmt(summary.total_gst_amount || 0)}
            </span>
          </div>

          <div className="cost-breakdown-row" style={{ borderTop: "2px solid var(--accent-primary)", paddingTop: 8, marginTop: 6 }}>
            <span className="name" style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.92rem" }}>
              Total Order Value (All-Inclusive)
            </span>
            <span className="val" style={{ fontWeight: 800, color: "var(--accent-primary)", fontSize: "1.15rem", fontFamily: "var(--font-heading)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
              ₹{fmt(summary.grand_total || summary.total_job_cost)}
            </span>
          </div>
        </div>

        {/* Formula Trace Accordion Toggle */}
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFormulas(!showFormulas)}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calculator size={13} />
              <span>Costing Formula Trace</span>
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--accent-primary)", fontWeight: 600 }}>
              {showFormulas ? "Hide Formulas" : "View Formulas"}
            </span>
          </button>

          {showFormulas && formula_trace && (
            <div className="formula-box" style={{ marginTop: 8 }}>
              <div className="formula-line">
                <span className="label">Part Labor:</span>
                <span>{formula_trace.part_labor_formula}</span>
              </div>
              <div className="formula-line">
                <span className="label">Setup Amortization:</span>
                <span>₹{breakdown.setting_charge} ÷ {quantity} = ₹{breakdown.setting_charge_amortized_per_pc.toFixed(2)}/pc</span>
              </div>
              {isWithMaterial && (
                <div className="formula-line">
                  <span className="label">Material Cost:</span>
                  <span>{matWeightKg.toFixed(2)} kg × ₹{breakdown.material_rate_per_kg}/kg × 1.05 = ₹{matCostPerPc.toFixed(2)}/pc</span>
                </div>
              )}
              <div className="formula-line">
                <span className="label">Total Landed:</span>
                <span>{formula_trace.job_cost_formula}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sales Rep Manual Overrides Panel */}
        <div className="override-panel" style={{ marginBottom: 16 }}>
          <div className="override-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={13} />
              <span>Commercial Overrides & Adjustments</span>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4, fontWeight: 600 }}>
                Setup Charge Override (₹)
              </label>
              <input
                type="number"
                step="50"
                className="form-input"
                placeholder="Default: ₹500"
                value={customSettingCharge !== null ? customSettingCharge : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                  onCustomSettingChargeChange(val);
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4, fontWeight: 600 }}>
                Target Rate / pc (₹)
              </label>
              <input
                type="number"
                step="1"
                className="form-input"
                placeholder={`Calc: ₹${summary.calculated_rate_per_piece.toFixed(2)}`}
                value={manualRatePerPiece !== null ? manualRatePerPiece : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                  onManualRateChange(val);
                }}
              />
            </div>
          </div>

          {(customSettingCharge !== null || manualRatePerPiece !== null) && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onCustomSettingChargeChange(null);
                  onManualRateChange(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-amber)",
                  fontSize: "0.74rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: 600,
                  padding: "4px 0"
                }}
              >
                Reset to Automated Master Rates
              </button>
            </div>
          )}
        </div>

        {/* Quantity Tier Schedule */}
        {quantity_tiers && quantity_tiers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Volume Tier Schedule
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--accent-primary)", fontWeight: 600 }}>
                {isWithMaterial ? "Landed Incl. GST" : "Excl. GST"}
              </span>
            </div>
            <table className="tiers-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Labor</th>
                  <th>Setup/pc</th>
                  <th>Unit Rate</th>
                  <th>Order Value</th>
                </tr>
              </thead>
              <tbody>
                {quantity_tiers.map((t) => (
                  <tr key={t.quantity} className={quantity === t.quantity ? "active-tier" : ""}>
                    <td><strong>{t.quantity} pcs</strong></td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>₹{t.labor_cost_per_pc.toFixed(2)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>₹{t.setup_amortized_per_pc.toFixed(2)}</td>
                    <td style={{ color: "var(--accent-primary)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      ₹{(isWithMaterial ? (t.rate_per_piece_incl_tax || t.rate_per_piece) : t.rate_per_piece).toFixed(2)}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>₹{fmt((isWithMaterial ? (t.rate_per_piece_incl_tax || t.rate_per_piece) : t.rate_per_piece) * t.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate PDF Quote Action Button */}
        <button
          className="btn btn-primary"
          onClick={onOpenQuoteModal}
          style={{
            height: 48,
            fontSize: "0.95rem",
            width: "100%",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0, 102, 255, 0.28)"
          }}
        >
          <FileText size={18} />
          <span>Official Quotation & Proposal Studio</span>
        </button>
      </div>
    </div>
  );
}
