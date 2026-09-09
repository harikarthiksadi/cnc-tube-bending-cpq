import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import ThreeViewer from "./components/ThreeViewer";
import CadUploader from "./components/CadUploader";
import PaperDrawingStudio from "./components/PaperDrawingStudio";
import GeometrySpecs from "./components/GeometrySpecs";
import PricingBreakdown from "./components/PricingBreakdown";
import QuoteModal from "./components/QuoteModal";
import AdminPortal from "./components/AdminPortal";
import QuotesHistory from "./components/QuotesHistory";
import { loadDrawingPreset, calculatePricing } from "./services/api";
import { PenTool, FileCode2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("cpq");
  const [inputMode, setInputMode] = useState("sketch"); // "sketch" (2D Paper Drawing) or "cad" (3D CAD File)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Active geometry state
  const [geometryData, setGeometryData] = useState({
    centerline: [],
    bends: [],
    tube_od_mm: 25.4,
    wall_thickness_mm: 1.5,
    flattened_length_mm: 900.0,
    bends_count: 2
  });
  const [drawingTitle, setDrawingTitle] = useState("Standard U-Bend Pipe Sketch");

  // Version 3 Order Specs (Matching Image 2 Sheet)
  const [specs, setSpecs] = useState({
    job_number: "121",
    tube_shape: "Square",
    tube_size: "25x25",
    tube_od_mm: 25.4,
    wall_thickness_mm: 1.5,
    material_code: "SS",
    detected_bends: 2,
    flattened_length_mm: 900.0,
    clr_mm: 50.8,
    quantity: 100,
    custom_setting_charge: 500.0,
    manual_rate_per_piece: null
  });

  // Pricing calculation result state
  const [pricing, setPricing] = useState(null);

  // Load initial preset on mount (Standard U-Bend Pipe Sketch)
  useEffect(() => {
    async function initDefault() {
      try {
        const data = await loadDrawingPreset("u_pipe");
        handleDrawingLoaded(data, "Standard U-Bend Pipe Sketch");
      } catch (err) {
        console.error("Initial sketch preset error:", err);
      }
    }
    initDefault();
  }, []);

  // Recalculate pricing on any spec change
  const runPricingCalc = useCallback(async (currentSpecs) => {
    try {
      const result = await calculatePricing({
        job_number: currentSpecs.job_number || "121",
        tube_shape: currentSpecs.tube_shape,
        tube_size: currentSpecs.tube_size,
        tube_od_mm: currentSpecs.tube_od_mm,
        wall_thickness_mm: currentSpecs.wall_thickness_mm,
        flattened_length_mm: currentSpecs.flattened_length_mm,
        detected_bends: currentSpecs.detected_bends,
        quantity: currentSpecs.quantity,
        material_code: currentSpecs.material_code,
        custom_setting_charge: currentSpecs.custom_setting_charge,
        manual_rate_per_piece: currentSpecs.manual_rate_per_piece,
        clr_mm: currentSpecs.clr_mm
      });
      setPricing(result);
    } catch (err) {
      console.error("Pricing error:", err);
    }
  }, []);

  useEffect(() => {
    runPricingCalc(specs);
  }, [specs, runPricingCalc]);

  // Handler for line drawing / sketch update
  function handleDrawingLoaded(data, name) {
    setGeometryData(data);
    setDrawingTitle(name);

    setSpecs((prev) => ({
      ...prev,
      flattened_length_mm: data.flattened_length_mm || 400.0,
      detected_bends: data.bends_count !== undefined ? data.bends_count : (data.bends?.length || 1),
      height_mm: data.bbox_3d?.height_mm || data.height_mm || 0.0,
      height_in: data.bbox_3d?.height_in || data.height_in || 0.0,
      bbox_3d: data.bbox_3d || null,
      has_3d_bends: data.has_3d_bends,
      clr_mm: data.bends && data.bends[0] ? data.bends[0].clr_mm : 50.8,
      tube_od_mm: data.tube_od_mm || prev.tube_od_mm,
      wall_thickness_mm: data.wall_thickness_mm || prev.wall_thickness_mm,
      tube_shape: data.suggested_profile?.shape || prev.tube_shape,
      tube_size: data.suggested_profile?.size || prev.tube_size,
      material_code: data.suggested_profile?.material || prev.material_code,
      manual_rate_per_piece: null
    }));
  }

  // Spec change handler
  function handleSpecChange(field, value) {
    setSpecs((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Primary Tab: CPQ Studio */}
      {activeTab === "cpq" && (
        <main className="dashboard-layout">
          {/* Left Column: 3D Viewport, Drawing/CAD Input, Geometry Specs */}
          <div className="left-column">
            {/* Interactive Three.js 3D Viewport */}
            <ThreeViewer
              centerline={geometryData.centerline}
              tubeOdMm={specs.tube_od_mm}
              bends={geometryData.bends}
              partName={drawingTitle}
            />

            {/* Input Mode Selector Tabs (2D Paper Drawing vs 3D CAD) */}
            <div style={{ display: "flex", gap: 10, background: "var(--bg-surface)", padding: 6, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <button
                className={`nav-tab ${inputMode === "sketch" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.85rem" }}
                onClick={() => setInputMode("sketch")}
              >
                <PenTool size={15} />
                <span>2D Paper Line Drawing / Sketch Input</span>
              </button>

              <button
                className={`nav-tab ${inputMode === "cad" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.85rem" }}
                onClick={() => setInputMode("cad")}
              >
                <FileCode2 size={15} />
                <span>3D CAD File (.STEP / .IGES)</span>
              </button>
            </div>

            {/* Render 2D Paper Drawing Studio OR 3D CAD Uploader based on mode */}
            {inputMode === "sketch" ? (
              <PaperDrawingStudio
                onDrawingAnalyzed={handleDrawingLoaded}
                currentDrawingName={drawingTitle}
              />
            ) : (
              <CadUploader
                onCadLoaded={handleDrawingLoaded}
                currentFileName={drawingTitle}
              />
            )}

            {/* Profile & Order Parameters (Rate Master Sheet 1) */}
            <GeometrySpecs
              specs={specs}
              onChange={handleSpecChange}
              bends={geometryData.bends}
              rateMasterInfo={pricing?.breakdown}
            />
          </div>

          {/* Right Column: Version 3 Automated Costing & Sales Overrides */}
          <PricingBreakdown
            pricing={pricing}
            quantity={specs.quantity}
            customSettingCharge={specs.custom_setting_charge}
            onCustomSettingChargeChange={(val) => handleSpecChange("custom_setting_charge", val)}
            manualRatePerPiece={specs.manual_rate_per_piece}
            onManualRateChange={(val) => handleSpecChange("manual_rate_per_piece", val)}
            onOpenQuoteModal={() => setIsQuoteModalOpen(true)}
          />
        </main>
      )}

      {/* Tab: Quotes Archive */}
      {activeTab === "history" && <QuotesHistory />}

      {/* Tab: Admin Rate Master */}
      {activeTab === "admin" && (
        <AdminPortal onRatesChanged={() => runPricingCalc(specs)} />
      )}

      {/* Modal: Customer CRM & Branded PDF Quote Download */}
      {pricing && (
        <QuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          specs={specs}
          pricing={pricing}
          partName={drawingTitle}
          cadFileName={drawingTitle}
        />
      )}
    </div>
  );
}
