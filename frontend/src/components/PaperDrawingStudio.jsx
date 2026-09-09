import React, { useState, useEffect, useRef } from "react";
import {
  PenTool,
  UploadCloud,
  Plus,
  Trash2,
  Ruler,
  Compass,
  CheckCircle2,
  Camera,
  Loader2,
  Eye,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X
} from "lucide-react";
import { analyzeLineDrawing, uploadDrawingPhoto, loadSampleSketch } from "../services/api";

export default function PaperDrawingStudio({ onDrawingAnalyzed, currentDrawingName }) {
  const [displayUnit, setDisplayUnit] = useState("mm"); // "mm" or "in"
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [drawingMetadata, setDrawingMetadata] = useState(null);
  const [expandedBendIndex, setExpandedBendIndex] = useState(null);
  const [showYbcTable, setShowYbcTable] = true ? useState(false) : useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState("");
  const fileInputRef = useRef(null);

  // Default clean pipe geometry (3 legs, 2 bends)
  const [segments, setSegments] = useState([
    { length_mm: 200.0, label: "Leg 1" },
    { bend_angle_deg: 90.0, direction: "right", plane_rotation_deg: 0.0, clr_mm: 50.8 },
    { length_mm: 200.0, label: "Leg 2" },
    { bend_angle_deg: 90.0, direction: "right", plane_rotation_deg: 0.0, clr_mm: 50.8 },
    { length_mm: 200.0, label: "Leg 3" }
  ]);

  async function processDrawingFile(file) {
    if (!file) return;
    setIsAnalyzing(true);
    setLoadedFileName(file.name);
    try {
      const data = await uploadDrawingPhoto(file);
      if (data.unit) {
        setDisplayUnit(data.unit);
      }
      applyBrainDetection(data, file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      alert("Drawing analysis failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSampleSelect(sampleId, sampleTitle) {
    setIsAnalyzing(true);
    setLoadedFileName(sampleTitle);
    try {
      const data = await loadSampleSketch(sampleId);
      if (data.unit) {
        setDisplayUnit(data.unit);
      }
      applyBrainDetection(data, sampleTitle);
    } catch (err) {
      alert("Failed to load sample sketch: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      processDrawingFile(file);
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processDrawingFile(file);
    }
  };

  function applyBrainDetection(data, title) {
    setDrawingMetadata(data);
    if (data.annotated_image) {
      setAnnotatedImage(data.annotated_image);
      setShowOverlay(false);
    }

    if (data.legs && data.legs.length > 0) {
      const newSegments = [];
      data.legs.forEach((leg, idx) => {
        newSegments.push({
          length_mm: leg.length_mm,
          label: leg.label || `Leg ${idx + 1}`,
          source: leg.source || "Detected",
          grip_callout: leg.grip_callout
        });
        if (data.bends && data.bends[idx]) {
          const b = data.bends[idx];
          const dir = b.direction?.toLowerCase() || "right";
          let planeRot = b.plane_rotation_deg !== undefined ? b.plane_rotation_deg : 0.0;
          if (dir === "left" && Math.abs(planeRot) < 1e-3) {
            planeRot = 180.0;
          } else if (dir === "up" && Math.abs(planeRot) < 1e-3) {
            planeRot = 90.0;
          } else if (dir === "down" && Math.abs(planeRot) < 1e-3) {
            planeRot = -90.0;
          }
          newSegments.push({
            bend_angle_deg: b.angle_deg,
            direction: dir,
            plane_rotation_deg: planeRot,
            plane_label: b.plane_label,
            clr_mm: b.clr_mm || 50.8,
            d_factor: b.d_factor
          });
        }
      });
      setSegments(newSegments);
    }

    onDrawingAnalyzed(data, title);
  }

  async function reanalyzeManualSegments(newSegments) {
    setSegments(newSegments);
    try {
      const firstClr = newSegments.find((s) => s.clr_mm !== undefined)?.clr_mm || 50.8;
      const data = await analyzeLineDrawing(newSegments, firstClr);
      if (annotatedImage) {
        data.annotated_image = annotatedImage;
      }
      if (drawingMetadata) {
        data.drawing_type = drawingMetadata.drawing_type;
        data.tube_od_mm = drawingMetadata.tube_od_mm;
        data.wall_thickness_mm = drawingMetadata.wall_thickness_mm;
        data.clamping_feasibility = drawingMetadata.clamping_feasibility;
      }
      setDrawingMetadata((prev) => ({
        ...prev,
        ...data,
        bbox_3d: data.bbox_3d,
        ybc_table: data.ybc_table,
        height_mm: data.height_mm,
        height_in: data.height_in,
        has_3d_bends: data.has_3d_bends
      }));
      onDrawingAnalyzed(data, currentDrawingName || "Custom Drawing");
    } catch (err) {
      console.error("Manual reanalysis error:", err);
    }
  }

  function handleLegChange(index, value) {
    const updated = [...segments];
    const rawVal = parseFloat(value) || 0;
    const mmVal = displayUnit === "in" ? rawVal * 25.4 : rawVal;
    updated[index].length_mm = Math.max(10, mmVal);
    reanalyzeManualSegments(updated);
  }

  function handleBendChange(index, field, value) {
    const updated = [...segments];
    if (field === "bend_angle_deg") {
      updated[index].bend_angle_deg = Math.max(1, Math.min(259, parseFloat(value) || 0));
    } else if (field === "clr_mm") {
      const rawVal = parseFloat(value) || 50.8;
      updated[index].clr_mm = displayUnit === "in" ? rawVal * 25.4 : rawVal;
    } else if (field === "plane_rotation_deg") {
      const rot = parseFloat(value) || 0.0;
      updated[index].plane_rotation_deg = rot;
      if (Math.abs(rot - 90) < 1) {
        updated[index].direction = "up";
        updated[index].plane_label = "Up (+Z)";
      } else if (Math.abs(rot - (-90)) < 1 || Math.abs(rot - 270) < 1) {
        updated[index].direction = "down";
        updated[index].plane_label = "Down (-Z)";
      } else if (Math.abs(rot - 180) < 1) {
        updated[index].direction = "left";
        updated[index].plane_label = "Left (Flat)";
      } else {
        updated[index].direction = "right";
        updated[index].plane_label = "Right (Flat)";
      }
    } else if (field === "direction") {
      updated[index].direction = value;
      if (value === "up") {
        updated[index].plane_rotation_deg = 90.0;
        updated[index].plane_label = "Up (+Z)";
      } else if (value === "down") {
        updated[index].plane_rotation_deg = -90.0;
        updated[index].plane_label = "Down (-Z)";
      } else if (value === "left") {
        updated[index].plane_rotation_deg = 180.0;
        updated[index].plane_label = "Left (Flat)";
      } else {
        updated[index].plane_rotation_deg = 0.0;
        updated[index].plane_label = "Right (Flat)";
      }
    } else {
      updated[index][field] = value;
    }
    reanalyzeManualSegments(updated);
  }

  function addSegmentAndBend() {
    const nextLegNum = segments.filter((s) => s.length_mm !== undefined).length + 1;
    const updated = [
      ...segments,
      { bend_angle_deg: 90.0, direction: "right", plane_rotation_deg: 0.0, clr_mm: 50.8 },
      { length_mm: 200.0, label: `Leg ${nextLegNum}` }
    ];
    reanalyzeManualSegments(updated);
  }

  function removeBendAndLeg(bendIndex) {
    if (segments.length <= 3) {
      alert("A bent tube requires at least 2 legs and 1 bend.");
      return;
    }
    const updated = segments.filter((_, idx) => idx !== bendIndex && idx !== bendIndex + 1);
    reanalyzeManualSegments(updated);
  }

  const legItems = segments.filter((s) => s.length_mm !== undefined);
  const bendItems = segments.filter((s) => s.bend_angle_deg !== undefined);

  // Unit conversion helpers
  const formatLength = (lenMm) => {
    if (lenMm === undefined || lenMm === null) return "--";
    if (displayUnit === "in") {
      return (lenMm / 25.4).toFixed(2);
    }
    return Math.round(lenMm);
  };

  const unitLabel = displayUnit === "in" ? "in" : "mm";

  return (
    <div className="card">
      {/* Header & Unit Switcher */}
      <div className="card-header">
        <div className="card-title">
          <PenTool size={16} style={{ color: "var(--accent-primary)" }} />
          <span>Drawing Analysis</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Unit Toggle Switcher */}
          <div style={{ display: "flex", background: "var(--bg-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: 2 }}>
            <button
              type="button"
              className={`tool-btn ${displayUnit === "mm" ? "active" : ""}`}
              onClick={() => setDisplayUnit("mm")}
              style={{ padding: "3px 8px", fontSize: "0.72rem", height: 26 }}
            >
              mm
            </button>
            <button
              type="button"
              className={`tool-btn ${displayUnit === "in" ? "active" : ""}`}
              onClick={() => setDisplayUnit("in")}
              style={{ padding: "3px 8px", fontSize: "0.72rem", height: 26 }}
            >
              inches
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            title="Upload photo or scan of technical drawing or paper sketch"
          >
            <UploadCloud size={14} />
            <span>Upload Drawing</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone (Shown when no drawing is loaded) */}
      {!annotatedImage && !drawingMetadata && (
        <div
          className={`drawing-dropzone ${isDragging ? "drag-active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drawing-dropzone-icon">
            <UploadCloud size={20} />
          </div>
          <div className="drawing-dropzone-title">
            Drop technical drawing or paper sketch here, or <span style={{ color: "var(--accent-primary)", textDecoration: "underline" }}>browse</span>
          </div>
          <div className="drawing-dropzone-desc">
            PNG, JPG, or PDF scan • Automatically detects legs, bend angles, and dimensions
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 6,
              flexWrap: "wrap"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginRight: 2 }}>
              Sample sketches:
            </span>
            <button
              type="button"
              className="tool-btn"
              style={{ fontSize: "0.7rem", padding: "2px 8px", height: 24 }}
              onClick={() => handleSampleSelect("turbine_bracket", "Turbine Bracket")}
            >
              Turbine Bracket
            </button>
            <button
              type="button"
              className="tool-btn"
              style={{ fontSize: "0.7rem", padding: "2px 8px", height: 24 }}
              onClick={() => handleSampleSelect("clean_s_pipe", "S-Pipe")}
            >
              S-Pipe
            </button>
            <button
              type="button"
              className="tool-btn"
              style={{ fontSize: "0.7rem", padding: "2px 8px", height: 24 }}
              onClick={() => handleSampleSelect("zigzag", "Zig-Zag Pipe")}
            >
              Zig-Zag
            </button>
            <button
              type="button"
              className="tool-btn"
              style={{ fontSize: "0.7rem", padding: "2px 8px", height: 24 }}
              onClick={() => handleSampleSelect("u_pipe", "U-Bend")}
            >
              U-Bend
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Drawing Compact Bar (When drawing is loaded) */}
      {(annotatedImage || drawingMetadata) && (
        <div className="drawing-preview-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {annotatedImage ? (
              <img
                src={annotatedImage}
                alt="Thumbnail"
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "cover",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)"
                }}
              />
            ) : (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-main)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <PenTool size={18} style={{ color: "var(--accent-primary)" }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                {loadedFileName || currentDrawingName || "Technical Drawing"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  Ø{drawingMetadata?.tube_od_mm || 25.4}mm
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>•</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {bendItems.length} {bendItems.length === 1 ? "Bend" : "Bends"}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>•</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {legItems.length} Straight Legs
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {annotatedImage && (
              <button
                type="button"
                className={`tool-btn ${showOverlay ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: "0.75rem", height: 28 }}
                onClick={() => setShowOverlay(!showOverlay)}
                title="Toggle visual detection overlay"
              >
                <Eye size={13} />
                <span>{showOverlay ? "Hide Overlay" : "View Overlay"}</span>
              </button>
            )}
            <button
              type="button"
              className="tool-btn"
              style={{ padding: "4px 10px", fontSize: "0.75rem", height: 28 }}
              onClick={() => fileInputRef.current?.click()}
              title="Upload a different drawing"
            >
              <RefreshCw size={13} />
              <span>Replace</span>
            </button>
            <button
              type="button"
              className="tool-btn"
              style={{ padding: "4px 8px", height: 28, color: "var(--text-muted)" }}
              onClick={() => {
                setAnnotatedImage(null);
                setDrawingMetadata(null);
                setLoadedFileName("");
                setShowOverlay(false);
              }}
              title="Clear uploaded drawing"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isAnalyzing && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 14,
          background: "var(--accent-primary-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--accent-primary)",
          marginBottom: 14
        }}>
          <Loader2 size={18} style={{ color: "var(--accent-primary)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-main)" }}>
            Analyzing drawing geometry, bends, and dimensions...
          </span>
        </div>
      )}

      {/* Visual Diagnostic Inspection: Annotated Sketch (Toggleable) */}
      {showOverlay && annotatedImage && (
        <div style={{
          marginBottom: 14,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          overflow: "hidden"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={14} style={{ color: "var(--accent-primary)" }} />
              <span>Detected Geometry & Dimensions</span>
            </div>
            <button
              type="button"
              className="tool-btn"
              style={{ padding: "2px 6px", height: 22 }}
              onClick={() => setShowOverlay(false)}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ textAlign: "center", maxHeight: 320, overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <img
              src={annotatedImage}
              alt="Detected Overlay"
              style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      )}

      {/* Engineering Specs Overview Grid */}
      {drawingMetadata && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {/* Card 1: Tube Cross-Section */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
              Cross-Section
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
              <span style={{ color: "var(--text-secondary)" }}>Outer Diameter (OD):</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>
                Ø{formatLength(drawingMetadata.tube_od_mm)} {unitLabel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
              <span style={{ color: "var(--text-secondary)" }}>Wall Thickness:</span>
              <span style={{ fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                {displayUnit === "in" ? `${(drawingMetadata.wall_thickness_mm / 25.4).toFixed(3)}"` : `${drawingMetadata.wall_thickness_mm} mm`}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Inner Diameter:</span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {formatLength(drawingMetadata.tube_od_mm - (2 * drawingMetadata.wall_thickness_mm))} {unitLabel}
              </span>
            </div>
          </div>

          {/* Card 2: CNC Tooling & Clamping Feasibility */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
              Tooling & Clamp Clearance
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {drawingMetadata.clamping_feasibility?.status === "PASS" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-emerald)", fontSize: "0.82rem", fontWeight: 600 }}>
                  <ShieldCheck size={15} />
                  <span>Clamp Grip Verified</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-amber)", fontSize: "0.82rem", fontWeight: 600 }}>
                  <AlertTriangle size={15} />
                  <span>Check Clamp Clearance</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
              {drawingMetadata.clamping_feasibility?.details || "Straight leg lengths accommodate standard rotary draw bender clamp dies."}
            </div>
          </div>
        </div>
      )}

      {/* YBC Bending Program (Collapsible) */}
      {drawingMetadata?.ybc_table && drawingMetadata.ybc_table.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12, marginBottom: 14 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowYbcTable(!showYbcTable)}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={14} style={{ color: "var(--accent-primary)" }} />
              <span>YBC Bending Program</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {showYbcTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {showYbcTable && (
            <div style={{ marginTop: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "6px 8px" }}>Bend</th>
                    <th style={{ padding: "6px 8px" }}>Y (Feed)</th>
                    <th style={{ padding: "6px 8px", color: "var(--accent-primary)" }}>B (Plane Roll)</th>
                    <th style={{ padding: "6px 8px", color: "var(--accent-emerald)" }}>C (Angle)</th>
                    <th style={{ padding: "6px 8px" }}>Tooling CLR</th>
                  </tr>
                </thead>
                <tbody>
                  {drawingMetadata.ybc_table.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>#{row.bend_number}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {displayUnit === "in" ? `${(row.y_feed_mm / 25.4).toFixed(2)}"` : `${row.y_feed_mm} mm`}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 600, color: Math.abs(row.b_rotation_deg) > 1 ? "var(--accent-primary)" : "var(--text-muted)" }}>
                        {row.b_rotation_deg}°{" "}
                        {Math.abs(row.b_rotation_deg - 90) < 1
                          ? "(Up +Z)"
                          : Math.abs(row.b_rotation_deg - (-90)) < 1 || Math.abs(row.b_rotation_deg - 270) < 1
                          ? "(Down -Z)"
                          : row.b_rotation_deg === 0
                          ? "(Flat Right)"
                          : row.b_rotation_deg === 180
                          ? "(Flat Left)"
                          : "(Spatial)"}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 600, color: "var(--accent-emerald)" }}>
                        {row.c_angle_deg}°
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {displayUnit === "in" ? `${(row.clr_mm / 25.4).toFixed(2)}"` : `${row.clr_mm} mm`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sequential Straight Legs & Bends Sequence */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Legs & Bends Sequence</span>
          <span style={{ color: "var(--accent-primary)", fontSize: "0.72rem", fontWeight: 500 }}>Editable</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {segments.map((item, idx) => {
            if (item.length_mm !== undefined) {
              const legNum = Math.floor(idx / 2) + 1;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-surface)",
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Ruler size={13} style={{ color: "var(--accent-primary)" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                      {item.label || `Leg ${legNum}`}:
                    </span>
                    {item.grip_callout && (
                      <span style={{ fontSize: "0.68rem", background: "var(--accent-primary-subtle)", color: "var(--accent-primary)", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                        {item.grip_callout}
                      </span>
                    )}
                    {item.source && (
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        ({item.source})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      step={displayUnit === "in" ? "0.25" : "10"}
                      min="1"
                      className="form-input"
                      style={{ width: 90, textAlign: "right", padding: "5px 8px" }}
                      value={formatLength(item.length_mm)}
                      onChange={(e) => handleLegChange(idx, e.target.value)}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{unitLabel}</span>
                  </div>
                </div>
              );
            } else {
              const bendNum = Math.floor(idx / 2) + 1;
              const rot = item.plane_rotation_deg || 0;
              const dir = (item.direction || "").toLowerCase();
              const isLeft = dir === "left" || Math.abs(rot - 180) < 1;
              const isUp = dir === "up" || Math.abs(rot - 90) < 1;
              const isDown = dir === "down" || Math.abs(rot - (-90)) < 1 || Math.abs(rot - 270) < 1;
              const isRight = !isLeft && !isUp && !isDown;
              const is3DBend = isUp || isDown || (Math.abs(rot) > 1 && Math.abs(rot - 180) > 1 && Math.abs(rot - 360) > 1);
              const isExpanded = expandedBendIndex === idx;

              return (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-card-hover)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Compass size={13} style={{ color: "var(--accent-primary)" }} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>
                        Bend #{bendNum}:
                      </span>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: 3,
                        background: isUp ? "var(--accent-primary-subtle)" : isDown ? "var(--accent-amber-subtle)" : "var(--accent-emerald-subtle)",
                        color: isUp ? "var(--accent-primary)" : isDown ? "var(--accent-amber)" : "var(--accent-emerald)"
                      }}>
                        {isUp ? "Up (+Z)" : isDown ? "Down (-Z)" : isLeft ? "Left (Flat)" : "Right (Flat)"}
                      </span>
                      {item.d_factor && (
                        <span style={{ fontSize: "0.68rem", background: "var(--accent-emerald-subtle)", color: "var(--accent-emerald)", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                          {item.d_factor}
                        </span>
                      )}
                      {item.clr_mm && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                          CLR: {formatLength(item.clr_mm)}{unitLabel}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Bend Angle Input & Preset (1° to 259°) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          max="259"
                          step="0.5"
                          style={{ width: 64, padding: "3px 5px", fontSize: "0.8rem", textAlign: "right" }}
                          value={item.bend_angle_deg ?? 90}
                          onChange={(e) => handleBendChange(idx, "bend_angle_deg", e.target.value)}
                          title="Bend Angle in Degrees (1° - 259°)"
                        />
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>°</span>
                        <select
                          className="form-select"
                          style={{ width: 58, padding: "3px 4px", fontSize: "0.75rem" }}
                          value={[30, 45, 60, 90, 120, 135, 180, 225].includes(Math.round(item.bend_angle_deg)) ? Math.round(item.bend_angle_deg) : "custom"}
                          onChange={(e) => {
                            if (e.target.value !== "custom") {
                              handleBendChange(idx, "bend_angle_deg", e.target.value);
                            }
                          }}
                          title="Quick Angle Preset"
                        >
                          <option value="custom" disabled hidden>Preset</option>
                          <option value="30">30°</option>
                          <option value="45">45°</option>
                          <option value="60">60°</option>
                          <option value="90">90°</option>
                          <option value="120">120°</option>
                          <option value="135">135°</option>
                          <option value="180">180°</option>
                          <option value="225">225°</option>
                        </select>
                      </div>

                      {/* 3rd-Axis Direction Presets */}
                      <div style={{ display: "flex", background: "var(--bg-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: 2 }}>
                        <button
                          type="button"
                          className={`tool-btn ${isRight ? "active" : ""}`}
                          style={{ padding: "2px 7px", fontSize: "0.7rem", height: 24, fontWeight: isRight ? 600 : 400 }}
                          onClick={() => handleBendChange(idx, "direction", "right")}
                          title="Flat Right (0° in-plane)"
                        >
                          Right
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${isLeft ? "active" : ""}`}
                          style={{ padding: "2px 7px", fontSize: "0.7rem", height: 24, fontWeight: isLeft ? 600 : 400 }}
                          onClick={() => handleBendChange(idx, "direction", "left")}
                          title="Flat Left (180° in-plane)"
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${isUp ? "active" : ""}`}
                          style={{ padding: "2px 7px", fontSize: "0.7rem", height: 24, fontWeight: isUp ? 600 : 400 }}
                          onClick={() => handleBendChange(idx, "direction", "up")}
                          title="Rise into +Z Height (+90° roll)"
                        >
                          Up +Z
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${isDown ? "active" : ""}`}
                          style={{ padding: "2px 7px", fontSize: "0.7rem", height: 24, fontWeight: isDown ? 600 : 400 }}
                          onClick={() => handleBendChange(idx, "direction", "down")}
                          title="Drop into -Z Depth (-90° roll)"
                        >
                          Down -Z
                        </button>
                      </div>

                      {/* Custom Roll Slider Toggle */}
                      <button
                        type="button"
                        className={`tool-btn ${isExpanded ? "active" : ""}`}
                        style={{ padding: "3px 6px", height: 26 }}
                        onClick={() => setExpandedBendIndex(isExpanded ? null : idx)}
                        title="Fine-tune 3rd axis roll angle (β 0-360°)"
                      >
                        <SlidersHorizontal size={13} />
                      </button>

                      {bendItems.length > 1 && (
                        <button
                          type="button"
                          className="tool-btn"
                          style={{ color: "var(--accent-rose)", padding: 4 }}
                          onClick={() => removeBendAndLeg(idx)}
                          title="Delete this bend & leg"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Precision 3D Roll Slider */}
                  {isExpanded && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500, width: 140 }}>
                        3rd-Axis Twist Roll (β):
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={item.plane_rotation_deg || 0}
                        onChange={(e) => handleBendChange(idx, "plane_rotation_deg", e.target.value)}
                        style={{ flex: 1, accentColor: "var(--accent-primary)" }}
                      />
                      <div style={{ width: 65, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                        {item.plane_rotation_deg || 0}°
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>

        {/* Add Leg & Bend Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={addSegmentAndBend}
          style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
        >
          <Plus size={13} />
          <span>Add Another Bend & Leg</span>
        </button>
      </div>
    </div>
  );
}
