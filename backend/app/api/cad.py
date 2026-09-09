from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import uuid
from app.core.config import UPLOADS_DIR, SAMPLE_DIR
from app.services.cad_parser import CADGeometryParser

router = APIRouter(prefix="/api/cad", tags=["CAD"])
parser = CADGeometryParser()

@router.post("/upload")
async def upload_cad_file(file: UploadFile = File(...)):
    filename = file.filename
    ext = Path(filename).suffix.lower()
    if ext not in [".step", ".stp", ".iges", ".igs", ".stl", ".obj"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a 3D .STEP, .IGES, .STL, or .OBJ file."
        )

    unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    saved_path = UPLOADS_DIR / unique_name
    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        parsed_data = parser.parse_file(saved_path)
        parsed_data["file_name"] = filename
        parsed_data["saved_path"] = str(saved_path)
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CAD file: {str(e)}")

@router.get("/samples")
def get_sample_parts():
    return [
        {
            "id": "single_90",
            "name": "90° Exhaust Downpipe",
            "description": "Standard 1-bend exhaust tube with 90° smooth bend",
            "bends": 1,
            "od_mm": 25.4,
            "clr_mm": 50.8,
            "filename": "single_90_bend.step"
        },
        {
            "id": "s_bend",
            "name": "S-Bend Radiator Bypass Tube",
            "description": "2-bend S-curve with 45° reverse bends for fluid routing",
            "bends": 2,
            "od_mm": 25.4,
            "clr_mm": 50.8,
            "filename": "s_bend_coolant_tube.step"
        },
        {
            "id": "exhaust_3bend",
            "name": "3D Compound Header Tube",
            "description": "Complex 3-bend multi-planar exhaust manifold runner",
            "bends": 3,
            "od_mm": 38.1,
            "clr_mm": 76.2,
            "filename": "exhaust_manifold_tube.step"
        },
        {
            "id": "u_bend",
            "name": "180° Intercooler Return U-Bend",
            "description": "Tight 180° return U-bend for heat exchanger loop",
            "bends": 1,
            "od_mm": 31.75,
            "clr_mm": 63.5,
            "filename": "u_bend_180.step"
        }
    ]

@router.get("/sample/{sample_id}")
def load_sample_geometry(sample_id: str):
    file_map = {
        "single_90": "single_90_bend.step",
        "s_bend": "s_bend_coolant_tube.step",
        "exhaust_3bend": "exhaust_manifold_tube.step",
        "u_bend": "u_bend_180.step"
    }
    if sample_id not in file_map:
        raise HTTPException(status_code=404, detail="Sample not found")

    step_path = SAMPLE_DIR / file_map[sample_id]
    if step_path.exists():
        data = parser.parse_step(step_path)
    else:
        data = parser.generate_sample_tube(sample_id)

    data["file_name"] = file_map[sample_id]
    return data
