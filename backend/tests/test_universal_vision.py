import pytest
from pathlib import Path
from app.services.vision_brain import VisionBrain

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_files"

def test_universal_vision_engineering_blueprint_image_1():
    img_path = SAMPLE_DIR / "engineering_drawing_sample.jpg"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    assert result["drawing_type"] == "Engineering Technical Blueprint (2D CAD Drawing)"
    assert result["unit"] == "in"
    assert result["tube_od_in"] == 0.75
    assert result["tube_od_mm"] == 19.05
    assert result["wall_thickness_in"] == 0.065
    assert result["wall_thickness_mm"] == 1.65
    assert result["bends_count"] == 2

    # Check legs
    legs = result["legs"]
    assert len(legs) == 3
    assert legs[0]["length_in"] == 2.25
    assert legs[1]["length_in"] == 3.00
    assert legs[2]["length_in"] == 1.50

    # Check bends
    bends = result["bends"]
    assert len(bends) == 2
    assert bends[0]["angle_deg"] == 90.0
    assert bends[0]["clr_in"] == 2.25
    assert "3D" in bends[0]["d_factor"]
    assert bends[1]["angle_deg"] == 90.0
    assert bends[1]["clr_in"] == 0.75
    assert "1D" in bends[1]["d_factor"]

    # Check developed flat length and feasibility
    assert result["flattened_length_in"] == 11.46
    assert result["clamping_feasibility"]["status"] == "PASS"
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")
    assert len(result["centerline"]) > 10

def test_universal_vision_handwritten_paper_sketch_image_2():
    img_path = SAMPLE_DIR / "handwritten_paper_sample.jpg"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    assert result["drawing_type"] == "Handwritten Paper Sketch with Measurements"
    assert result["unit"] == "mm"
    assert result["tube_od_mm"] == 25.0
    assert result["bends_count"] == 4

    # Check all 5 handwritten legs
    legs = result["legs"]
    assert len(legs) == 5
    assert legs[0]["length_mm"] == 500.0
    assert legs[1]["length_mm"] == 350.0
    assert legs[2]["length_mm"] == 300.0
    assert legs[3]["length_mm"] == 150.0
    assert legs[4]["length_mm"] == 100.0

    # Check all 4 90° bends
    bends = result["bends"]
    assert len(bends) == 4
    for b in bends:
        assert b["angle_deg"] == 90.0

    # Total developed length
    assert result["flattened_length_mm"] == 1719.2
    assert result["clamping_feasibility"]["status"] == "PASS"
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")
    assert len(result["centerline"]) > 15
