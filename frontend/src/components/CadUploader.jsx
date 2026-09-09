import React, { useState, useRef } from "react";
import { UploadCloud, FileCode2, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { uploadCadFile, loadSampleGeometry } from "../services/api";

export default function CadUploader({ onCadLoaded, currentFileName }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSample, setActiveSample] = useState("single_90");
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const samples = [
    { id: "single_90", label: "90° Exhaust Downpipe", bends: 1, od: 25.4 },
    { id: "s_bend", label: "S-Bend Coolant Bypass", bends: 2, od: 25.4 },
    { id: "exhaust_3bend", label: "3D Compound Header", bends: 3, od: 38.1 },
    { id: "u_bend", label: "180° Return U-Bend", bends: 1, od: 31.75 },
  ];

  async function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const validExts = [".step", ".stp", ".iges", ".igs", ".stl", ".obj"];
    if (!validExts.some((ext) => name.endsWith(ext))) {
      alert("Please upload a 3D .STEP, .IGES, .STL, or .OBJ CAD file.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await uploadCadFile(file);
      onCadLoaded(data, file.name);
      setUploadSuccess(file.name);
      setActiveSample(null);
    } catch (err) {
      alert("CAD Upload Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSampleSelect(sampleId, label) {
    setActiveSample(sampleId);
    setIsLoading(true);
    try {
      const data = await loadSampleGeometry(sampleId);
      onCadLoaded(data, label);
      setUploadSuccess(null);
    } catch (err) {
      alert("Error loading benchmark part: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <FileCode2 size={18} />
          <span>3D CAD Model Input (.STEP / .IGES)</span>
        </div>
        {currentFileName && (
          <span className="status-badge">
            <CheckCircle2 size={12} />
            <span>{currentFileName}</span>
          </span>
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        className={`uploader-box ${isDragging ? "drag-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".step,.stp,.iges,.igs,.stl,.obj"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 10 }}>
            <Loader2 size={28} className="spinner" style={{ color: "var(--accent-primary)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Extracting 3D Centerline & Toroidal Bends...
            </span>
          </div>
        ) : (
          <>
            <UploadCloud size={30} className="uploader-icon" />
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: 2 }}>
              Drag & Drop client .STEP or .IGES file here, or click to browse
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Programmatic extraction of centerline length, bend count, and CLR
            </div>
          </>
        )}
      </div>

      {/* Benchmark Sample Parts Selection */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} style={{ color: "var(--accent-amber)" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Or test instant CNC benchmark geometry:
          </span>
        </div>
        <div className="sample-chips-row">
          {samples.map((s) => (
            <button
              key={s.id}
              className={`sample-chip ${activeSample === s.id ? "active" : ""}`}
              onClick={() => handleSampleSelect(s.id, s.label)}
            >
              <span>{s.label}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                ({s.bends}b &bull; &Oslash;{s.od}mm)
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
