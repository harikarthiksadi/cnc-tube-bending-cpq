import cv2
import numpy as np
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_files"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

def create_paper_sketch(filename, pts_list, title="Sketch"):
    # Create realistic textured paper background (slightly warm ivory with light noise)
    h, w = 650, 850
    paper = np.ones((h, w, 3), dtype=np.uint8) * 242
    # Add subtle grid lines like engineering graph paper
    for x in range(0, w, 40):
        cv2.line(paper, (x, 0), (x, h), (230, 230, 235), 1)
    for y in range(0, h, 40):
        cv2.line(paper, (0, y), (w, y), (230, 230, 235), 1)

    # Draw pen stroke with slightly organic dark navy/black ink
    pts = np.array(pts_list, dtype=np.int32)
    cv2.polylines(paper, [pts], False, (30, 30, 45), 6, cv2.LINE_AA)

    # Add handwritten-style annotations
    cv2.putText(paper, f"CUSTOMER SKETCH: {title.upper()}", (30, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 70), 2, cv2.LINE_AA)

    for i in range(len(pts_list) - 1):
        p1, p2 = pts_list[i], pts_list[i+1]
        mid = ((p1[0]+p2[0])//2, (p1[1]+p2[1])//2)
        dist = int(np.hypot(p2[0]-p1[0], p2[1]-p1[1]))
        cv2.putText(paper, f"{dist}mm", (mid[0]+12, mid[1]-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 30, 30), 2, cv2.LINE_AA)

    out_p = SAMPLE_DIR / filename
    cv2.imwrite(str(out_p), paper)
    print(f"Created sample sketch: {out_p}")

if __name__ == "__main__":
    create_paper_sketch("hand_drawn_u_pipe.png", [[150, 480], [150, 200], [600, 200], [600, 480]], "U-Bend Coolant Pipe (2 Bends)")
    create_paper_sketch("hand_drawn_l_pipe.png", [[160, 450], [160, 180], [620, 180]], "90 Deg Exhaust Elbow (1 Bend)")
    create_paper_sketch("hand_drawn_s_pipe.png", [[120, 420], [280, 420], [450, 220], [680, 220]], "S-Offset Pipe (2 Bends)")
