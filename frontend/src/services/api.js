const API_BASE =
  typeof window !== "undefined" && window.location.port === "5173"
    ? `http://${window.location.hostname}:8000/api`
    : "/api";

export async function uploadCadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/cad/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to parse CAD file");
  }
  return res.json();
}

export async function getSampleParts() {
  const res = await fetch(`${API_BASE}/cad/samples`);
  if (!res.ok) throw new Error("Failed to load sample parts");
  return res.json();
}

export async function loadSampleGeometry(sampleId) {
  const res = await fetch(`${API_BASE}/cad/sample/${sampleId}`);
  if (!res.ok) throw new Error("Failed to load sample CAD geometry");
  return res.json();
}

// 2D Line Drawing & Sketch API
export async function analyzeLineDrawing(segments, clrMm = 50.8, tubeOdMm = 25.4) {
  const res = await fetch(`${API_BASE}/sketch/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      segments,
      clr_mm: clrMm,
      tube_od_mm: tubeOdMm
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Drawing analysis failed");
  }
  return res.json();
}

export async function uploadDrawingPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/sketch/upload-drawing`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to analyze sketch photo");
  }
  return res.json();
}

export async function getDrawingPresets() {
  const res = await fetch(`${API_BASE}/sketch/presets`);
  if (!res.ok) throw new Error("Failed to load sketch presets");
  return res.json();
}

export async function loadSampleSketch(sketchId) {
  const res = await fetch(`${API_BASE}/sketch/sample-sketch/${sketchId}`);
  if (!res.ok) throw new Error("Failed to analyze sample sketch");
  return res.json();
}

export const loadDrawingPreset = loadSampleSketch;

// Pricing & Quotes
export async function calculatePricing(payload) {
  const res = await fetch(`${API_BASE}/pricing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Pricing calculation failed");
  }
  return res.json();
}

export async function createQuote(payload) {
  const res = await fetch(`${API_BASE}/quotes/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create quote");
  }
  return res.json();
}

export async function getQuotes() {
  const res = await fetch(`${API_BASE}/quotes`);
  if (!res.ok) throw new Error("Failed to fetch quotes list");
  return res.json();
}

export function getQuotePdfUrl(quoteId) {
  return `${API_BASE}/quotes/${quoteId}/pdf`;
}

export async function deleteQuote(quoteId) {
  const res = await fetch(`${API_BASE}/quotes/${quoteId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete quote");
  return res.json();
}

export async function bulkDeleteQuotes(ids) {
  const res = await fetch(`${API_BASE}/quotes/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to bulk delete quotes");
  return res.json();
}

// Admin Rate Master
export async function getTubeRates() {
  const res = await fetch(`${API_BASE}/admin/tube-rates`);
  if (!res.ok) throw new Error("Failed to fetch tube rates");
  return res.json();
}

export async function updateTubeRate(id, payload) {
  const res = await fetch(`${API_BASE}/admin/tube-rate/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update tube rate");
  return res.json();
}

export async function getAllRates() {
  const res = await fetch(`${API_BASE}/admin/all-rates`);
  if (!res.ok) throw new Error("Failed to fetch rate master data");
  return res.json();
}

export async function updateSetupCharge(id, payload) {
  const res = await fetch(`${API_BASE}/admin/setup-charge/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update setup charge");
  return res.json();
}

export async function addToolingDie(payload) {
  const res = await fetch(`${API_BASE}/admin/tooling-die`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add tooling die");
  return res.json();
}

export async function deleteToolingDie(id) {
  const res = await fetch(`${API_BASE}/admin/tooling-die/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete tooling die");
  return res.json();
}

// Company Profile & Branding
export async function getCompanyProfile() {
  const res = await fetch(`${API_BASE}/admin/company`);
  if (!res.ok) throw new Error("Failed to fetch company profile");
  return res.json();
}

export async function updateCompanyProfile(payload) {
  const res = await fetch(`${API_BASE}/admin/company`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update company profile");
  }
  return res.json();
}

