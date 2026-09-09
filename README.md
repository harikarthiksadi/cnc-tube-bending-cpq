# Automated CNC Metal Tube Bending CPQ & 3D Spatial Vision System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/3D_Engine-Three.js-black?style=flat&logo=three.js)](https://threejs.org/)
[![OpenCV](https://img.shields.io/badge/Computer_Vision-OpenCV-5C3EE8?style=flat&logo=opencv)](https://opencv.org/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=flat&logo=docker)](https://www.docker.com/)

An intelligent internal **Configure, Price, Quote (CPQ)** web application designed for CNC metal tube manufacturing sales and engineering teams. It automates cost estimation and quotation generation by extracting geometric data from **3D CAD files (.STEP / .IGES)** or **2D technical paper sketches & engineering blueprints**, with support for **3rd-axis (Z-elevation) multi-plane compound bending**.

---

## 🌟 Key Features

### 1. Universal Drawing & Blueprint Vision Brain
- **Paper Photo & Sketch Recognition**: Upload photos or scans of hand-drawn paper sketches or engineering blueprints.
- **Perspective & Skew Rectification**: Detects paper quad contours and warps perspective to flatten angled photos automatically.
- **Multi-Angle OCR & Dimension Extraction**: Extracts Outer Diameter ($\varnothing$ OD), Wall Thickness (WT), Centerline Radii (CLR), Distance Between Bends (DBB), and straight leg lengths.
- **CNC Clamping Feasibility Check**: Validates that straight sections meet or exceed clamp die grip requirements ($2\times \text{OD}$ rule).

### 2. True 3rd-Axis (Z-Axis / Height Dimension) Kinematics
- **Frenet-Serret 3D Kinematics Engine**: Propagates Tangent, Normal, and Binormal vectors across 3D space with longitudinal tube twist/roll angles ($\beta \in [-180^\circ, +180^\circ]$).
- **3D Part Bounding Envelope**: Real-time calculation of part Width ($X$), Length ($Y$), and vertical **Height ($Z$)** in both millimeters and inches.
- **Visual Height Dimension in Three.js**: In-scene vertical dimension bracket and real-time telemetry badge highlighting 3D compound bends.
- **Interactive Per-Bend Plane Controls**: Quick 1-click presets (`Flat 0°`, `Up +Z Rise 90°`, `Down -Z Drop -90°`, `Left 180°`) and precision $\beta$ roll angle slider.

### 3. Industrial CNC YBC Machine Program
- Automatically generates machine-ready coordinates standard across rotary draw CNC benders (Crippa, BLM, Pines):
  - **$Y$ (Feed)**: Carriage straight feed advance in mm.
  - **$B$ (3rd-Axis Roll)**: Longitudinal tube rotation angle in degrees.
  - **$C$ (Bend Angle)**: Bend die rotation angle in degrees.
  - **Tooling CLR**: Centerline radius of the bend die.

### 4. Automated Version 3 Rate Master Costing Engine
- Implements company pricing logic with Indian Rupee (₹ INR) rate cards.
- Matches tube shape (Square, Round, Rectangular), size, thickness, and material (SS, MS, Aluminum).
- Calculates bending labor, cutting charges, batch quantity tiers, setup charges, and generates printable PDF quotations.

---

## 🚀 Quickstart Guide

### Option A: Run with Docker (Recommended)
Clone the repository and launch the unified container:
```bash
git clone git@github.com:harikarthiksadi/cnc-tube-bending-cpq.git
cd cnc-tube-bending-cpq
docker compose up --build
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### Option B: Local Development Setup

#### 1. Backend (Python 3.10+)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Note: Tesseract OCR is recommended for drawing text extraction (`brew install tesseract` on Mac or `sudo apt install tesseract-ocr` on Ubuntu).*

#### 2. Frontend (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Automated Testing
Run the backend test suite:
```bash
cd backend
pytest tests/
```
All tests verify 3D kinematics, Z-height calculation, YBC coordinate generation, universal OCR, and Rate Master pricing.

---

## 📦 Project Structure
```
cnc-tube-bending-cpq/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (sketch, cad, pricing, quotes, admin)
│   │   ├── core/            # Config & SQLite database initialization
│   │   ├── models/          # Quote and Rate Master SQLAlchemy models
│   │   ├── services/        # VisionBrain, SketchAnalyzer (Frenet-Serret), CAD parser, Pricing
│   │   └── sample_files/    # Benchmark blueprints, paper sketches, and STEP CAD files
│   ├── tests/               # Pytest automated test suites
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # ThreeViewer, PaperDrawingStudio, CadUploader, GeometrySpecs, Pricing
│   │   └── services/        # Dynamic API client
│   ├── package.json
│   └── vite.config.js
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # 1-click container configuration
├── export_prototype.sh      # Portable 1.2MB ZIP export script
└── README.md
```

---

## 📄 License
Internal proprietary CPQ software for CNC metal tube manufacturing.