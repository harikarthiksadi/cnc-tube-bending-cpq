import pytest
import numpy as np
from pathlib import Path
from app.services.vision_brain import VisionBrain
from app.services.sketch_analyzer import SketchAnalyzer

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_files"

def test_3d_kinematics_z_height_calculation():
    """Verify that bending in the 3rd axis (Up +Z) computes true spatial Z-height."""
    legs = [
        {"length_mm": 200.0, "label": "Leg 1 (Base Feed)"},
        {"length_mm": 250.0, "label": "Leg 2 (Horizontal Run)"},
        {"length_mm": 180.0, "label": "Leg 3 (Vertical Riser)"}
    ]
    bends = [
        {"angle_deg": 90.0, "clr_mm": 50.8, "direction": "right", "plane_rotation_deg": 0.0},
        {"angle_deg": 90.0, "clr_mm": 50.8, "direction": "up", "plane_rotation_deg": 90.0}
    ]

    centerline, bbox_3d, ybc_table = VisionBrain._generate_3d_centerline_3axis(legs, bends)

    assert len(centerline) > 20
    assert bbox_3d["z_height_mm"] > 100.0, f"Expected Z height > 100mm, got {bbox_3d['z_height_mm']}"
    assert bbox_3d["height_in"] > 3.9
    assert bbox_3d["width_mm"] > 100.0
    assert bbox_3d["length_mm"] > 100.0

    # Verify YBC CNC machine table
    assert len(ybc_table) == 2
    assert ybc_table[0]["bend_number"] == 1
    assert ybc_table[0]["b_rotation_deg"] == 0.0
    assert ybc_table[1]["bend_number"] == 2
    assert ybc_table[1]["b_rotation_deg"] == 90.0
    assert ybc_table[1]["c_angle_deg"] == 90.0

def test_sketch_analyzer_3rd_axis_elevation():
    """Verify SketchAnalyzer produces 3D Z-height and YBC coordinates."""
    segments = [
        {"length_mm": 300.0},
        {"bend_angle_deg": 90.0, "direction": "right", "plane_rotation_deg": 0.0},
        {"length_mm": 200.0},
        {"bend_angle_deg": 90.0, "direction": "up", "plane_rotation_deg": 90.0},
        {"length_mm": 150.0}
    ]

    result = SketchAnalyzer.analyze_line_drawing(segments, clr_mm=50.8)

    assert result["bends_count"] == 2
    assert result["height_mm"] > 50.0
    assert result["has_3d_bends"] is True
    assert len(result["ybc_table"]) == 2
    assert result["ybc_table"][1]["b_rotation_deg"] == 90.0
    assert "bbox_3d" in result

def test_perspective_deskew_functionality():
    """Verify that paper photos can be deskewed without crashing."""
    img_path = SAMPLE_DIR / "handwritten_paper_sample.jpg"
    assert img_path.exists()

    import cv2
    img = cv2.imread(str(img_path))
    deskewed = VisionBrain._deskew_perspective(img)

    assert deskewed is not None
    assert deskewed.shape[0] > 200
    assert deskewed.shape[1] > 200
