import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import ThreeViewer from "./components/ThreeViewer";
import PaperDrawingStudio from "./components/PaperDrawingStudio";
import GeometrySpecs from "./components/GeometrySpecs";
import PricingBreakdown from "./components/PricingBreakdown";
import QuoteModal from "./components/QuoteModal";
import AdminPortal from "./components/AdminPortal";
import QuotesHistory from "./components/QuotesHistory";
import PasscodeGate from "./components/PasscodeGate";
import { loadDrawingPreset, calculatePricing, getCompanyProfile } from "./services/api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("tube-cpq-authenticated") === "true";
  });
  const [activeTab, setActiveTab] = useState("cpq");
  const [adminInitialTab, setAdminInitialTab] = useState("tubes");
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("tube-cpq-theme") || "light";
  });

  useEffect(() => {
    async function loadCompany() {
      try {
        const comp = await getCompanyProfile();
        if (comp) setCompanyProfile(comp);
      } catch (err) {
        console.warn("Could not load company profile:", err);
      }
    }
    loadCompany();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tube-cpq-theme", theme);
  }, [theme]);

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

  // Version 3 Order Specs (Matching Excel Sheets + Material Sourcing & GST)
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
    manual_rate_per_piece: null,
    // Material Sourcing & GST state
    material_mode: "making_cost_only", // "making_cost_only" | "with_material"
    material_rate_per_kg: null,
    gst_type: "intra_state",            // "intra_state" | "inter_state" | "exempt"
    gst_rate_pct: 18.0
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
        clr_mm: currentSpecs.clr_mm,
        material_mode: currentSpecs.material_mode || "making_cost_only",
        material_rate_per_kg: currentSpecs.material_rate_per_kg,
        scrap_allowance_pct: 5.0,
        gst_type: currentSpecs.gst_type || "intra_state",
        gst_rate_pct: currentSpecs.gst_rate_pct || 18.0
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
    let cleanName = name || data.drawing_type || "Technical Drawing";
    cleanName = cleanName
      .replace(/Universal Precision Drawing Brain/gi, "Technical Drawing")
      .replace(/Universal Drawing/gi, "Drawing")
      .replace(/\(\d+\s*Bends?\s*Detected\)/gi, "")
      .trim();
    setDrawingTitle(cleanName);

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
    if (field === "tube_od_mm") {
      const val = parseFloat(value) || 25.4;
      setGeometryData((prev) => ({
        ...prev,
        tube_od_mm: val
      }));
    }
  }

  // Dedicated handler for live pipe diameter changes
  function handleDiameterChange(newDiameter) {
    const val = parseFloat(newDiameter) || 25.4;
    setSpecs((prev) => ({
      ...prev,
      tube_od_mm: val
    }));
    setGeometryData((prev) => ({
      ...prev,
      tube_od_mm: val
    }));
  }

  function handleOpenCompanySettings() {
    setAdminInitialTab("company");
    setActiveTab("admin");
    setIsQuoteModalOpen(false);
  }

  function handleUnlock() {
    setIsAuthenticated(true);
  }

  function handleLock() {
    localStorage.removeItem("tube-cpq-authenticated");
    setIsAuthenticated(false);
  }

  // Upfront 6-Digit Protection Passcode Gate (242628)
  if (!isAuthenticated) {
    return (
      <PasscodeGate
        onUnlock={handleUnlock}
        companyProfile={companyProfile}
        theme={theme}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Navigation Header with Company Branding */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "admin") setAdminInitialTab("tubes");
          setActiveTab(tab);
        }}
        theme={theme}
        onToggleTheme={(newTheme) => setTheme(newTheme)}
        companyProfile={companyProfile}
        onOpenCompanySettings={handleOpenCompanySettings}
        onLock={handleLock}
      />

      {/* Primary Tab: CPQ Studio */}
      {activeTab === "cpq" && (
        <main className="dashboard-layout">
          {/* Left Column: 3D Viewport, Drawing Studio, Geometry Specs */}
          <div className="left-column">
            {/* Interactive Three.js 3D Viewport */}
            <ThreeViewer
              centerline={geometryData.centerline}
              tubeOdMm={specs.tube_od_mm}
              bends={geometryData.bends}
              partName={drawingTitle}
              theme={theme}
            />

            {/* Paper Drawing & Sketch Studio */}
            <PaperDrawingStudio
              onDrawingAnalyzed={handleDrawingLoaded}
              currentDrawingName={drawingTitle}
              tubeOdMm={specs.tube_od_mm}
              onDiameterChange={handleDiameterChange}
            />

            {/* Profile & Order Parameters (Rate Master Sheet 1) */}
            <GeometrySpecs
              specs={specs}
              onChange={handleSpecChange}
              onDiameterChange={handleDiameterChange}
              bends={geometryData.bends}
              rateMasterInfo={pricing?.breakdown}
            />
          </div>

          {/* Right Column: Version 3 Automated Costing & Sales Overrides */}
          <PricingBreakdown
            pricing={pricing}
            quantity={specs.quantity}
            materialMode={specs.material_mode}
            onMaterialModeChange={(val) => handleSpecChange("material_mode", val)}
            materialRatePerKg={specs.material_rate_per_kg}
            onMaterialRateChange={(val) => handleSpecChange("material_rate_per_kg", val)}
            gstType={specs.gst_type}
            onGstTypeChange={(val) => handleSpecChange("gst_type", val)}
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

      {/* Tab: Admin Rate Master & Company Profile */}
      {activeTab === "admin" && (
        <AdminPortal
          initialTab={adminInitialTab}
          onRatesChanged={() => runPricingCalc(specs)}
          onCompanyUpdated={(updated) => setCompanyProfile(updated)}
        />
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
          companyProfile={companyProfile}
          onOpenCompanySettings={handleOpenCompanySettings}
        />
      )}
    </div>
  );
}
