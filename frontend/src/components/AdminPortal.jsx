import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Save,
  CheckCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Layers,
  Wrench,
  Tag,
  Building,
  Phone,
  Mail,
  Globe,
  FileText,
  CreditCard,
  RotateCcw,
  Undo2,
  X,
  Loader2
} from "lucide-react";
import {
  getTubeRates,
  updateTubeRate,
  getAllRates,
  updateSetupCharge,
  getCompanyProfile,
  updateCompanyProfile
} from "../services/api";

export default function AdminPortal({ onRatesChanged, onCompanyUpdated, initialTab = "tubes" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tubeRates, setTubeRates] = useState([]);
  const [initialTubeRates, setInitialTubeRates] = useState([]);
  const [undoTubeSnapshot, setUndoTubeSnapshot] = useState(null);
  const [isSavingTubes, setIsSavingTubes] = useState(false);

  const [setupCharges, setSetupCharges] = useState([]);
  const [initialSetupCharges, setInitialSetupCharges] = useState([]);
  const [undoSetupSnapshot, setUndoSetupSnapshot] = useState(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  const [company, setCompany] = useState({
    company_name: "Krishna Industrial Works",
    tagline: "Custom Sheet Metal & CNC Machining Solutions",
    address: "Plot 42, Phase II, Industrial Area, Sector 58",
    city_state_zip: "Bangalore, Karnataka 560058, India",
    phone: "+91 (800) 555-TUBE / +91 98765 43210",
    email: "quotes@krishnaworks.com",
    gstin: "29AAACK1234M1Z5",
    website: "www.krishnaworks.com",
    bank_name: "HDFC Bank",
    account_no: "50200012345678",
    ifsc_code: "HDFC0001234",
    default_lead_time: "5 – 7 Business Days",
    default_payment_terms: "50% Advance with PO, Balance before dispatch",
    default_validity_days: 30,
    default_delivery_terms: "Ex-Works Factory",
    default_terms_and_conditions: ""
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rateData, compData] = await Promise.all([
        getAllRates(),
        getCompanyProfile().catch(() => null)
      ]);
      const tubes = rateData.tube_rates || [];
      const setups = rateData.setup_charges || [];
      setTubeRates(tubes);
      setInitialTubeRates(JSON.parse(JSON.stringify(tubes)));
      setSetupCharges(setups);
      setInitialSetupCharges(JSON.parse(JSON.stringify(setups)));
      if (compData) {
        setCompany(compData);
      }
    } catch (err) {
      alert("Error loading rate master: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, undoAction = null) {
    setToast({ message, undoAction });
    if (!undoAction) {
      setTimeout(() => setToast(null), 3500);
    }
  }

  async function handleSaveCompany(e) {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingCompany(true);
    try {
      const res = await updateCompanyProfile(company);
      if (res && res.profile) {
        setCompany(res.profile);
      }
      showToast("Company profile and branding saved successfully!");
      if (onCompanyUpdated) onCompanyUpdated(res.profile || company);
    } catch (err) {
      alert("Failed to save company profile: " + err.message);
    } finally {
      setIsSavingCompany(false);
    }
  }

  // Calculate modified tube rates
  const changedTubeRows = tubeRates.filter((r, idx) => {
    const init = initialTubeRates[idx];
    if (!init) return false;
    return (
      String(r.bending_rate_per_pc) !== String(init.bending_rate_per_pc) ||
      String(r.cutting_rate_per_pc) !== String(init.cutting_rate_per_pc)
    );
  });
  const hasTubeChanges = changedTubeRows.length > 0;

  // Single Save Handler for all tube rates
  async function handleSaveAllTubeRates() {
    if (!hasTubeChanges) return;

    setIsSavingTubes(true);
    const snapshot = JSON.parse(JSON.stringify(initialTubeRates));
    const modifiedSnapshot = JSON.parse(JSON.stringify(changedTubeRows));

    try {
      await Promise.all(
        changedTubeRows.map((r) =>
          updateTubeRate(r.id, {
            bending_rate_per_pc: parseFloat(r.bending_rate_per_pc) || 0,
            cutting_rate_per_pc: parseFloat(r.cutting_rate_per_pc) || 0,
            thickness_mm: parseFloat(r.thickness_mm) || 1.5
          })
        )
      );

      setUndoTubeSnapshot(snapshot);
      setInitialTubeRates(JSON.parse(JSON.stringify(tubeRates)));
      if (onRatesChanged) onRatesChanged();

      showToast(
        `Saved changes for ${modifiedSnapshot.length} rate profile${modifiedSnapshot.length > 1 ? "s" : ""}!`,
        () => handleUndoTubeRates(snapshot, modifiedSnapshot)
      );
    } catch (err) {
      alert("Failed to save tube rates: " + err.message);
    } finally {
      setIsSavingTubes(false);
    }
  }

  // Undo / Unsave Handler for tube rates
  async function handleUndoTubeRates(snapshot, modifiedList) {
    if (!snapshot) return;
    setIsSavingTubes(true);
    try {
      await Promise.all(
        modifiedList.map((m) => {
          const orig = snapshot.find((s) => s.id === m.id);
          if (!orig) return Promise.resolve();
          return updateTubeRate(orig.id, {
            bending_rate_per_pc: parseFloat(orig.bending_rate_per_pc) || 0,
            cutting_rate_per_pc: parseFloat(orig.cutting_rate_per_pc) || 0,
            thickness_mm: parseFloat(orig.thickness_mm) || 1.5
          });
        })
      );

      setTubeRates(JSON.parse(JSON.stringify(snapshot)));
      setInitialTubeRates(JSON.parse(JSON.stringify(snapshot)));
      setUndoTubeSnapshot(null);
      if (onRatesChanged) onRatesChanged();

      showToast("Changes unsaved! Previous rate master restored.");
    } catch (err) {
      alert("Failed to revert rates: " + err.message);
    } finally {
      setIsSavingTubes(false);
    }
  }

  function handleDiscardTubeRates() {
    setTubeRates(JSON.parse(JSON.stringify(initialTubeRates)));
    showToast("Unsaved edits discarded.");
  }

  // Calculate modified setup charges
  const changedSetupRows = setupCharges.filter((s, idx) => {
    const init = initialSetupCharges[idx];
    if (!init) return false;
    return String(s.base_setting_charge) !== String(init.base_setting_charge);
  });
  const hasSetupChanges = changedSetupRows.length > 0;

  // Single Save Handler for setup charges
  async function handleSaveAllSetupCharges() {
    if (!hasSetupChanges) return;

    setIsSavingSetup(true);
    const snapshot = JSON.parse(JSON.stringify(initialSetupCharges));
    const modifiedSnapshot = JSON.parse(JSON.stringify(changedSetupRows));

    try {
      await Promise.all(
        changedSetupRows.map((s) =>
          updateSetupCharge(s.id, {
            id: s.id,
            base_setting_charge: parseFloat(s.base_setting_charge) || 0,
            hourly_rate: parseFloat(s.hourly_rate) || 0
          })
        )
      );

      setUndoSetupSnapshot(snapshot);
      setInitialSetupCharges(JSON.parse(JSON.stringify(setupCharges)));
      if (onRatesChanged) onRatesChanged();

      showToast(
        `Saved changes for ${modifiedSnapshot.length} machine setting charge${modifiedSnapshot.length > 1 ? "s" : ""}!`,
        () => handleUndoSetupCharges(snapshot, modifiedSnapshot)
      );
    } catch (err) {
      alert("Failed to save setup charges: " + err.message);
    } finally {
      setIsSavingSetup(false);
    }
  }

  // Undo / Unsave Handler for setup charges
  async function handleUndoSetupCharges(snapshot, modifiedList) {
    if (!snapshot) return;
    setIsSavingSetup(true);
    try {
      await Promise.all(
        modifiedList.map((m) => {
          const orig = snapshot.find((s) => s.id === m.id);
          if (!orig) return Promise.resolve();
          return updateSetupCharge(orig.id, {
            id: orig.id,
            base_setting_charge: parseFloat(orig.base_setting_charge) || 0,
            hourly_rate: parseFloat(orig.hourly_rate) || 0
          });
        })
      );

      setSetupCharges(JSON.parse(JSON.stringify(snapshot)));
      setInitialSetupCharges(JSON.parse(JSON.stringify(snapshot)));
      setUndoSetupSnapshot(null);
      if (onRatesChanged) onRatesChanged();

      showToast("Changes unsaved! Previous setup charges restored.");
    } catch (err) {
      alert("Failed to revert setup charges: " + err.message);
    } finally {
      setIsSavingSetup(false);
    }
  }

  function handleDiscardSetupCharges() {
    setSetupCharges(JSON.parse(JSON.stringify(initialSetupCharges)));
    showToast("Unsaved setup charge edits discarded.");
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        Loading Rate Master...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Toast Notice with Interactive Undo / Unsave Action */}
      {toast && (
        <div className="toast-notice">
          <CheckCircle size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toast.message}</span>
          {toast.undoAction && (
            <button
              type="button"
              className="toast-btn"
              onClick={toast.undoAction}
            >
              <Undo2 size={13} />
              <span>Unsave / Undo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={22} style={{ color: "var(--accent-primary)" }} />
            <span>Admin Rate Master (CNC Pipe / Tube Bending)</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4 }}>
            Direct synchronization with company Rate Master. All rates in Indian Rupees (₹).
          </p>
        </div>

        <div style={{ background: "var(--accent-primary-subtle)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "10px 14px", maxWidth: 360 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldAlert size={14} />
            <span>Historical Quote Immutability Active</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
            Updating rates updates future calculations. Past quotes retain frozen snapshots.
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
        <button
          className={`nav-tab ${activeTab === "tubes" ? "active" : ""}`}
          onClick={() => setActiveTab("tubes")}
          style={{ fontSize: "0.85rem" }}
        >
          <Layers size={14} />
          <span>Pipe & Tube Rates ({tubeRates.length} profiles)</span>
          {hasTubeChanges && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)", display: "inline-block", marginLeft: 4 }} />
          )}
        </button>

        <button
          className={`nav-tab ${activeTab === "setup" ? "active" : ""}`}
          onClick={() => setActiveTab("setup")}
          style={{ fontSize: "0.85rem" }}
        >
          <Wrench size={14} />
          <span>Machine Setting Charges</span>
          {hasSetupChanges && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)", display: "inline-block", marginLeft: 4 }} />
          )}
        </button>

        <button
          className={`nav-tab ${activeTab === "company" ? "active" : ""}`}
          onClick={() => setActiveTab("company")}
          style={{ fontSize: "0.85rem" }}
        >
          <Building size={14} />
          <span>Company Profile & Branding</span>
        </button>
      </div>

      {/* Rate Master Table with Single Global Save Button */}
      {activeTab === "tubes" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
            <div className="card-title">
              <span>Rate Master Table (Shape, Size, Thickness, Material, Bending & Cutting Rate)</span>
            </div>

            {/* Single Unified Save Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasTubeChanges ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDiscardTubeRates}
                    disabled={isSavingTubes}
                    style={{ height: 34, fontSize: "0.78rem" }}
                  >
                    <RotateCcw size={13} />
                    <span>Discard Edits</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAllTubeRates}
                    disabled={isSavingTubes}
                    style={{ height: 34, minWidth: 160, fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    {isSavingTubes ? (
                      <>
                        <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        <span>Saving Rates...</span>
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        <span>Save Changes ({changedTubeRows.length})</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                  <CheckCircle2 size={14} style={{ color: "var(--accent-primary)" }} />
                  <span>All Rates Saved</span>
                </div>
              )}
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr style={{ background: "rgba(0, 102, 255, 0.06)" }}>
                <th>Shape</th>
                <th>Size</th>
                <th>Thickness (mm)</th>
                <th>Material</th>
                <th>Bending Rate / Pc (₹)</th>
                <th>Cutting Rate / Pc (₹)</th>
              </tr>
            </thead>
            <tbody>
              {tubeRates.map((r, idx) => {
                const init = initialTubeRates[idx] || {};
                const isBendingModified = String(r.bending_rate_per_pc) !== String(init.bending_rate_per_pc);
                const isCuttingModified = String(r.cutting_rate_per_pc) !== String(init.cutting_rate_per_pc);

                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{r.shape}</td>
                    <td style={{ fontWeight: 700, color: "var(--accent-primary)" }}>{r.size}</td>
                    <td>{r.thickness_mm} mm</td>
                    <td>
                      <span style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
                        {r.material}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
                        <input
                          type="number"
                          step="1"
                          className="admin-input"
                          style={{
                            borderColor: isBendingModified ? "var(--accent-primary)" : "var(--border-color)",
                            background: isBendingModified ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                            fontWeight: isBendingModified ? 700 : 500,
                            color: isBendingModified ? "var(--accent-primary)" : "var(--text-main)"
                          }}
                          value={r.bending_rate_per_pc}
                          onChange={(e) => {
                            const copy = [...tubeRates];
                            copy[idx].bending_rate_per_pc = e.target.value;
                            setTubeRates(copy);
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
                        <input
                          type="number"
                          step="1"
                          className="admin-input"
                          style={{
                            borderColor: isCuttingModified ? "var(--accent-primary)" : "var(--border-color)",
                            background: isCuttingModified ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                            fontWeight: isCuttingModified ? 700 : 500,
                            color: isCuttingModified ? "var(--accent-primary)" : "var(--text-main)"
                          }}
                          value={r.cutting_rate_per_pc}
                          onChange={(e) => {
                            const copy = [...tubeRates];
                            copy[idx].cutting_rate_per_pc = e.target.value;
                            setTubeRates(copy);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Setting Charges Tab with Single Global Save Button */}
      {activeTab === "setup" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
            <div className="card-title">Default Machine Setting & Changeover Charges</div>

            {/* Single Unified Save Controls for Setup */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasSetupChanges ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDiscardSetupCharges}
                    disabled={isSavingSetup}
                    style={{ height: 34, fontSize: "0.78rem" }}
                  >
                    <RotateCcw size={13} />
                    <span>Discard Edits</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAllSetupCharges}
                    disabled={isSavingSetup}
                    style={{ height: 34, minWidth: 160, fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    {isSavingSetup ? (
                      <>
                        <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        <span>Saving Charges...</span>
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        <span>Save Changes ({changedSetupRows.length})</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                  <CheckCircle2 size={14} style={{ color: "var(--accent-primary)" }} />
                  <span>All Charges Saved</span>
                </div>
              )}
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Machine Resource</th>
                <th>Setting Charge (₹)</th>
              </tr>
            </thead>
            <tbody>
              {setupCharges.map((s, idx) => {
                const init = initialSetupCharges[idx] || {};
                const isModified = String(s.base_setting_charge) !== String(init.base_setting_charge);

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.machine_type}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>₹</span>
                        <input
                          type="number"
                          step="50"
                          className="admin-input"
                          style={{
                            width: 130,
                            borderColor: isModified ? "var(--accent-primary)" : "var(--border-color)",
                            background: isModified ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                            fontWeight: isModified ? 700 : 500,
                            color: isModified ? "var(--accent-primary)" : "var(--text-main)"
                          }}
                          value={s.base_setting_charge}
                          onChange={(e) => {
                            const copy = [...setupCharges];
                            copy[idx].base_setting_charge = e.target.value;
                            setSetupCharges(copy);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Company Profile & Branding Tab */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveCompany} className="card" style={{ padding: 24 }}>
          <div className="card-header" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.15rem" }}>
                  <Building size={18} style={{ color: "var(--accent-primary)" }} />
                  <span>Company Profile & Quotation Branding</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                  This identity is applied to the top navigation, quotation headers, commercial proposals, and generated PDFs.
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingCompany}
                style={{ height: 38, minWidth: 140 }}
              >
                <Save size={14} />
                <span>{isSavingCompany ? "Saving Changes..." : "Save Company"}</span>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Building size={13} style={{ color: "var(--accent-primary)" }} />
                <span>Company Name (Legal / Trade)</span>
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontWeight: 600 }}
                placeholder="e.g. Precision Tube & Bending Works"
                value={company.company_name}
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Tag size={13} style={{ color: "var(--accent-cyan)" }} />
                <span>Tagline / Workshop Division</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CNC Rotary Draw Bending & Precision Metal Fabrication"
                value={company.tagline}
                onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldAlert size={13} style={{ color: "var(--accent-emerald)" }} />
                <span>Vendor GSTIN (Tax Identification)</span>
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                placeholder="e.g. 29AAACK1234M1Z5"
                value={company.gstin}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={13} style={{ color: "var(--accent-primary)" }} />
                <span>Phone / Contact Numbers</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. +91 98765 43210 / +91 (800) 555-TUBE"
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={13} style={{ color: "var(--accent-secondary)" }} />
                <span>Official Quotes Email</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. quotes@precisionbending.com"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={13} style={{ color: "var(--accent-cyan)" }} />
                <span>Website</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. www.precisionbending.com"
                value={company.website}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Factory / Workshop Street Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Plot 42, Phase II, Industrial Area, Sector 58"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>City, State, PIN Code & Country</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bangalore, Karnataka 560058, India"
                value={company.city_state_zip}
                onChange={(e) => setCompany({ ...company, city_state_zip: e.target.value })}
              />
            </div>
          </div>

          {/* Commercial & Bank Defaults */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={16} style={{ color: "var(--accent-primary)" }} />
              <span>Standard Commercial Quotation Terms (Defaults)</span>
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Default Lead Time / Delivery</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5 – 7 Business Days"
                  value={company.default_lead_time}
                  onChange={(e) => setCompany({ ...company, default_lead_time: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Default Payment Terms</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 50% Advance with PO, Balance before dispatch"
                  value={company.default_payment_terms}
                  onChange={(e) => setCompany({ ...company, default_payment_terms: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Default Delivery / Freight Basis</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ex-Works Factory"
                  value={company.default_delivery_terms}
                  onChange={(e) => setCompany({ ...company, default_delivery_terms: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Quote Validity (Days)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="365"
                  value={company.default_validity_days}
                  onChange={(e) => setCompany({ ...company, default_validity_days: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Bank Details (for Proforma / Invoices)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234"
                  value={company.bank_name ? `${company.bank_name} | A/C: ${company.account_no} | IFSC: ${company.ifsc_code}` : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.split("|").map(p => p.trim());
                    setCompany({
                      ...company,
                      bank_name: parts[0] || "",
                      account_no: parts[1]?.replace("A/C:", "").trim() || company.account_no,
                      ifsc_code: parts[2]?.replace("IFSC:", "").trim() || company.ifsc_code
                    });
                  }}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={13} style={{ color: "var(--accent-secondary)" }} />
                  <span>Standard Terms & Conditions (Appended to Quotes)</span>
                </label>
                <textarea
                  className="form-input"
                  rows="4"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: 1.4 }}
                  value={company.default_terms_and_conditions}
                  onChange={(e) => setCompany({ ...company, default_terms_and_conditions: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingCompany}
              style={{ height: 42, padding: "0 24px" }}
            >
              <Save size={16} />
              <span>{isSavingCompany ? "Saving..." : "Save Company Profile"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
