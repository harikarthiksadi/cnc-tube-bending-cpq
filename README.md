# CNC Tube Bending CPQ

A simple web tool to quote and visualize bent metal pipes. You can drop in a hand-drawn paper sketch, an engineering drawing, or a 3D CAD file, and it will figure out the bends, build a 3D model, and calculate the job cost and quote automatically.

---

## What it does

- **Drawings & Paper Sketches**: Drag and drop any drawing, scan, or photo of a sketch. It detects the straight pipe legs, bend counts, angles (handles anything from 1° up to 259°), and written measurements.
- **3D CAD Support**: Upload `.STEP` or `.IGES` files directly if you already have the 3D model.
- **Clean 3D Viewer**: Orbit and inspect the tube in 3D with quick view presets (ISO, Top, Front, Side).
- **Instant Costing & Quotes**: Calculates cutting, bending labor, and setup charges based on tube size, wall thickness, material (SS, MS, Aluminum), and batch quantity.
- **PDF Quotations**: Generate branded quotes with one click.
- **YBC Bending Coordinates**: Generates the machine coordinates (Feed, Roll, Bend Angle) for the bender on the shop floor.
- **Clean, Minimal UI**: Simple Shopify-inspired interface with working light and dark mode.

---

## How to run it

### ⚡ 1-Click Quickstart (Recommended)

Clone the repository:
```bash
git clone https://github.com/harikarthiksadi/cnc-tube-bending-cpq.git
cd cnc-tube-bending-cpq
```

* **Mac / Linux**: Run `./start.sh` (sets up Python environment, starts the server, and opens your browser).
* **Windows**: Double-click or run `start.bat`.

Then access the complete CPQ system at **[http://localhost:8000](http://localhost:8000)**.

---

### Option 2: With Docker

```bash
docker compose up --build
```
Then open **[http://localhost:8000](http://localhost:8000)**.

---

### Option 3: Manual Python Execution (Single Port)

Because the pre-compiled web app bundle is included in `frontend/dist`, you do **not** need Node.js installed to run it!

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

> *Tip: For reading handwriting and measurements from drawings, install Tesseract (`brew install tesseract` on Mac or `sudo apt install tesseract-ocr` on Linux).*

---

### Option 4: Frontend Development Mode (Vite Hot-Reload)

If you are modifying React components in `frontend/src`:

1. Start the backend on port 8000:
   ```bash
   cd backend && uvicorn app.main:app --reload --port 8000
   ```
2. Start Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open **[http://localhost:5173](http://localhost:5173)**. (The Vite dev server proxies API calls to port 8000 automatically).

## Running tests

To run the backend test suite:

```bash
cd backend
pytest tests/
```

All 16 unit and integration tests check OCR, geometry extraction, bend angle detection, and pricing math.

---

## Project layout

```
cnc-tube-bending-cpq/
├── backend/
│   ├── app/
│   │   ├── api/             # API routes (sketch, cad, pricing, quotes, admin)
│   │   ├── models/          # Database models (SQLite)
│   │   ├── services/        # Vision OCR, geometry analyzer, CAD parser, pricing
│   │   └── sample_files/    # Sample drawings, sketches, and STEP models
│   ├── tests/               # Backend test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # 3D viewer, drawing studio, CAD uploader, pricing card
│   │   └── services/        # API client
│   └── index.html
├── Dockerfile
├── docker-compose.yml
└── README.md
```