import React, { useState } from "react";
import { X, FileText, Download, CheckCircle2, Building, User, Mail, Phone, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { createQuote, getQuotePdfUrl } from "../services/api";

export default function QuoteModal({
  isOpen,
  onClose,
  specs,
  pricing,
  partName,
  cadFileName
}) {
  if (!isOpen) return null;

  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "John Miller",
    customer_company: "AeroTech Dynamics Corp",
    customer_email: "jmiller@aerotech.com",
    customer_phone: "+1 (312) 555-0192",
    part_name: partName || "Custom Formed Tube Assembly"
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      const payload = {
        customer_name: customerInfo.customer_name,
        customer_company: customerInfo.customer_company,
        customer_email: customerInfo.customer_email,
        customer_phone: customerInfo.customer_phone,
        part_name: customerInfo.part_name,
        quantity: specs.quantity,
        tube_shape: specs.tube_shape,
        tube_od_mm: specs.tube_od_mm,
        wall_thickness_mm: specs.wall_thickness_mm,
        material_code: specs.material_code,
        detected_bends: specs.detected_bends,
        flattened_length_mm: specs.flattened_length_mm,
        clr_mm: specs.clr_mm,
        custom_setting_charge: specs.custom_setting_charge,
        manual_rate_per_piece: specs.manual_rate_per_piece,
        secondary_operations: specs.secondary_operations || [],
        cad_file_path: cadFileName,
        cad_geometry_snapshot: {
          bends: specs.detected_bends,
          length_mm: specs.flattened_length_mm,
          clr_mm: specs.clr_mm
        }
      };

      const result = await createQuote(payload);
      setCreatedQuote(result);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Automatically trigger PDF download
      const link = document.createElement("a");
      link.href = getQuotePdfUrl(result.id);
      link.download = `${result.quote_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      alert("Failed to generate quote PDF: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={22} style={{ color: "var(--accent-primary)" }} />
            <span>Generate Official Branded PDF Quote</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {createdQuote ? (
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", marginBottom: 12 }}>
              <CheckCircle2 size={42} />
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", marginBottom: 6 }}>
              Quote {createdQuote.quote_number} Generated!
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 20 }}>
              The branded PDF quote has been compiled and downloaded automatically.
            </p>

            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 20, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Client:</span>
                <span style={{ fontWeight: 600 }}>{createdQuote.customer_company}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Rate per Piece:</span>
                <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>₹{createdQuote.final_rate_per_piece?.toFixed(2)} / pc</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Total Job Contract:</span>
                <span style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>₹{createdQuote.total_job_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={getQuotePdfUrl(createdQuote.id)}
                download={`${createdQuote.quote_number}.pdf`}
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                <Download size={16} />
                <span>Re-Download PDF</span>
              </a>
              <button className="btn btn-secondary" onClick={onClose}>
                <span>Close & Return to CPQ</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Customer CRM Information */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 10 }}>
                Customer & Project CRM Details
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Customer Contact Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customerInfo.customer_name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Client Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customerInfo.customer_company}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_company: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={customerInfo.customer_email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={customerInfo.customer_phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Part Name / Drawing Reference</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerInfo.part_name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, part_name: e.target.value })}
                />
              </div>
            </div>

            {/* Itemized Quotation Preview Box */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Quotation Line Items Summary
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                <span>CNC Rotary Draw Bending ({specs.detected_bends} bends &bull; &Oslash;{specs.tube_od_mm}mm)</span>
                <span style={{ fontWeight: 600 }}>{specs.quantity} pcs</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                <span>Flattened Length / Part</span>
                <span style={{ color: "var(--text-secondary)" }}>{specs.flattened_length_mm.toFixed(1)} mm</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
                <span>Part Labor Cost (Bending + Cutting)</span>
                <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                  ₹{(pricing.breakdown?.part_labor_cost ?? 0).toFixed(2)} / pc
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderTop: "1px solid var(--border-color)", paddingTop: 8, marginTop: 8 }}>
                <span style={{ fontWeight: 700 }}>Final Rate per Piece:</span>
                <span style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "1.05rem" }}>
                  ₹{(pricing.summary?.final_rate_per_piece ?? 0).toFixed(2)} / pc
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 700 }}>Total Contract Value:</span>
                <span style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "1.05rem" }}>
                  ₹{(pricing.summary?.total_job_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              style={{ height: 46 }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Compiling Branded PDF Document...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Generate & Download Official PDF</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
