import React from "react";
import { Sliders, Ruler, Hash, Cylinder, Gauge, ShieldCheck, Tag, Box } from "lucide-react";

export default function GeometrySpecs({
  specs,
  onChange,
  bends = [],
  rateMasterInfo
}) {
  const shapeSizes = {
    Round: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'],
    Square: ["20x20", "25x25", "25x12", "40x40", "45x45", "50x50", "60x60", "1/2x1/2"],
    Rectangular: ["40x20", "50x25", "60x40", "80x40"]
  };

  const currentSizes = shapeSizes[specs.tube_shape] || shapeSizes.Square;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Sliders size={18} />
          <span>Job & Pipe Profile Specs (Rate Master Lookup)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Tag size={13} style={{ color: "var(--accent-amber)" }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-amber)" }}>
            Job No: #{specs.job_number || "121"}
          </span>
        </div>
      </div>

      {/* 3D Part Bounding Envelope & Height Summary */}
      {specs.bbox_3d && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: specs.height_mm > 5 ? "rgba(6, 182, 212, 0.08)" : "rgba(15, 23, 42, 0.4)",
          border: specs.height_mm > 5 ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          marginBottom: 12,
          fontSize: "0.75rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Box size={14} style={{ color: specs.height_mm > 5 ? "var(--accent-cyan)" : "var(--text-muted)" }} />
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Part Envelope:</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              {specs.bbox_3d.width_mm} × {specs.bbox_3d.length_mm} ×{" "}
              <strong style={{ color: specs.height_mm > 5 ? "var(--accent-cyan)" : "inherit" }}>
                {specs.height_mm} mm
              </strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {specs.height_mm > 5 ? (
              <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>
                ↕ Z Height: {specs.height_mm} mm ({specs.height_in}") [3D Active]
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>
                Single-Plane 2D (Height: 0 mm)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Primary Extracted Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-box">
          <div className="metric-accent accent-blue" />
          <div className="metric-label">Total Flattened Length</div>
          <div className="metric-value">
            {specs.flattened_length_mm ? specs.flattened_length_mm.toFixed(0) : 400}
            <span className="metric-unit">mm</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            Cut Pipe Blanks
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent accent-cyan" />
          <div className="metric-label">Detected Bends</div>
          <div className="metric-value" style={{ color: "var(--accent-cyan)" }}>
            {specs.detected_bends || 1}
            <span className="metric-unit">bends</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            From Customer Drawing
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent accent-emerald" />
          <div className="metric-label">Rate Card Profile</div>
          <div className="metric-value" style={{ fontSize: "1.1rem" }}>
            {specs.tube_shape} {specs.tube_size}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            {specs.wall_thickness_mm}mm {specs.material_code}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent accent-amber" />
          <div className="metric-label">Rate Card Lookup</div>
          <div className="metric-value" style={{ fontSize: "1.05rem", color: "var(--accent-emerald)" }}>
            ₹{rateMasterInfo?.bending_rate_base || 30} / ₹{rateMasterInfo?.cutting_rate_per_pc || 5}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            Bend / Cut Rate
          </div>
        </div>
      </div>

      {/* Form Controls for Costing Sheet Version 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {/* Job Number */}
        <div className="form-group">
          <label className="form-label">
            <span>Job No.</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={specs.job_number || "121"}
            onChange={(e) => onChange("job_number", e.target.value)}
          />
        </div>

        {/* Profile Shape */}
        <div className="form-group">
          <label className="form-label">
            <span>Shape</span>
          </label>
          <select
            className="form-select"
            value={specs.tube_shape}
            onChange={(e) => {
              const newShape = e.target.value;
              onChange("tube_shape", newShape);
              const defaultSize = shapeSizes[newShape]?.[0] || "25x25";
              onChange("tube_size", defaultSize);
            }}
          >
            <option value="Square">Square</option>
            <option value="Round">Round</option>
            <option value="Rectangular">Rectangular</option>
          </select>
        </div>

        {/* Size Dropdown matching Rate Master */}
        <div className="form-group">
          <label className="form-label">
            <span>Size (Rate Master)</span>
          </label>
          <select
            className="form-select"
            value={specs.tube_size}
            onChange={(e) => onChange("tube_size", e.target.value)}
          >
            {currentSizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>

        {/* Thickness */}
        <div className="form-group">
          <label className="form-label">
            <span>Thickness (mm)</span>
          </label>
          <select
            className="form-select"
            value={specs.wall_thickness_mm}
            onChange={(e) => onChange("wall_thickness_mm", parseFloat(e.target.value))}
          >
            <option value="1.5">1.5 mm</option>
            <option value="1.2">1.2 mm</option>
          </select>
        </div>

        {/* Material */}
        <div className="form-group">
          <label className="form-label">
            <span>Material</span>
          </label>
          <select
            className="form-select"
            value={specs.material_code}
            onChange={(e) => onChange("material_code", e.target.value)}
          >
            <option value="SS">SS (Stainless Steel)</option>
            <option value="MS">MS (Mild Steel)</option>
          </select>
        </div>

        {/* Order Quantity (Yellow cell in Sheet 2) */}
        <div className="form-group">
          <label className="form-label">
            <span>Quantity (pcs)</span>
            <span style={{ color: "var(--accent-amber)" }}>Yellow Cell</span>
          </label>
          <input
            type="number"
            min="1"
            className="form-input"
            value={specs.quantity}
            onChange={(e) => onChange("quantity", parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
    </div>
  );
}
