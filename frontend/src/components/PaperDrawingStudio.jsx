import React, { useState, useEffect, useRef } from "react";
import {
  PenTool,
  UploadCloud,
  Sparkles,
  Plus,
  Trash2,
  Ruler,
  Compass,
  CheckCircle2,
  Camera,
  Cpu,
  Loader2,
  Eye,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Box,
  MoveVertical,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { analyzeLineDrawing, uploadDrawingPhoto, loadSampleSketch } from "../services/api";

export default function PaperDrawingStudio({ onDrawingAnalyzed, currentDrawingName }) {
  const [activeSample, setActiveSample] = useState("engineering_drawing");
  const [displayUnit, setDisplayUnit] = useState("mm"); // "mm" or "in"
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [drawingMetadata, setDrawingMetadata] = useState(null);
  const [expandedBendIndex, setExpandedBendIndex] = useState(null);
  const [showYbcTable, setShowYbcTable] = useState(true);
  const fileInputRef = useRef(null);

  // Editable segments
  const [segments, setSegments] = useState([
    { length_mm: 57.15, label: "Leg 1 (DBB)" },
    { bend_angle_deg: 90.0, direction: "right", plane_rotation_deg: 0.0, clr_mm: 57.15 },
    { length_mm: 76.20, label: "Leg 2 (DBB)" },
    { bend_angle_deg: 90.0, direction: "right", plane_rotation_deg: 0.0, clr_mm: 19.05 },
    { length_mm: 38.10, label: "Leg 3 (Straight)" }
  ]);

  const benchmarkDrawings = [
    {
      id: "engineering_drawing",
      label: "Engineering Blueprint (Image 1)",
      desc: "Ø.75\" OD, .065\" WT, 2 Bends (CLR 2.25\" & .75\"), DBB Callouts",
      type: "blueprint"
    },
    {
      id: "handwritten_paper",
      label: "Paper Sketch with Measurements (Image 2)",
      desc: "ØD 25mm, 5 Legs (500, 350, 300, 150, 100mm), 4x 90° Bends",
      type: "paper_sketch"
    },
    {
      id: "3d_riser",
      label: "3D Compound Riser (+Z Height)",
      desc: "2x 90° Bends with 90° Z-Axis Elevation Rise (200mm Height)",
      type: "3d_sketch"
    },
    {
      id: "u_pipe",
      label: "Hand-Drawn U-Pipe",
      desc: "2x 90° Bends, 400mm Span",
      type: "paper_sketch"
    },
    {
      id: "l_pipe",
      label: "Hand-Drawn 90° Elbow",
      desc: "1x 90° Bend, 2x 250mm Legs",
      type: "paper_sketch"
    },
    {
      id: "s_pipe",
      label: "Hand-Drawn S-Offset",
      desc: "2x 45° Reverse Bends",
      type: "paper_sketch"
    }
  ];

  // Load Image 1 by default on mount
  useEffect(() => {
    handleLoadSample("engineering_drawing");
  }, []);

  async function handleLoadSample(sampleId) {
    setActiveSample(sampleId);
    setIsAnalyzing(true);
    try {
      const data = await loadSampleSketch(sampleId);
      if (data.unit) {
        setDisplayUnit(data.unit);
      }
      applyBrainDetection(data, data.drawing_type || `Drawing (${data.file_name})`);
    } catch (err) {
      console.error("Error analyzing sample drawing:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setActiveSample(null);
    try {
      const data = await uploadDrawingPhoto(file);
      if (data.unit) {
        setDisplayUnit(data.unit);
      }
      applyBrainDetection(data, data.drawing_type || `Drawing (${file.name})`);
    } catch (err) {
      alert("Vision Brain analysis failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function applyBrainDetection(data, title) {
    setDrawingMetadata(data);
    if (data.annotated_image) {
      setAnnotatedImage(data.annotated_image);
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
          newSegments.push({
            bend_angle_deg: b.angle_deg,
            direction: b.direction?.toLowerCase() || "right",
            plane_rotation_deg: b.plane_rotation_deg !== undefined ? b.plane_rotation_deg : (b.direction?.toLowerCase() === "up" ? 90.0 : b.direction?.toLowerCase() === "down" ? -90.0 : b.direction?.toLowerCase() === "left" ? 180.0 : 0.0),
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
      updated[index].bend_angle_deg = Math.max(1, Math.min(180, parseFloat(value) || 0));
    } else if (field === "clr_mm") {
      const rawVal = parseFloat(value) || 50.8;
      updated[index].clr_mm = displayUnit === "in" ? rawVal * 25.4 : rawVal;
    } else if (field === "plane_rotation_deg") {
      const rot = parseFloat(value) || 0.0;
      updated[index].plane_rotation_deg = rot;
      if (Math.abs(rot - 90) < 1) updated[index].direction = "up";
      else if (Math.abs(rot - (-90)) < 1 || Math.abs(rot - 270) < 1) updated[index].direction = "down";
      else if (Math.abs(rot - 180) < 1) updated[index].direction = "left";
      else updated[index].direction = "right";
    } else if (field === "direction") {
      updated[index].direction = value;
      if (value === "up") updated[index].plane_rotation_deg = 90.0;
      else if (value === "down") updated[index].plane_rotation_deg = -90.0;
      else if (value === "left") updated[index].plane_rotation_deg = 180.0;
      else updated[index].plane_rotation_deg = 0.0;
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
  const is3DActive = drawingMetadata?.bbox_3d?.height_mm > 5 || drawingMetadata?.has_3d_bends;

  return (
    <div className="card">
      {/* Header & Unit Switcher */}
      <div className="card-header">
        <div className="card-title">
          <Cpu size={18} style={{ color: "var(--accent-cyan)" }} />
          <span>Universal Drawing & 3D Spatial Brain Studio</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Unit Toggle Switcher */}
          <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: 2 }}>
            <button
              className={`tool-btn ${displayUnit === "mm" ? "active" : ""}`}
              onClick={() => setDisplayUnit("mm")}
              style={{ padding: "3px 8px", fontSize: "0.72rem", height: 26 }}
            >
              mm
            </button>
            <button
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
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            title="Upload photo or scan of technical drawing or paper sketch"
          >
            <Camera size={13} />
            <span>Upload Drawing Photo</span>
          </button>
        </div>
      </div>

      {/* Drawing Classification Banner */}
      {drawingMetadata && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: drawingMetadata.drawing_type?.includes("Blueprint")
            ? "rgba(59, 130, 246, 0.12)"
            : is3DActive
            ? "rgba(6, 182, 212, 0.12)"
            : "rgba(16, 185, 129, 0.12)",
          border: `1px solid ${
            drawingMetadata.drawing_type?.includes("Blueprint")
              ? "var(--accent-primary)"
              : is3DActive
              ? "var(--accent-cyan)"
              : "var(--accent-emerald)"
          }`,
          borderRadius: "var(--radius-md)",
          padding: "8px 12px",
          marginBottom: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={15} style={{ color: is3DActive ? "var(--accent-cyan)" : "var(--accent-emerald)" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
              {drawingMetadata.drawing_type}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            &Oslash;{drawingMetadata.tube_od_mm}mm ({drawingMetadata.tube_od_in}") &bull; {drawingMetadata.bends_count} Bends
          </div>
        </div>
      )}


      {/* Loading Indicator */}
      {isAnalyzing && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, background: "rgba(59, 130, 246, 0.1)", borderRadius: "var(--radius-md)", border: "1px dashed var(--accent-primary)", marginBottom: 14 }}>
          <Loader2 size={20} style={{ color: "var(--accent-primary)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
            AI Vision Brain analyzing drawing strokes, OCR callouts, 3rd-axis elevation & clamp feasibility...
          </span>
        </div>
      )}

      {/* Visual Diagnostic Inspection: Annotated Sketch from the Brain */}
      {annotatedImage && (
        <div style={{ marginBottom: 14, background: "#050811", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-md)", padding: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={13} />
              <span>Vision Brain Detection Overlay (Centerline & Callouts Tagged)</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
              &check; {bendItems.length} Bends &bull; {legItems.length} Straight Sections Detected
            </div>
          </div>
          <div style={{ textAlign: "center", maxHeight: 300, overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <img
              src={annotatedImage}
              alt="Vision Brain Annotated Overlay"
              style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      )}

      {/* 3D Part Bounding Envelope & Height Dimension (3rd Axis) Card */}
      <div style={{
        background: is3DActive
          ? "linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.08))"
          : "var(--bg-surface)",
        border: is3DActive
          ? "1px solid var(--accent-cyan)"
          : "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: 12,
        marginBottom: 14,
        boxShadow: is3DActive
          ? "0 0 16px rgba(6, 182, 212, 0.15)"
          : "none"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: is3DActive ? "var(--accent-cyan)" : "var(--text-secondary)" }}>
            <Box size={14} />
            <span>3D Part Envelope & Physical Height Dimension (3rd Axis)</span>
          </div>
          {is3DActive ? (
            <span style={{ fontSize: "0.7rem", background: "rgba(6, 182, 212, 0.2)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "var(--radius-sm)", fontWeight: 700 }}>
              &sparkles; True 3D Multi-Plane Elevation Active
            </span>
          ) : (
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.05)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
              Single-Plane Flat 2D Layout
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Width (X)</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              {drawingMetadata?.bbox_3d
                ? (displayUnit === "in" ? `${drawingMetadata.bbox_3d.width_in}"` : `${drawingMetadata.bbox_3d.width_mm} mm`)
                : "--"}
            </div>
          </div>

          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Length (Y)</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              {drawingMetadata?.bbox_3d
                ? (displayUnit === "in" ? `${drawingMetadata.bbox_3d.length_in}"` : `${drawingMetadata.bbox_3d.length_mm} mm`)
                : "--"}
            </div>
          </div>

          <div style={{
            background: is3DActive ? "rgba(6, 182, 212, 0.15)" : "rgba(15, 23, 42, 0.6)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            border: is3DActive ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "0.68rem", color: "var(--accent-cyan)", fontWeight: 700, textTransform: "uppercase" }}>
              &updownarrow; Height (Z Dimension)
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: is3DActive ? "var(--accent-cyan)" : "var(--text-muted)" }}>
              {drawingMetadata?.bbox_3d
                ? (displayUnit === "in" ? `${drawingMetadata.bbox_3d.height_in}"` : `${drawingMetadata.bbox_3d.height_mm} mm`)
                : (displayUnit === "in" ? '0.00"' : '0 mm')}
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Specs Overview Grid */}
      {drawingMetadata && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {/* Card 1: Tube Cross-Section */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
              Tube Cross-Section & Material
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
              <span>Outer Diameter (OD):</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                &Oslash;{formatLength(drawingMetadata.tube_od_mm)} {unitLabel} ({drawingMetadata.tube_od_mm}mm)
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
              <span>Wall Thickness (WT):</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                {displayUnit === "in" ? `${(drawingMetadata.wall_thickness_mm / 25.4).toFixed(3)}"` : `${drawingMetadata.wall_thickness_mm} mm`}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span>Inner Diameter (ID):</span>
              <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {formatLength(drawingMetadata.tube_od_mm - (2 * drawingMetadata.wall_thickness_mm))} {unitLabel}
              </span>
            </div>
          </div>

          {/* Card 2: CNC Tooling & Clamping Feasibility */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
              CNC Clamping & Grip Feasibility
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {drawingMetadata.clamping_feasibility?.status === "PASS" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-emerald)", fontSize: "0.82rem", fontWeight: 700 }}>
                  <ShieldCheck size={14} />
                  <span>OPTIMAL CLAMP GRIP (PASS)</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-amber)", fontSize: "0.82rem", fontWeight: 700 }}>
                  <AlertTriangle size={14} />
                  <span>SHORT STRAIGHT (CHECK TOOLING)</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.3 }}>
              {drawingMetadata.clamping_feasibility?.details || "All straight sections exceed CNC rotary draw bender clamp die grip requirement."}
            </div>
          </div>
        </div>
      )}

      {/* CNC YBC Machine Coordinate Program Table (Expandable Drawer) */}
      {drawingMetadata?.ybc_table && drawingMetadata.ybc_table.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 12, marginBottom: 14 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowYbcTable(!showYbcTable)}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={14} style={{ color: "var(--accent-primary)" }} />
              <span>CNC Bender YBC Machine Program (Rotary Draw Coordinates)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.68rem", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
                B-Axis = 3rd Axis Tube Twist
              </span>
              {showYbcTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {showYbcTable && (
            <div style={{ marginTop: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "6px 8px" }}>Bend</th>
                    <th style={{ padding: "6px 8px" }}>Y (Feed)</th>
                    <th style={{ padding: "6px 8px", color: "var(--accent-cyan)" }}>B (3rd Axis Roll)</th>
                    <th style={{ padding: "6px 8px", color: "var(--accent-emerald)" }}>C (Bend Angle)</th>
                    <th style={{ padding: "6px 8px" }}>Tooling CLR</th>
                  </tr>
                </thead>
                <tbody>
                  {drawingMetadata.ybc_table.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: Math.abs(row.b_rotation_deg) > 1 ? "rgba(6, 182, 212, 0.05)" : "transparent" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>#{row.bend_number}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {displayUnit === "in" ? `${(row.y_feed_mm / 25.4).toFixed(2)}"` : `${row.y_feed_mm} mm`}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 700, color: Math.abs(row.b_rotation_deg) > 1 ? "var(--accent-cyan)" : "var(--text-muted)" }}>
                        {row.b_rotation_deg}&deg;{" "}
                        {Math.abs(row.b_rotation_deg - 90) < 1
                          ? "(Up +Z Rise)"
                          : Math.abs(row.b_rotation_deg - (-90)) < 1 || Math.abs(row.b_rotation_deg - 270) < 1
                          ? "(Down -Z Drop)"
                          : row.b_rotation_deg === 0
                          ? "(Flat Right)"
                          : row.b_rotation_deg === 180
                          ? "(Flat Left)"
                          : "(Spatial)"}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--accent-emerald)" }}>
                        {row.c_angle_deg}&deg;
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

      {/* Sequential Straight Legs & DBB Schedule Table */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Straight Legs & Bends Sequence (With 3rd-Axis Height Controls)</span>
          <span style={{ color: "var(--accent-cyan)" }}>Click to Fine-Tune</span>
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
                      {item.label || `Leg #${legNum}`}:
                    </span>
                    {item.grip_callout && (
                      <span style={{ fontSize: "0.68rem", background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-cyan)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>
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
              const is3DBend = Math.abs(item.plane_rotation_deg || 0) > 1 && Math.abs(item.plane_rotation_deg || 0) !== 180;
              const isExpanded = expandedBendIndex === idx;

              return (
                <div
                  key={idx}
                  style={{
                    background: is3DBend ? "rgba(6, 182, 212, 0.08)" : "rgba(16, 185, 129, 0.05)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px dashed ${is3DBend ? "var(--accent-cyan)" : "var(--accent-emerald)"}`
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Compass size={13} style={{ color: is3DBend ? "var(--accent-cyan)" : "var(--accent-emerald)" }} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: is3DBend ? "var(--accent-cyan)" : "var(--accent-emerald)" }}>
                        Bend #{bendNum}:
                      </span>
                      {item.d_factor && (
                        <span style={{ fontSize: "0.68rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>
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
                      {/* Bend Angle Dropdown */}
                      <select
                        className="form-select"
                        style={{ width: 80, padding: "4px 6px", fontSize: "0.8rem" }}
                        value={Math.round(item.bend_angle_deg)}
                        onChange={(e) => handleBendChange(idx, "bend_angle_deg", e.target.value)}
                        title="Bend Angle (C-Axis)"
                      >
                        <option value="30">30&deg;</option>
                        <option value="45">45&deg;</option>
                        <option value="60">60&deg;</option>
                        <option value="90">90&deg;</option>
                        <option value="120">120&deg;</option>
                        <option value="180">180&deg;</option>
                      </select>

                      {/* 3rd-Axis Direction Presets */}
                      <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: 2 }}>
                        <button
                          type="button"
                          className={`tool-btn ${item.direction === "right" && (!item.plane_rotation_deg || item.plane_rotation_deg === 0) ? "active" : ""}`}
                          style={{ padding: "2px 6px", fontSize: "0.7rem", height: 24 }}
                          onClick={() => handleBendChange(idx, "direction", "right")}
                          title="Flat Right (0° in-plane)"
                        >
                          Flat 0&deg;
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${item.direction === "up" || item.plane_rotation_deg === 90 ? "active" : ""}`}
                          style={{ padding: "2px 6px", fontSize: "0.7rem", height: 24, color: "var(--accent-cyan)" }}
                          onClick={() => handleBendChange(idx, "direction", "up")}
                          title="Rise into +Z Height Dimension (90° twist)"
                        >
                          Up +Z
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${item.direction === "down" || item.plane_rotation_deg === -90 ? "active" : ""}`}
                          style={{ padding: "2px 6px", fontSize: "0.7rem", height: 24, color: "var(--accent-amber)" }}
                          onClick={() => handleBendChange(idx, "direction", "down")}
                          title="Drop into -Z Depth Dimension (-90° twist)"
                        >
                          Down -Z
                        </button>
                        <button
                          type="button"
                          className={`tool-btn ${item.direction === "left" || item.plane_rotation_deg === 180 ? "active" : ""}`}
                          style={{ padding: "2px 6px", fontSize: "0.7rem", height: 24 }}
                          onClick={() => handleBendChange(idx, "direction", "left")}
                          title="Flat Left (180° reverse in-plane)"
                        >
                          Left
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
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600, width: 140 }}>
                        3rd-Axis Twist Roll (&beta;):
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={item.plane_rotation_deg || 0}
                        onChange={(e) => handleBendChange(idx, "plane_rotation_deg", e.target.value)}
                        style={{ flex: 1, accentColor: "var(--accent-cyan)" }}
                      />
                      <div style={{ width: 65, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                        {item.plane_rotation_deg || 0}&deg;
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
          <span>Add Another Bend & Pipe Leg</span>
        </button>
      </div>
    </div>
  );
}
