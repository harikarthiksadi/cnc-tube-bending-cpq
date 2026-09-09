#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "📦 Packaging CNC Tube Bending CPQ Prototype"
echo "=================================================="

# 1. Build frontend distribution bundle
echo "1/2 Building frontend static bundle..."
cd frontend
npm run build
cd ..

# 2. Package into clean zip archive
OUTPUT_ZIP="$DIR/cnc-tube-cpq-prototype.zip"
rm -f "$OUTPUT_ZIP"

echo "2/2 Creating clean zip archive: cnc-tube-cpq-prototype.zip..."
zip -r "$OUTPUT_ZIP" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".venv/*" \
  -x "*/.venv/*" \
  -x "__pycache__/*" \
  -x "*/__pycache__/*" \
  -x ".git/*" \
  -x "*/.git/*" \
  -x "*.DS_Store" \
  -x "*/.DS_Store" \
  -x "cnc-tube-cpq-prototype.zip"

echo "=================================================="
echo "✅ Export complete!"
echo "File location: $OUTPUT_ZIP"
ls -lh "$OUTPUT_ZIP"
echo "=================================================="
echo "To run this prototype on another machine:"
echo "  1. Unzip the archive: unzip cnc-tube-cpq-prototype.zip"
echo "  2. Option A (Docker): docker compose up --build"
echo "  3. Option B (Python): cd backend && pip install -r requirements.txt && uvicorn app.main:app"
echo "     Open: http://localhost:8000"
echo "=================================================="
