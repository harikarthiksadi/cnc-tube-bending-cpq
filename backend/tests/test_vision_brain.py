import pytest
import numpy as np
import cv2
from pathlib import Path
from app.services.vision_brain import VisionBrain

def test_vision_brain_on_synthetic_ubend(tmp_path):
    # Create a synthetic hand-drawn sketch of a U-bend pipe
    # White background with dark gray/black line
    img = np.ones((600, 800, 3), dtype=np.uint8) * 245
    pts = np.array([[150, 450], [150, 200], [550, 200], [550, 450]], dtype=np.int32)

    # Draw thick stroke resembling pen/marker on paper
    cv2.polylines(img, [pts], False, (35, 35, 40), 6, cv2.LINE_AA)

    test_img_path = tmp_path / "test_ubend_sketch.png"
    cv2.imwrite(str(test_img_path), img)

    # Run Vision Brain detection
    result = VisionBrain.detect_pipe_from_sketch(test_img_path, clr_mm=50.8)

    assert result["bends_count"] == 2
    assert len(result["bends"]) == 2
    # Bend angles should be approx 90 degrees
    assert abs(result["bends"][0]["angle_deg"] - 90.0) <= 5.0
    assert abs(result["bends"][1]["angle_deg"] - 90.0) <= 5.0
    assert len(result["legs"]) == 3
    assert result["flattened_length_mm"] > 500.0
    assert result["annotated_image"].startswith("data:image/jpeg;base64,")
    assert len(result["centerline"]) > 10

def test_vision_brain_on_synthetic_lbend(tmp_path):
    # Single 90 degree elbow
    img = np.ones((500, 500, 3), dtype=np.uint8) * 240
    pts = np.array([[100, 380], [100, 150], [380, 150]], dtype=np.int32)
    cv2.polylines(img, [pts], False, (20, 20, 25), 5, cv2.LINE_AA)

    test_img_path = tmp_path / "test_lbend_sketch.png"
    cv2.imwrite(str(test_img_path), img)

    result = VisionBrain.detect_pipe_from_sketch(test_img_path, clr_mm=50.8)

    assert result["bends_count"] == 1
    assert abs(result["bends"][0]["angle_deg"] - 90.0) <= 5.0
    assert len(result["legs"]) == 2
    assert result["annotated_image"] is not None
