# How to Export, Share, and Run the CNC Tube CPQ Prototype

This package contains the complete, production-ready **CNC Tube Bending CPQ & 3D Spatial Vision System**.

---

## ⚡ Quick Options to Share with Others

### Option 1: Send the Ready-to-Go ZIP Package (1.2 MB)
A lightweight archive has already been generated at:
```
cnc-tube-cpq-prototype.zip (1.2 MB)
```
You can email this file, send it via Slack/WhatsApp/Teams, or upload it to Google Drive / OneDrive. It includes:
- Full Python FastAPI backend with 3D Kinematics, Vision Brain, and Rate Master pricing engine.
- Complete pre-compiled React single-page app in `frontend/dist` (recipients do not even need Node.js installed!).
- Full frontend source code in `frontend/src` for developers.
- `Dockerfile` and `docker-compose.yml` for 1-click Docker startup.

To re-package at any time, run:
```bash
./export_prototype.sh
```

---

### Option 2: Instant Live URL via Cloudflare Tunnel (Zero recipient setup)
If you want someone to test the app on their phone or laptop right now without them installing anything:

From your Mac terminal:
```bash
npx -y untun tunnel --port 8000
```
or with Cloudflare:
```bash
cloudflared tunnel --url http://localhost:8000
```
This generates an instant, secure public URL (e.g. `https://xyz.trycloudflare.com`) that you can send to anyone. They will be able to upload drawings, rotate the 3D tube, adjust bends, and generate quotes directly in their browser.

---

### Option 3: Run with Docker (Any Mac, Windows, or Linux PC)
Anyone with Docker Desktop installed can run:
```bash
unzip cnc-tube-cpq-prototype.zip
cd cnc-tube-cpq
docker compose up --build
```
Open **[http://localhost:8000](http://localhost:8000)** in any browser.

---

### Option 4: Standard Python Execution
For developers or internal servers with Python 3.10+:
```bash
unzip cnc-tube-cpq-prototype.zip
cd cnc-tube-cpq/backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)**.
*(Note: Tesseract OCR is recommended for extracting drawing text: `brew install tesseract` on Mac or `sudo apt install tesseract-ocr` on Ubuntu).*

---

### Option 5: Free 1-Click Cloud Hosting (Render / Railway / Fly.io)
Because FastAPI now serves the compiled frontend and backend together on a single port (8000):
1. Push this folder to a GitHub repository.
2. In [Render.com](https://render.com) or [Railway.app](https://railway.app):
   - Select **New Web Service** from your GitHub repo.
   - Set Build Command: `cd backend && pip install -r requirements.txt`
   - Set Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Your prototype will be live 24/7 on your custom public URL (e.g. `https://your-company-cpq.onrender.com`).
