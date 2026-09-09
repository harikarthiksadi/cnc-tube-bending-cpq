import React, { useState } from "react";
import {
  FileText,
  Calculator,
  CheckCircle,
  Wrench,
  Tag
} from "lucide-react";

export default function PricingBreakdown({
  pricing,
  quantity,
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
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
          Calculating Version 3 Pricing...
        </div>
      </div>
    );
  }

  const { summary, breakdown, formula_trace, quantity_tiers } = pricing;
  const isOverridden = summary.is_overridden;

  return (
    <div className="right-column">
      {/* Primary Hero Pricing Card */}
      <div className="pricing-hero">
        <div className="price-main-display">
          <div>
            <div className="price-per-pc-label">Rate / Pc (Final Quoted Unit Price)</div>
            <div className="price-per-pc-value" style={{ color: "var(--accent-emerald)" }}>
              ₹{summary.final_rate_per_piece.toFixed(2)}
              <span> / pc</span>
            </div>
            {isOverridden && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--accent-amber)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  Manual Override ({summary.discount_or_markup_pct > 0 ? `+${summary.discount_or_markup_pct}%` : `${summary.discount_or_markup_pct}%`})
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Base: ₹{summary.calculated_rate_per_piece.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="total-job-box">
            <div className="total-job-label">Total Labour Cost</div>
            <div className="total-job-value">
              ₹{summary.total_job_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
              Job #{summary.job_number} &bull; {quantity} pcs
            </div>
          </div>
        </div>

        {/* Costing Version 3 Grid Table (Exact Sheet 2 match) */}
        <div style={{ background: "rgba(11, 19, 35, 0.8)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-md)", padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>CNC PIPE / TUBE BENDING COSTING - VERSION 3</span>
            <span style={{ color: "var(--accent-amber)" }}>Yellow = User Input | Green = Auto Calc</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: "0.78rem" }}>
            <div style={{ background: "rgba(254, 240, 138, 0.1)", border: "1px solid rgba(234, 179, 8, 0.3)", padding: "6px 8px", borderRadius: 4 }}>
              <div style={{ fontSize: "0.65rem", color: "var(--accent-amber)", fontWeight: 700 }}>Quantity</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700 }}>{quantity} pcs</div>
            </div>

            <div style={{ background: "rgba(254, 240, 138, 0.1)", border: "1px solid rgba(234, 179, 8, 0.3)", padding: "6px 8px", borderRadius: 4 }}>
              <div style={{ fontSize: "0.65rem", color: "var(--accent-amber)", fontWeight: 700 }}>Setting Charge</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700 }}>₹{breakdown.setting_charge.toFixed(2)}</div>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 8px", borderRadius: 4 }}>
              <div style={{ fontSize: "0.65rem", color: "var(--accent-emerald)", fontWeight: 700 }}>Bending Rate / Pc</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                ₹{breakdown.bending_rate_per_pc.toFixed(2)}
              </div>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 8px", borderRadius: 4 }}>
              <div style={{ fontSize: "0.65rem", color: "var(--accent-emerald)", fontWeight: 700 }}>Cutting Rate / Pc</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                ₹{breakdown.cutting_rate_per_pc.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Cost Itemization Rows */}
        <div style={{ marginBottom: 16 }}>
          <div className="cost-breakdown-row">
            <span className="name">Part Labor ({breakdown.detected_bends} bend{breakdown.detected_bends > 1 ? "s" : ""} @ ₹{breakdown.bending_rate_base} + ₹{breakdown.cutting_rate_per_pc} cut)</span>
            <span className="val">₹{breakdown.part_labor_cost.toFixed(2)} / pc</span>
          </div>
          <div className="cost-breakdown-row">
            <span className="name">Job Setting Charge Amortized (₹{breakdown.setting_charge.toFixed(2)} / {quantity} pcs)</span>
            <span className="val">₹{breakdown.setting_charge_amortized_per_pc.toFixed(2)} / pc</span>
          </div>
          <div className="cost-breakdown-row" style={{ borderTop: "1px solid var(--border-bright)", paddingTop: 8 }}>
            <span className="name" style={{ fontWeight: 700, color: "var(--text-main)" }}>Total Labour Cost (Job #{summary.job_number})</span>
            <span className="val" style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "1.05rem" }}>
              ₹{summary.total_job_cost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Formula Trace Accordion Toggle */}
        <div style={{ marginBottom: 16 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFormulas(!showFormulas)}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calculator size={13} />
              <span>Costing Version 3 Formula Trace</span>
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)" }}>
              {showFormulas ? "Hide" : "View"}
            </span>
          </button>

          {showFormulas && formula_trace && (
            <div className="formula-box" style={{ marginTop: 8 }}>
              <div className="formula-line">
                <span className="label">Part Labor:</span>
                <span>{formula_trace.part_labor_formula}</span>
              </div>
              <div className="formula-line">
                <span className="label">Total Labour:</span>
                <span>{formula_trace.job_cost_formula}</span>
              </div>
              <div className="formula-line">
                <span className="label">Rate / Pc:</span>
                <span>{formula_trace.rate_per_piece_formula}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sales Rep Manual Overrides Panel */}
        <div className="override-panel">
          <div className="override-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={13} />
              <span>Sales Setting Charge & Rate Overrides</span>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Setting Charge (₹)
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
              <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
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
            <button
              onClick={() => {
                onCustomSettingChargeChange(null);
                onManualRateChange(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-amber)",
                fontSize: "0.72rem",
                marginTop: 8,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Reset to Automated Version 3 Pricing
            </button>
          )}
        </div>

        {/* Quantity Tier Schedule */}
        {quantity_tiers && quantity_tiers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Quantity Tier Schedule (₹ / pc)
            </div>
            <table className="tiers-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Labor</th>
                  <th>Setup/pc</th>
                  <th>Rate/pc</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {quantity_tiers.map((t) => (
                  <tr key={t.quantity} className={quantity === t.quantity ? "active-tier" : ""}>
                    <td>{t.quantity} pcs</td>
                    <td>₹{t.labor_cost_per_pc.toFixed(2)}</td>
                    <td>₹{t.setup_amortized_per_pc.toFixed(2)}</td>
                    <td style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>
                      ₹{t.rate_per_piece.toFixed(2)}
                    </td>
                    <td>₹{t.total_cost.toFixed(0)}</td>
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
          style={{ height: 46, fontSize: "0.95rem" }}
        >
          <FileText size={18} />
          <span>Generate Branded PDF Quote (₹ INR)</span>
        </button>
      </div>
    </div>
  );
}
