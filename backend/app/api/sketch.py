from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import shutil
import uuid
from app.core.config import UPLOADS_DIR, SAMPLE_DIR
from app.services.sketch_analyzer import SketchAnalyzer
from app.services.vision_brain import VisionBrain

router = APIRouter(prefix="/api/sketch", tags=["Line Drawing & Paper Sketch"])

class LineDrawingRequest(BaseModel):
    segments: List[Dict[str, Any]]
    clr_mm: float = 50.8
    tube_od_mm: float = 25.4

@router.post("/analyze")
def analyze_line_drawing(payload: LineDrawingRequest):
    try:
        return SketchAnalyzer.analyze_line_drawing(
            segments=payload.segments,
            clr_mm=payload.clr_mm,
            tube_od_mm=payload.tube_od_mm
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Line drawing analysis failed: {str(e)}")

@router.post("/upload-drawing")
async def upload_drawing_photo(file: UploadFile = File(...)):
    """
    AI Vision Brain Endpoint: Processes an uploaded paper sketch photo.
    Extracts pipe centerline, vertices, bend angles, leg lengths,
    and returns an annotated diagnostic image overlay.
    """
    filename = file.filename
    unique_name = f"sketch_{uuid.uuid4().hex[:8]}_{filename}"
    saved_path = UPLOADS_DIR / unique_name
    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        analyzed = VisionBrain.detect_pipe_from_sketch(saved_path)
        analyzed["file_name"] = filename
        analyzed["saved_path"] = str(saved_path)
        return analyzed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision Brain failed to analyze sketch: {str(e)}")

@router.get("/sample-sketch/{sketch_id}")
def analyze_sample_sketch(sketch_id: str):
    """Loads and analyzes a realistic hand-drawn benchmark paper sketch or engineering blueprint."""
    if sketch_id == "3d_riser":
        segs = [
            {"length_mm": 250.0, "label": "Leg 1 (Base Feed DBB)"},
            {"bend_angle_deg": 90.0, "clr_mm": 50.8, "direction": "right", "plane_rotation_deg": 0.0},
            {"length_mm": 300.0, "label": "Leg 2 (Horizontal Run DBB)"},
            {"bend_angle_deg": 90.0, "clr_mm": 50.8, "direction": "up", "plane_rotation_deg": 90.0},
            {"length_mm": 200.0, "label": "Leg 3 (3rd-Axis Vertical Riser)"}
        ]
        analyzed = SketchAnalyzer.analyze_line_drawing(segs, clr_mm=50.8, tube_od_mm=25.4)
        analyzed["drawing_type"] = "3D Multi-Plane Blueprint (Z-Axis Height Rise)"
        analyzed["tube_od_mm"] = 25.4
        analyzed["tube_od_in"] = 1.0
        analyzed["wall_thickness_mm"] = 1.5
        analyzed["clamping_feasibility"] = {
            "status": "PASS",
            "details": "All straight lengths (250mm, 300mm, 200mm) exceed clamp die grip requirement (76.2mm)."
        }
        analyzed["unit"] = "mm"
        analyzed["suggested_profile"] = {"shape": "Square", "size": "25x25", "material": "SS"}
        analyzed["legs"] = [
            {"length_mm": 250.0, "label": "Leg 1 (Base Feed DBB)", "source": "Detected", "grip_callout": "OK"},
            {"length_mm": 300.0, "label": "Leg 2 (Horizontal Run DBB)", "source": "Detected", "grip_callout": "OK"},
            {"length_mm": 200.0, "label": "Leg 3 (3rd-Axis Vertical Riser)", "source": "Detected", "grip_callout": "OK"}
        ]
        return analyzed

    filename_map = {
        "turbine_bracket": "user_turbine_bracket.png",
        "clean_s_pipe": "user_clean_s_pipe.png",
        "zigzag": "user_zigzag_drawing.png",
        "engineering_drawing": "engineering_drawing_sample.jpg",
        "handwritten_paper": "handwritten_paper_sample.jpg",
        "u_pipe": "hand_drawn_u_pipe.png",
        "l_pipe": "hand_drawn_l_pipe.png",
        "s_pipe": "hand_drawn_s_pipe.png"
    }
    fname = filename_map.get(sketch_id, "engineering_drawing_sample.jpg")
    sample_path = SAMPLE_DIR / fname

    if not sample_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample sketch file '{fname}' not found")

    analyzed = VisionBrain.detect_pipe_from_drawing(sample_path)
    analyzed["file_name"] = fname
    return analyzed

@router.get("/presets")
def get_drawing_presets():
    return [
        {
            "id": "engineering_drawing",
            "name": "Engineering Technical Blueprint (Image 1)",
            "description": "CAD drawing with Ø.75\" OD, .065\" WT, CLR 2.25\" & .75\", 90° bends, DBB callouts",
            "bends": 2,
            "type": "blueprint"
        },
        {
            "id": "handwritten_paper",
            "name": "Handwritten Paper Sketch (Image 2)",
            "description": "Paper sketch on cutting mat: ØD 25mm, 5 legs (500, 350, 300, 150, 100mm), 4x 90° bends",
            "bends": 4,
            "type": "paper_sketch"
        },
        {
            "id": "u_pipe",
            "name": "Hand-Drawn U-Bend Pipe (2 Bends)",
            "description": "Walk-in client paper sketch with two 90° bends",
            "bends": 2,
            "type": "paper_sketch"
        },
        {
            "id": "l_pipe",
            "name": "Hand-Drawn 90° Elbow Pipe (1 Bend)",
            "description": "Simple 90° exhaust elbow paper sketch",
            "bends": 1,
            "type": "paper_sketch"
        },
        {
            "id": "s_pipe",
            "name": "Hand-Drawn S-Offset Pipe (2 Bends)",
            "description": "Paper sketch with reverse bends for fluid routing",
            "bends": 2,
            "type": "paper_sketch"
        }
    ]
