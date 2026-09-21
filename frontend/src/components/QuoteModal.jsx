import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  CheckCircle2,
  Building,
  User,
  Mail,
  Phone,
  Loader2,
  Package,
  Wrench,
  Receipt,
  Copy,
  Printer,
  Calendar,
  Truck,
  CreditCard,
  Clock,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Check
} from "lucide-react";
import confetti from "canvas-confetti";
import { createQuote, getQuotePdfUrl } from "../services/api";

export default function QuoteModal({
  isOpen,
  onClose,
  specs,
  pricing,
  partName,
  cadFileName,
  companyProfile,
  onOpenCompanySettings
}) {
  if (!isOpen) return null;

  const [modalTab, setModalTab] = useState("preview"); // "preview" | "edit"
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "John Miller",
    customer_company: "AeroTech Dynamics Corp",
    customer_email: "jmiller@aerotech.com",
    customer_phone: "+91 98765 43210",
    customer_gstin: "29AAACK1234M1Z5",
    part_name: partName || "Custom Formed Tube Assembly"
  });

  const [commercialTerms, setCommercialTerms] = useState({
    lead_time: companyProfile?.default_lead_time || "5 – 7 Business Days",
    payment_terms: companyProfile?.default_payment_terms || "50% Advance with PO, Balance before dispatch",
    validity_days: companyProfile?.default_validity_days || 30,
    delivery_terms: companyProfile?.default_delivery_terms || "Ex-Works Factory",
    notes: ""
  });

  useEffect(() => {
    if (companyProfile) {
      setCommercialTerms((prev) => ({
        ...prev,
        lead_time: prev.lead_time || companyProfile.default_lead_time || "5 – 7 Business Days",
        payment_terms: prev.payment_terms || companyProfile.default_payment_terms || "50% Advance with PO, Balance before dispatch",
        validity_days: prev.validity_days || companyProfile.default_validity_days || 30,
        delivery_terms: prev.delivery_terms || companyProfile.default_delivery_terms || "Ex-Works Factory",
      }));
    }
  }, [companyProfile]);

  const [gstType, setGstType] = useState(specs.gst_type || "intra_state");
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const isWithMaterial = specs.material_mode === "with_material";
  const { summary, breakdown } = pricing;

  // Live recalculation based on selected gstType in modal
  const taxableSubtotal = summary.taxable_subtotal || summary.total_job_cost;
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;
  let totalGst = 0;

  if (gstType === "intra_state") {
    totalGst = Math.round(taxableSubtotal * 0.18 * 100) / 100;
    cgstAmt = Math.round((totalGst / 2) * 100) / 100;
    sgstAmt = Math.round((totalGst - cgstAmt) * 100) / 100;
  } else if (gstType === "inter_state") {
    totalGst = Math.round(taxableSubtotal * 0.18 * 100) / 100;
    igstAmt = totalGst;
  }
  const grandTotal = Math.round((taxableSubtotal + totalGst) * 100) / 100;
  const landedRatePerPc = Math.round((grandTotal / Math.max(1, specs.quantity)) * 100) / 100;
  const unitRateExclTax = Math.round((taxableSubtotal / Math.max(1, specs.quantity)) * 100) / 100;

  const vendorName = companyProfile?.company_name || "Precision Tube & Bending Works";
  const vendorTagline = companyProfile?.tagline || "CNC Rotary Draw Bending & Precision Metal Fabrication";
  const vendorAddress = companyProfile?.address || "Plot 42, Phase II, Industrial Area, Sector 58";
  const vendorCity = companyProfile?.city_state_zip || "Bangalore, Karnataka 560058, India";
  const vendorPhone = companyProfile?.phone || "+91 (800) 555-TUBE / +91 98765 43210";
  const vendorEmail = companyProfile?.email || "quotes@precisionbending.com";
  const vendorGstin = companyProfile?.gstin || "29AAACK1234M1Z5";

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      const payload = {
        customer_name: customerInfo.customer_name,
        customer_company: customerInfo.customer_company,
        customer_email: customerInfo.customer_email,
        customer_phone: customerInfo.customer_phone,
        customer_gstin: customerInfo.customer_gstin,
        part_name: customerInfo.part_name,
        // Vendor info
        vendor_company_name: vendorName,
        vendor_tagline: vendorTagline,
        vendor_address: `${vendorAddress}, ${vendorCity}`,
        vendor_phone: vendorPhone,
        vendor_email: vendorEmail,
        vendor_gstin: vendorGstin,
        // Commercial terms
        validity_days: commercialTerms.validity_days,
        lead_time: commercialTerms.lead_time,
        payment_terms: commercialTerms.payment_terms,
        delivery_terms: commercialTerms.delivery_terms,
        notes: commercialTerms.notes,
        // Technical specs
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
        },
        material_mode: specs.material_mode || "making_cost_only",
        material_rate_per_kg: specs.material_rate_per_kg,
        scrap_allowance_pct: 5.0,
        gst_type: gstType,
        gst_rate_pct: gstType !== "exempt" ? 18.0 : 0.0
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

  function handleCopyQuote() {
    const text = `
*COMMERCIAL QUOTATION*
*Vendor:* ${vendorName}
*Division:* ${vendorTagline}
*GSTIN:* ${vendorGstin}
*Contact:* ${vendorPhone} | ${vendorEmail}
------------------------------------
*Client:* ${customerInfo.customer_name} (${customerInfo.customer_company})
*Client GSTIN:* ${customerInfo.customer_gstin || "N/A"}
*Part:* ${customerInfo.part_name}
*Batch Quantity:* ${specs.quantity} pcs
*Profile:* ${specs.tube_shape} ${specs.tube_size || `${specs.tube_od_mm}mm`} (${specs.wall_thickness_mm}mm Wall)
*Material Grade:* ${breakdown.material || specs.material_code}
*Bends:* ${specs.detected_bends} bends | Cut Length: ${specs.flattened_length_mm.toFixed(0)}mm
*Scope:* ${isWithMaterial ? "Full Supply (Tube Material Included)" : "Job Work Only (Customer Supplied Tube)"}
------------------------------------
*Commercial Summary:*
• Unit Rate (Excl. GST): ₹${unitRateExclTax.toFixed(2)} / pc
• GST (${gstType === "exempt" ? "0%" : "18%"}): ₹${(totalGst / Math.max(1, specs.quantity)).toFixed(2)} / pc
• *Landed Rate (Incl. GST):* ₹${landedRatePerPc.toFixed(2)} / pc
• *Total Order Value:* ₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
------------------------------------
*Commercial Terms:*
• Lead Time: ${commercialTerms.lead_time}
• Payment Terms: ${commercialTerms.payment_terms}
• Delivery Basis: ${commercialTerms.delivery_terms}
• Quote Validity: ${commercialTerms.validity_days} Days
${commercialTerms.notes ? `• Special Note: ${commercialTerms.notes}` : ""}
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  }

  function handlePrintQuote() {
    window.print();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content quote-modal-enhanced"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: "95vw", maxHeight: "92vh" }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--accent-primary-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)"
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 className="modal-title" style={{ margin: 0, fontSize: "1.2rem" }}>
                  Commercial Quotation Studio
                </h2>
                <span className="quote-header-chip">Job #{specs.job_number || "121"}</span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.68rem",
                  color: "var(--accent-emerald)",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  fontWeight: 700
                }}>
                  ● Live Preview Synced
                </span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                Issuing as: <strong style={{ color: "var(--text-main)" }}>{vendorName}</strong> &bull; {specs.quantity} pcs &bull; {specs.tube_shape} {specs.tube_size || `${specs.tube_od_mm}mm`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* View Selector Tabs */}
            <div className="quote-segmented-tabs">
              <button
                type="button"
                className={`quote-segmented-tab ${modalTab === "preview" ? "active" : ""}`}
                onClick={() => setModalTab("preview")}
              >
                <FileText size={13} />
                <span>Document Preview</span>
              </button>
              <button
                type="button"
                className={`quote-segmented-tab ${modalTab === "edit" ? "active" : ""}`}
                onClick={() => setModalTab("edit")}
              >
                <User size={13} />
                <span>Client & Terms Form</span>
              </button>
            </div>

            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {createdQuote ? (
          /* Success Screen */
          <>
            <div className="modal-body" style={{ textAlign: "center", padding: "32px 24px" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--accent-secondary-subtle)",
                color: "var(--accent-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto"
              }}>
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 800, marginBottom: 4 }}>
                Quotation {createdQuote.quote_number} Generated!
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20 }}>
                The official branded PDF proposal from <strong>{createdQuote.vendor_company_name || vendorName}</strong> has been created with GST & commercial terms.
              </p>

              <div style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                maxWidth: 480,
                margin: "0 auto",
                textAlign: "left"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Client / Customer:</span>
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{createdQuote.customer_company}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Unit Rate (Excl. GST):</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                    ₹{createdQuote.final_rate_per_piece?.toFixed(2)} / pc
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Landed Rate (Incl. GST):</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-secondary)", fontFamily: "var(--font-mono)" }}>
                    ₹{createdQuote.rate_per_piece_incl_tax?.toFixed(2)} / pc
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: 10 }}>
                  <span style={{ color: "var(--text-main)", fontSize: "0.9rem", fontWeight: 800 }}>Total Order Value:</span>
                  <span style={{ fontWeight: 800, color: "var(--accent-primary)", fontSize: "1.2rem", fontFamily: "var(--font-mono)" }}>
                    ₹{(createdQuote.grand_total || createdQuote.total_job_cost)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ flexDirection: "row", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyQuote}
                style={{ flex: 1, height: 42 }}
              >
                {copiedToast ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedToast ? "Copied Summary!" : "Copy for WhatsApp"}</span>
              </button>
              <a
                href={getQuotePdfUrl(createdQuote.id)}
                download={`${createdQuote.quote_number}.pdf`}
                className="btn btn-primary"
                style={{ textDecoration: "none", flex: 1, height: 42 }}
              >
                <Download size={16} />
                <span>Re-Download PDF</span>
              </a>
              <button className="btn btn-secondary" onClick={onClose} style={{ width: 90, height: 42 }}>
                <span>Done</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body" style={{ padding: "16px 20px" }}>
              {/* Tab 1: Live Document Preview (Letterhead Mode) */}
              {modalTab === "preview" && (
                <div className="quote-letterhead-container" id="printable-quotation">
                  {/* Company Letterhead Top Banner */}
                  <div className="quote-letterhead-header">
                    <div>
                      <div className="quote-vendor-brand">{vendorName}</div>
                      <div className="quote-vendor-tagline">{vendorTagline}</div>
                      <div className="quote-vendor-meta">
                        {vendorAddress}, {vendorCity}<br />
                        Phone: {vendorPhone} &bull; Email: {vendorEmail}<br />
                        <strong>GSTIN:</strong> {vendorGstin} &bull; CNC Pipe & Tube Bending Division
                      </div>
                    </div>

                    <div className="quote-header-right">
                      <div className="quote-official-badge">OFFICIAL QUOTATION</div>
                      <div className="quote-meta-line"><strong>Quote Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="quote-meta-line"><strong>Job Ref:</strong> #{specs.job_number || "121"}</div>
                      <div className="quote-meta-line"><strong>Validity:</strong> {commercialTerms.validity_days} Days</div>
                      <div className="quote-meta-line">
                        <span className="scope-chip" style={{
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: isWithMaterial ? "var(--accent-secondary-subtle)" : "var(--accent-primary-subtle)",
                          color: isWithMaterial ? "var(--accent-secondary)" : "var(--accent-primary)"
                        }}>
                          {isWithMaterial ? "FULL SUPPLY (WITH MATERIAL)" : "JOB WORK / MAKING CHARGES ONLY"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Specs Two-Column Block */}
                  <div className="quote-letterhead-split">
                    <div className="quote-party-box">
                      <div className="quote-box-title">CUSTOMER / BILL TO</div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        {customerInfo.customer_name}
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", fontWeight: 600 }}>
                        {customerInfo.customer_company}
                      </div>
                      {customerInfo.customer_email && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          {customerInfo.customer_email} &bull; {customerInfo.customer_phone}
                        </div>
                      )}
                      {customerInfo.customer_gstin && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-cyan)", marginTop: 4 }}>
                          GSTIN: {customerInfo.customer_gstin}
                        </div>
                      )}
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                        Part: <strong>{customerInfo.part_name}</strong>
                      </div>
                    </div>

                    <div className="quote-party-box">
                      <div className="quote-box-title">TUBE & PROCESS SPECIFICATIONS</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: "0.78rem" }}>
                        <div>Profile: <strong>{specs.tube_shape} {specs.tube_size || `${specs.tube_od_mm}mm`}</strong></div>
                        <div>Wall Thickness: <strong>{specs.wall_thickness_mm} mm</strong></div>
                        <div>Material Grade: <strong>{breakdown.material || specs.material_code}</strong></div>
                        <div>Number of Bends: <strong>{specs.detected_bends}</strong></div>
                        <div>Centerline Radius: <strong>{specs.clr_mm} mm</strong></div>
                        <div>Cut Length: <strong>{specs.flattened_length_mm.toFixed(0)} mm</strong></div>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--accent-primary)", marginTop: 6, fontWeight: 600 }}>
                        Sourcing: {isWithMaterial ? `Raw tube supplied by vendor (@ ₹${breakdown.material_rate_per_kg}/kg)` : "Customer supplied raw pipe"}
                      </div>
                    </div>
                  </div>

                  {/* Commercial Line Item Breakdown Table */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                        Commercial Cost Breakdown ({specs.quantity} Pcs Batch)
                      </span>
                      {/* GST Selector directly on Preview */}
                      <div className="quote-segmented-tabs">
                        <button
                          type="button"
                          className={`quote-segmented-tab ${gstType === "intra_state" ? "active" : ""}`}
                          onClick={() => setGstType("intra_state")}
                        >
                          Intra-State (9%+9%)
                        </button>
                        <button
                          type="button"
                          className={`quote-segmented-tab ${gstType === "inter_state" ? "active" : ""}`}
                          onClick={() => setGstType("inter_state")}
                        >
                          Inter-State (18%)
                        </button>
                        <button
                          type="button"
                          className={`quote-segmented-tab ${gstType === "exempt" ? "active" : ""}`}
                          onClick={() => setGstType("exempt")}
                        >
                          Exempt (0%)
                        </button>
                      </div>
                    </div>

                    <table className="quote-preview-table">
                      <thead>
                        <tr>
                          <th>Description of Service / Goods</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Rate / pc</th>
                          <th style={{ textAlign: "right" }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isWithMaterial && (
                          <tr>
                            <td>
                              <strong>Raw Metal Tube Supply</strong> ({breakdown.material} {breakdown.shape}, {breakdown.tube_weight_kg_per_pc?.toFixed(3)}kg @ ₹{breakdown.material_rate_per_kg}/kg + 5% scrap)
                            </td>
                            <td style={{ textAlign: "right" }}>{specs.quantity}</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{breakdown.material_cost_per_pc.toFixed(2)}</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                              ₹{(breakdown.material_cost_per_pc * specs.quantity).toFixed(2)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td>
                            <strong>CNC Rotary Draw Tube Bending</strong> ({specs.detected_bends} bend{specs.detected_bends > 1 ? "s" : ""} @ ₹{breakdown.bending_rate_base}/bend)
                          </td>
                          <td style={{ textAlign: "right" }}>{specs.quantity}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{breakdown.bending_rate_per_pc.toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                            ₹{(breakdown.bending_rate_per_pc * specs.quantity).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <strong>Cold Cutting & Deburring Service</strong>
                          </td>
                          <td style={{ textAlign: "right" }}>{specs.quantity}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{breakdown.cutting_rate_per_pc.toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                            ₹{(breakdown.cutting_rate_per_pc * specs.quantity).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <strong>Machine Setting & Mandrel Tooling Charge</strong> (One-time batch setup)
                          </td>
                          <td style={{ textAlign: "right" }}>1 batch</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{(breakdown.setting_charge / specs.quantity).toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                            ₹{breakdown.setting_charge.toFixed(2)}
                          </td>
                        </tr>

                        <tr className="quote-table-subtotal-row">
                          <td colSpan="3">
                            <strong>TAXABLE SUBTOTAL (Excl. GST)</strong>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-primary)" }}>
                            ₹{taxableSubtotal.toFixed(2)}
                          </td>
                        </tr>

                        {gstType === "intra_state" && (
                          <>
                            <tr className="quote-table-tax-row">
                              <td colSpan="3">CGST (Central GST @ 9.0%)</td>
                              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{cgstAmt.toFixed(2)}</td>
                            </tr>
                            <tr className="quote-table-tax-row">
                              <td colSpan="3">SGST (State GST @ 9.0%)</td>
                              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{sgstAmt.toFixed(2)}</td>
                            </tr>
                          </>
                        )}
                        {gstType === "inter_state" && (
                          <tr className="quote-table-tax-row">
                            <td colSpan="3">IGST (Integrated GST @ 18.0%)</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹{igstAmt.toFixed(2)}</td>
                          </tr>
                        )}
                        {gstType === "exempt" && (
                          <tr className="quote-table-tax-row">
                            <td colSpan="3">GST (Exempt / SEZ Zero-Rated)</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>₹0.00</td>
                          </tr>
                        )}

                        <tr className="quote-table-grand-row">
                          <td colSpan="2">
                            <strong>GRAND TOTAL (ALL-INCLUSIVE)</strong>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-secondary)" }}>
                            ₹{landedRatePerPc.toFixed(2)} / pc
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-primary)" }}>
                            ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Commercial Terms & Signature Blocks */}
                  <div className="quote-letterhead-footer">
                    <div className="quote-terms-box">
                      <div className="quote-box-title">COMMERCIAL TERMS & CONDITIONS</div>
                      <div className="quote-terms-list">
                        <div>1. <strong>Lead Time:</strong> {commercialTerms.lead_time} from PO & material confirmation.</div>
                        <div>2. <strong>Payment Terms:</strong> {commercialTerms.payment_terms}.</div>
                        <div>3. <strong>Delivery Basis:</strong> {commercialTerms.delivery_terms}. Freight & transit insurance extra.</div>
                        <div>4. <strong>Tolerances:</strong> Bend angles &plusmn;0.5&deg;, straight legs &plusmn;1.0mm per ISO 2768-m.</div>
                        <div>5. <strong>Validity:</strong> {commercialTerms.validity_days} days from date of issuance.</div>
                        {commercialTerms.notes && (
                          <div style={{ color: "var(--accent-primary)", marginTop: 2 }}>
                            6. <strong>Special Note:</strong> {commercialTerms.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="quote-signatures-box">
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>FOR {vendorName.toUpperCase()}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: 18 }}>Authorized Technical Signatory</div>
                        <div style={{ borderBottom: "1px dashed var(--border-color)", width: "80%" }}></div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>ACCEPTED & CONFIRMED BY CLIENT</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: 18 }}>Date & Official Stamp</div>
                        <div style={{ borderBottom: "1px dashed var(--border-color)", width: "80%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Client & Terms Input Form */}
              {modalTab === "edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Issuing Vendor Overview Banner */}
                  <div className="quote-vendor-banner">
                    <div className="vendor-info-left">
                      <div className="vendor-badge-icon">
                        <Building size={18} />
                      </div>
                      <div>
                        <div className="vendor-title-row">
                          <span className="vendor-name">{vendorName}</span>
                          <span className="vendor-tag">ISSUING VENDOR</span>
                        </div>
                        <div className="vendor-meta-sub">
                          GSTIN: {vendorGstin || "Not Set"} &bull; {vendorCity}
                        </div>
                      </div>
                    </div>
                    {onOpenCompanySettings && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onOpenCompanySettings}
                        style={{ fontSize: "0.75rem", height: 32, padding: "4px 10px" }}
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                  {/* Customer Information Card */}
                  <div className="quote-modal-card">
                    <div className="quote-section-header">
                      <div className="section-header-icon">
                        <User size={13} />
                      </div>
                      <span>Client & Proposal Information</span>
                    </div>

                    <div className="quote-form-grid">
                      <div className="quote-form-field">
                        <label className="quote-form-label">Contact Person</label>
                        <div className="quote-input-wrapper">
                          <User size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. John Miller"
                            value={customerInfo.customer_name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Client Company Name</label>
                        <div className="quote-input-wrapper">
                          <Building size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. AeroTech Dynamics Corp"
                            value={customerInfo.customer_company}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_company: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Email Address</label>
                        <div className="quote-input-wrapper">
                          <Mail size={14} className="quote-input-icon" />
                          <input
                            type="email"
                            className="quote-form-input has-icon"
                            placeholder="e.g. jmiller@aerotech.com"
                            value={customerInfo.customer_email}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Phone Number</label>
                        <div className="quote-input-wrapper">
                          <Phone size={14} className="quote-input-icon" />
                          <input
                            type="tel"
                            className="quote-form-input has-icon"
                            placeholder="e.g. +91 98765 43210"
                            value={customerInfo.customer_phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Client GSTIN (Tax ID)</label>
                        <div className="quote-input-wrapper">
                          <Receipt size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                            placeholder="e.g. 29AAACK1234M1Z5"
                            value={customerInfo.customer_gstin}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_gstin: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Part Name / Assembly</label>
                        <div className="quote-input-wrapper">
                          <FileText size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. Custom Formed Tube Assembly"
                            value={customerInfo.part_name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, part_name: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commercial Terms Configuration Card */}
                  <div className="quote-modal-card">
                    <div className="quote-section-header">
                      <div className="section-header-icon accent-blue">
                        <CreditCard size={13} />
                      </div>
                      <span>Commercial Terms & Delivery Schedule</span>
                    </div>

                    <div className="quote-form-grid">
                      <div className="quote-form-field">
                        <label className="quote-form-label">Lead Time / Delivery</label>
                        <div className="quote-input-wrapper">
                          <Clock size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. 5 – 7 Business Days"
                            value={commercialTerms.lead_time}
                            onChange={(e) => setCommercialTerms({ ...commercialTerms, lead_time: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Payment Terms</label>
                        <div className="quote-input-wrapper">
                          <CreditCard size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. 50% Advance with PO, Balance before dispatch"
                            value={commercialTerms.payment_terms}
                            onChange={(e) => setCommercialTerms({ ...commercialTerms, payment_terms: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Delivery Terms</label>
                        <div className="quote-input-wrapper">
                          <Truck size={14} className="quote-input-icon" />
                          <input
                            type="text"
                            className="quote-form-input has-icon"
                            placeholder="e.g. Ex-Works Factory"
                            value={commercialTerms.delivery_terms}
                            onChange={(e) => setCommercialTerms({ ...commercialTerms, delivery_terms: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field">
                        <label className="quote-form-label">Quote Validity (Days)</label>
                        <div className="quote-input-wrapper">
                          <Calendar size={14} className="quote-input-icon" />
                          <input
                            type="number"
                            className="quote-form-input has-icon"
                            value={commercialTerms.validity_days}
                            onChange={(e) => setCommercialTerms({ ...commercialTerms, validity_days: parseInt(e.target.value) || 30 })}
                          />
                        </div>
                      </div>

                      <div className="quote-form-field" style={{ gridColumn: "span 2" }}>
                        <label className="quote-form-label">GST Tax Category</label>
                        <div className="quote-segmented-tabs" style={{ width: "100%", display: "flex" }}>
                          <button
                            type="button"
                            className={`quote-segmented-tab ${gstType === "intra_state" ? "active" : ""}`}
                            onClick={() => setGstType("intra_state")}
                            style={{ flex: 1, justifyContent: "center" }}
                          >
                            Intra-State (CGST 9% + SGST 9%)
                          </button>
                          <button
                            type="button"
                            className={`quote-segmented-tab ${gstType === "inter_state" ? "active" : ""}`}
                            onClick={() => setGstType("inter_state")}
                            style={{ flex: 1, justifyContent: "center" }}
                          >
                            Inter-State (IGST 18%)
                          </button>
                          <button
                            type="button"
                            className={`quote-segmented-tab ${gstType === "exempt" ? "active" : ""}`}
                            onClick={() => setGstType("exempt")}
                            style={{ flex: 1, justifyContent: "center" }}
                          >
                            Exempt / SEZ Zero-Rated (0%)
                          </button>
                        </div>
                      </div>

                      <div className="quote-form-field" style={{ gridColumn: "span 2" }}>
                        <label className="quote-form-label">Special Notes / Inspection Requirements</label>
                        <textarea
                          className="quote-form-input"
                          rows="2"
                          placeholder="e.g. Tube ends to be deburred & cleaned. 100% CMM bend angle inspection."
                          value={commercialTerms.notes}
                          onChange={(e) => setCommercialTerms({ ...commercialTerms, notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyQuote}
                  title="Copy quote summary formatted for WhatsApp or Email"
                  style={{ height: 40 }}
                >
                  {copiedToast ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedToast ? "Copied to Clipboard!" : "Copy for WhatsApp / Email"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrintQuote}
                  title="Print quotation directly from browser"
                  style={{ height: 40 }}
                >
                  <Printer size={15} />
                  <span>Print</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Total Order Value
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                    ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  style={{ height: 42, minWidth: 220, fontSize: "0.9rem" }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Compiling Official PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download Branded PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
