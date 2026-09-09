import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Lock,
  Layers,
  Wrench,
  Tag
} from "lucide-react";
import {
  getTubeRates,
  updateTubeRate,
  getAllRates,
  updateSetupCharge
} from "../services/api";

export default function AdminPortal({ onRatesChanged }) {
  const [activeTab, setActiveTab] = useState("tubes");
  const [tubeRates, setTubeRates] = useState([]);
  const [setupCharges, setSetupCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAllRates();
      setTubeRates(data.tube_rates || []);
      setSetupCharges(data.setup_charges || []);
    } catch (err) {
      alert("Error loading rate master: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveTubeRate(r) {
    try {
      await updateTubeRate(r.id, {
        bending_rate_per_pc: parseFloat(r.bending_rate_per_pc),
        cutting_rate_per_pc: parseFloat(r.cutting_rate_per_pc),
        thickness_mm: parseFloat(r.thickness_mm)
      });
      showToast(`Saved rates for ${r.shape} ${r.size}!`);
      if (onRatesChanged) onRatesChanged();
    } catch (err) {
      alert("Failed: " + err.message);
    }
  }

  async function handleSaveSetupCharge(s) {
    try {
      await updateSetupCharge(s.id, {
        id: s.id,
        base_setting_charge: parseFloat(s.base_setting_charge),
        hourly_rate: parseFloat(s.hourly_rate)
      });
      showToast(`Saved setup charge for ${s.machine_type}!`);
      if (onRatesChanged) onRatesChanged();
    } catch (err) {
      alert("Failed: " + err.message);
    }
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
      {/* Toast Notice */}
      {toast && (
        <div className="toast-notice">
          <CheckCircle size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={22} style={{ color: "var(--accent-primary)" }} />
            <span>Admin Rate Master (CNC Pipe / Tube Bending - Image 1)</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4 }}>
            Direct synchronization with company Rate Master spreadsheet. All rates in Indian Rupees (₹).
          </p>
        </div>

        <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-md)", padding: "10px 14px", maxWidth: 360 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 6 }}>
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
        </button>

        <button
          className={`nav-tab ${activeTab === "setup" ? "active" : ""}`}
          onClick={() => setActiveTab("setup")}
          style={{ fontSize: "0.85rem" }}
        >
          <Wrench size={14} />
          <span>Machine Setting Charges</span>
        </button>
      </div>

      {/* Rate Master Table (Matching Image 1) */}
      {activeTab === "tubes" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>Rate Master Table (Shape, Size, Thickness, Material, Bending & Cutting Rate)</span>
            </div>
          </div>
          <table className="admin-table">
            <thead>
              <tr style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                <th>Shape</th>
                <th>Size</th>
                <th>Thickness (mm)</th>
                <th>Material</th>
                <th>Bending Rate / Pc (₹)</th>
                <th>Cutting Rate / Pc (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tubeRates.map((r, idx) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{r.shape}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-cyan)" }}>{r.size}</td>
                  <td>{r.thickness_mm} mm</td>
                  <td>
                    <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-primary)", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
                      {r.material}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>₹</span>
                      <input
                        type="number"
                        step="1"
                        className="admin-input"
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
                      <span style={{ color: "var(--text-muted)" }}>₹</span>
                      <input
                        type="number"
                        step="1"
                        className="admin-input"
                        value={r.cutting_rate_per_pc}
                        onChange={(e) => {
                          const copy = [...tubeRates];
                          copy[idx].cutting_rate_per_pc = e.target.value;
                          setTubeRates(copy);
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveTubeRate(r)}
                    >
                      <Save size={12} />
                      <span>Save</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Setting Charges Tab */}
      {activeTab === "setup" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Default Machine Setting & Changeover Charges</div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Machine Resource</th>
                <th>Setting Charge (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {setupCharges.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.machine_type}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>₹</span>
                      <input
                        type="number"
                        step="50"
                        className="admin-input"
                        style={{ width: 120 }}
                        value={s.base_setting_charge}
                        onChange={(e) => {
                          const copy = [...setupCharges];
                          copy[idx].base_setting_charge = e.target.value;
                          setSetupCharges(copy);
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveSetupCharge(s)}
                    >
                      <Save size={12} />
                      <span>Save</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
