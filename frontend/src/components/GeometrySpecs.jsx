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
          <Sliders size={16} />
          <span>Tube & Job Specifications</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Tag size={13} style={{ color: "var(--accent-amber)" }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent-amber)" }}>
            Job No: #{specs.job_number || "121"}
          </span>
        </div>
      </div>

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
            From Geometry Sketch
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent accent-emerald" />
          <div className="metric-label">Est. Tube Weight</div>
          <div className="metric-value" style={{ fontSize: "1.15rem", color: "var(--accent-emerald)" }}>
            {rateMasterInfo?.weight_kg_per_piece ? rateMasterInfo.weight_kg_per_piece.toFixed(2) : "0.98"}
            <span className="metric-unit">kg/pc</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            {specs.wall_thickness_mm}mm {specs.material_code}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent accent-amber" />
          <div className="metric-label">Rate Card Master</div>
          <div className="metric-value" style={{ fontSize: "1.05rem", color: "var(--accent-primary)" }}>
            ₹{rateMasterInfo?.bending_rate_base || 30} / ₹{rateMasterInfo?.cutting_rate_per_pc || 5}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
            Bend / Cut Base
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

        {/* Order Quantity */}
        <div className="form-group">
          <label className="form-label">
            <span>Quantity (pcs)</span>
            <span style={{ color: "var(--accent-primary)", fontSize: "0.68rem", fontWeight: 700 }}>BATCH SIZE</span>
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
