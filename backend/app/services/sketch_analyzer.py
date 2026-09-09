import math
import numpy as np
from typing import List, Dict, Any, Optional
from pathlib import Path

class SketchAnalyzer:
    """
    Analyzes 2D and 3D paper sketches and line drawings for CNC pipe bending.
    Extracts number of bends, bend angles, 3rd-axis plane rotations (Z-height),
    straight leg lengths, calculates total flattened cut length, 3D bounding envelope,
    and generates industrial YBC CNC bender machine coordinate tables.
    """

    @classmethod
    def analyze_line_drawing(
        cls,
        segments: List[Dict[str, Any]],
        clr_mm: float = 50.8,
        tube_od_mm: float = 25.4
    ) -> Dict[str, Any]:
        """
        Processes segments with support for:
        - Straight leg lengths (length_mm)
        - Bend angles (bend_angle_deg)
        - 3rd Axis Plane Rotation / Height (plane_rotation_deg or direction: 'right', 'left', 'up', 'down')
        - Per-bend CLR (clr_mm)
        """
        centerline = []
        bends = []
        ybc_table = []
        total_straight_length = 0.0
        total_arc_length = 0.0

        # Frame initialization (Frenet-Serret 3D Kinematics)
        cur_pos = np.array([0.0, 0.0, 0.0], dtype=float)
        cur_dir = np.array([1.0, 0.0, 0.0], dtype=float)  # initial tangent along +X (Width/Run)
        cur_norm = np.array([0.0, 1.0, 0.0], dtype=float) # initial normal along +Y (Length/Table)

        centerline.append(cur_pos.tolist())

        bend_idx = 1
        last_leg_length = 0.0

        for i, item in enumerate(segments):
            if "length_mm" in item and item["length_mm"] is not None:
                L = float(item["length_mm"])
                last_leg_length = L
                total_straight_length += L

                steps = max(3, int(L / 35.0))
                for s in np.linspace(0, L, steps)[1:]:
                    pt = cur_pos + cur_dir * s
                    centerline.append([round(float(pt[0]), 2), round(float(pt[1]), 2), round(float(pt[2]), 2)])

                cur_pos = cur_pos + cur_dir * L

            elif "bend_angle_deg" in item and item["bend_angle_deg"] is not None:
                angle_deg = float(item["bend_angle_deg"])
                angle_rad = math.radians(angle_deg)
                b_clr = float(item.get("clr_mm", clr_mm))
                arc_len = (math.pi * b_clr * angle_deg) / 180.0
                total_arc_length += arc_len

                direction = str(item.get("direction", "right")).strip().lower()

                # 3rd-Axis Plane Rotation (Roll angle B around tube axis)
                if "plane_rotation_deg" in item and item["plane_rotation_deg"] is not None:
                    beta_deg = float(item["plane_rotation_deg"])
                    if "left" in direction and abs(beta_deg) < 1e-3:
                        beta_deg = 180.0
                else:
                    if "up" in direction or "+z" in direction:
                        beta_deg = 90.0  # +Z Height Rise
                    elif "down" in direction or "-z" in direction:
                        beta_deg = -90.0 # -Z Height Drop
                    elif "left" in direction:
                        beta_deg = 180.0 # Left in X-Y
                    else:
                        beta_deg = 0.0   # Right in X-Y

                beta_rad = math.radians(beta_deg)

                # Reference up vector [0, 0, 1]
                u_ref = np.array([0.0, 0.0, 1.0])
                if abs(np.dot(cur_dir, u_ref)) > 0.99:
                    u_ref = np.array([0.0, 1.0, 0.0])

                # Right vector in plane (tangent x u_ref)
                r_vec = np.cross(cur_dir, u_ref)
                r_norm = np.linalg.norm(r_vec)
                if r_norm > 1e-6:
                    r_vec = r_vec / r_norm
                else:
                    r_vec = np.array([0.0, -1.0, 0.0])

                # Up perpendicular vector
                u_perp = np.cross(r_vec, cur_dir)
                u_perp = u_perp / np.linalg.norm(u_perp)

                # Bend normal vector towards the center of curvature
                rot_norm = r_vec * math.cos(beta_rad) + u_perp * math.sin(beta_rad)
                rot_norm = rot_norm / np.linalg.norm(rot_norm)

                # Bend center
                bend_center = cur_pos + rot_norm * b_clr

                # Arc discretization
                arc_steps = max(6, int(angle_deg / 10.0))
                for a in np.linspace(0, angle_rad, arc_steps)[1:]:
                    pt_arc = bend_center - rot_norm * (b_clr * math.cos(a)) + cur_dir * (b_clr * math.sin(a))
                    centerline.append([round(float(pt_arc[0]), 2), round(float(pt_arc[1]), 2), round(float(pt_arc[2]), 2)])

                cur_pos = np.array(centerline[-1], dtype=float)

                # Update tangent vector after bend
                new_dir = cur_dir * math.cos(angle_rad) + rot_norm * math.sin(angle_rad)
                cur_dir = new_dir / np.linalg.norm(new_dir)

                # Classify 3rd axis plane label and directional label
                if abs(beta_deg - 90.0) < 1.0:
                    plane_label = "Up (+Z Height Rise)"
                    dir_label = "Up"
                elif abs(beta_deg - (-90.0)) < 1.0 or abs(beta_deg - 270.0) < 1.0:
                    plane_label = "Down (-Z Depth Drop)"
                    dir_label = "Down"
                elif abs(beta_deg - 180.0) < 1.0:
                    plane_label = "Left (X-Y Plane)"
                    dir_label = "Left"
                elif abs(beta_deg) < 1.0:
                    plane_label = "Right (X-Y Plane)"
                    dir_label = "Right"
                else:
                    plane_label = f"Spatial Roll ({int(beta_deg)}°)"
                    dir_label = f"Roll {int(beta_deg)}°"

                bends.append({
                    "bend_number": bend_idx,
                    "angle_deg": angle_deg,
                    "clr_mm": b_clr,
                    "clr_in": round(b_clr / 25.4, 2),
                    "plane_rotation_deg": beta_deg,
                    "plane_label": plane_label,
                    "arc_length_mm": round(arc_len, 2),
                    "direction": dir_label,
                    "center": [round(float(bend_center[0]), 2), round(float(bend_center[1]), 2), round(float(bend_center[2]), 2)]
                })

                ybc_table.append({
                    "bend_number": bend_idx,
                    "y_feed_mm": round(last_leg_length, 1),
                    "b_rotation_deg": round(beta_deg, 1),
                    "c_angle_deg": round(angle_deg, 1),
                    "clr_mm": round(b_clr, 1)
                })

                bend_idx += 1

        flattened_length = round(total_straight_length + total_arc_length, 2)

        # 3D Bounding Envelope
        pts = np.array(centerline, dtype=float)
        min_coords = np.min(pts, axis=0)
        max_coords = np.max(pts, axis=0)
        spans = max_coords - min_coords

        bbox_3d = {
            "x_span_mm": round(float(spans[0]), 1),
            "y_span_mm": round(float(spans[1]), 1),
            "z_height_mm": round(float(spans[2]), 1),
            "width_mm": round(float(spans[0]), 1),
            "length_mm": round(float(spans[1]), 1),
            "height_mm": round(float(spans[2]), 1),
            "width_in": round(float(spans[0] / 25.4), 2),
            "length_in": round(float(spans[1] / 25.4), 2),
            "height_in": round(float(spans[2] / 25.4), 2),
            "min": min_coords.tolist(),
            "max": max_coords.tolist()
        }

        has_3d_bends = any(
            abs(b.get("plane_rotation_deg", 0.0)) not in [0.0, 180.0, 360.0] or
            b.get("direction", "").lower() in ["up", "down"]
            for b in bends
        )

        return {
            "centerline": centerline,
            "bends_count": len(bends),
            "bends": bends,
            "flattened_length_mm": flattened_length,
            "flattened_length_in": round(flattened_length / 25.4, 2),
            "tube_od_mm": tube_od_mm,
            "bbox": {
                "min": min_coords.tolist(),
                "max": max_coords.tolist(),
                "size": spans.tolist()
            },
            "bbox_3d": bbox_3d,
            "height_mm": bbox_3d["z_height_mm"],
            "height_in": bbox_3d["height_in"],
            "has_3d_bends": has_3d_bends,
            "ybc_table": ybc_table
        }
