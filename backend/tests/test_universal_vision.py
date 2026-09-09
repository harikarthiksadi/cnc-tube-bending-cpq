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

def test_universal_vision_user_sketch_7legs_6bends():
    img_path = SAMPLE_DIR / "user_orthogonal_sketch.png"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    assert result["tube_od_mm"] == 32.0
    assert result["bends_count"] == 6
    assert len(result["bends"]) == 6
    for b in result["bends"]:
        assert b["angle_deg"] == 90.0

    legs = result["legs"]
    assert len(legs) == 7
    # Leg 1: 100mm (scale tolerance within 2.5mm)
    assert abs(legs[0]["length_mm"] - 100.0) < 3.0
    # Leg 4: 300mm
    assert abs(legs[3]["length_mm"] - 300.0) < 1.0
    # Leg 5: 500mm
    assert abs(legs[4]["length_mm"] - 500.0) < 1.0
    # Leg 6: 150mm
    assert abs(legs[5]["length_mm"] - 150.0) < 1.0
    # Leg 7: 200mm
    assert abs(legs[6]["length_mm"] - 200.0) < 1.0

    # Verify bend directions (Bends 1-2 Right, Bends 3-6 Left)
    bends = result["bends"]
    assert bends[0]["direction"] == "Right" and bends[0]["plane_rotation_deg"] == 0.0
    assert bends[1]["direction"] == "Right" and bends[1]["plane_rotation_deg"] == 0.0
    assert bends[2]["direction"] == "Left" and bends[2]["plane_rotation_deg"] == 180.0
    assert bends[3]["direction"] == "Left" and bends[3]["plane_rotation_deg"] == 180.0
    assert bends[4]["direction"] == "Left" and bends[4]["plane_rotation_deg"] == 180.0
    assert bends[5]["direction"] == "Left" and bends[5]["plane_rotation_deg"] == 180.0

    # Verify CNC YBC Table
    ybc = result["ybc_table"]
    assert len(ybc) == 6
    assert [row["b_rotation_deg"] for row in ybc] == [0.0, 0.0, 180.0, 180.0, 180.0, 180.0]

    # Verify 3D centerline orientation (Leg 5 goes East, ends at West end)
    cl = result["centerline"]
    assert len(cl) > 50
    assert abs(cl[0][0]) < 1e-2 and abs(cl[0][1]) < 1e-2
    assert abs(cl[-1][0] - 317.0) < 5.0
    assert abs(cl[-1][1] - (-425.0)) < 5.0

    assert result["annotated_image"].startswith("data:image/jpeg;base64,")


def test_universal_vision_user_spipe_5legs_4bends_start_marker():
    img_path = SAMPLE_DIR / "user_clean_s_pipe.png"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    # 4 Bends, each 90 deg, CLR 50mm
    assert result["bends_count"] == 4
    assert len(result["bends"]) == 4
    for b in result["bends"]:
        assert b["angle_deg"] == 90.0
        assert b["clr_mm"] == 50.0

    # 5 Legs matching handwritten dimensions exactly
    legs = result["legs"]
    assert len(legs) == 5
    assert abs(legs[0]["length_mm"] - 200.0) < 1.0
    assert abs(legs[1]["length_mm"] - 100.0) < 1.0
    assert abs(legs[2]["length_mm"] - 100.0) < 1.0
    assert abs(legs[3]["length_mm"] - 100.0) < 1.0
    assert abs(legs[4]["length_mm"] - 200.0) < 1.0

    # Verify bend directions and plane rotations
    bends = result["bends"]
    assert bends[0]["direction"] == "Left" and bends[0]["plane_rotation_deg"] == 180.0
    assert bends[1]["direction"] == "Left" and bends[1]["plane_rotation_deg"] == 180.0
    assert bends[2]["direction"] == "Right" and bends[2]["plane_rotation_deg"] == 0.0
    assert bends[3]["direction"] == "Right" and bends[3]["plane_rotation_deg"] == 0.0

    # Verify YBC table feeds and rotations
    ybc = result["ybc_table"]
    assert len(ybc) == 4
    assert [row["y_feed_mm"] for row in ybc] == [200.0, 100.0, 100.0, 100.0]
    assert [row["b_rotation_deg"] for row in ybc] == [180.0, 180.0, 0.0, 0.0]
    assert [row["c_angle_deg"] for row in ybc] == [90.0, 90.0, 90.0, 90.0]

    # Total developed length
    # 700mm straight + 4 * (pi * 50 * 90 / 180) = 1014.16mm -> 1014.0mm
    assert abs(result["flattened_length_mm"] - 1014.0) < 2.0
    assert result["clamping_feasibility"]["status"] == "PASS"

    # Verify 3D centerline exists and annotated image is generated
    cl = result["centerline"]
    assert len(cl) > 30
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")


def test_universal_vision_user_zigzag_non_90_bends():
    img_path = SAMPLE_DIR / "user_zigzag_drawing.png"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    # Tube OD extracted from "Zig-Zag (ØD: 20mm)"
    assert result["tube_od_mm"] == 20.0

    # 2 Bends with non-90° arbitrary angles: 45° and 135°
    assert result["bends_count"] == 2
    assert len(result["bends"]) == 2

    bend1 = result["bends"][0]
    assert bend1["bend_number"] == 1
    assert bend1["angle_deg"] == 45.0
    assert bend1["clr_mm"] == 50.0
    assert bend1["direction"] == "Right"
    assert bend1["plane_rotation_deg"] == 0.0

    bend2 = result["bends"][1]
    assert bend2["bend_number"] == 2
    assert bend2["angle_deg"] == 135.0
    assert bend2["clr_mm"] == 50.0
    assert bend2["direction"] == "Right"
    assert bend2["plane_rotation_deg"] == 0.0

    # 3 Legs: 150mm, 100mm, 150mm (all extracted from multi-pass OCR callouts)
    legs = result["legs"]
    assert len(legs) == 3
    assert abs(legs[0]["length_mm"] - 150.0) < 1.0
    assert abs(legs[1]["length_mm"] - 100.0) < 1.0
    assert abs(legs[2]["length_mm"] - 150.0) < 1.0

    # CNC YBC Table
    ybc = result["ybc_table"]
    assert len(ybc) == 2
    assert ybc[0]["y_feed_mm"] == 150.0
    assert ybc[0]["c_angle_deg"] == 45.0
    assert ybc[0]["b_rotation_deg"] == 0.0
    assert ybc[1]["y_feed_mm"] == 100.0
    assert ybc[1]["c_angle_deg"] == 135.0
    assert ybc[1]["b_rotation_deg"] == 0.0

    # Total developed length (400mm straight + 39.3mm arc 1 + 117.8mm arc 2 ~ 557.1mm)
    assert abs(result["flattened_length_mm"] - 557.1) < 2.0
    assert result["clamping_feasibility"]["status"] == "PASS"

    # 3D centerline and annotated overlay verification
    cl = result["centerline"]
    assert len(cl) >= 20
    assert abs(cl[0][0]) < 1e-2 and abs(cl[0][1]) < 1e-2
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")


def test_universal_vision_user_turbine_bracket_4legs_3bends():
    img_path = SAMPLE_DIR / "user_turbine_bracket.png"
    assert img_path.exists(), f"Sample image {img_path} not found"

    result = VisionBrain.detect_pipe_from_drawing(img_path)

    # Tube OD extracted from "The Turbine Mounting Bracket (ØD: 30mm)"
    assert result["tube_od_mm"] == 30.0

    # 3 Bends: 45°, 90°, 135° with CLR = 40mm
    assert result["bends_count"] == 3
    assert len(result["bends"]) == 3

    bends = result["bends"]
    assert bends[0]["bend_number"] == 1
    assert bends[0]["angle_deg"] == 45.0
    assert bends[0]["clr_mm"] == 40.0
    assert bends[0]["direction"] == "Right"
    assert bends[0]["plane_rotation_deg"] == 0.0

    assert bends[1]["bend_number"] == 2
    assert bends[1]["angle_deg"] == 90.0
    assert bends[1]["clr_mm"] == 40.0
    assert bends[1]["direction"] == "Right"
    assert bends[1]["plane_rotation_deg"] == 0.0

    assert bends[2]["bend_number"] == 3
    assert bends[2]["angle_deg"] == 135.0
    assert bends[2]["clr_mm"] == 40.0
    assert bends[2]["direction"] == "Left"
    assert bends[2]["plane_rotation_deg"] == 180.0

    # 4 Legs: 150mm, 85mm, 85mm, 200mm (all matched to handwritten dimensions)
    legs = result["legs"]
    assert len(legs) == 4
    assert abs(legs[0]["length_mm"] - 150.0) < 1.0
    assert abs(legs[1]["length_mm"] - 85.0) < 1.0
    assert abs(legs[2]["length_mm"] - 85.0) < 1.0
    assert abs(legs[3]["length_mm"] - 200.0) < 1.0

    # CNC YBC Table
    ybc = result["ybc_table"]
    assert len(ybc) == 3
    assert ybc[0]["y_feed_mm"] == 150.0
    assert ybc[0]["c_angle_deg"] == 45.0
    assert ybc[0]["b_rotation_deg"] == 0.0
    assert ybc[1]["y_feed_mm"] == 85.0
    assert ybc[1]["c_angle_deg"] == 90.0
    assert ybc[1]["b_rotation_deg"] == 0.0
    assert ybc[2]["y_feed_mm"] == 85.0
    assert ybc[2]["c_angle_deg"] == 135.0
    assert ybc[2]["b_rotation_deg"] == 180.0

    # Total developed length (520mm straight + 188.5mm arcs ~ 708.4mm)
    assert abs(result["flattened_length_mm"] - 708.4) < 2.0
    assert result["clamping_feasibility"]["status"] == "PASS"

    # 3D centerline and annotated overlay verification
    cl = result["centerline"]
    assert len(cl) >= 20
    assert abs(cl[0][0]) < 1e-2 and abs(cl[0][1]) < 1e-2
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")




