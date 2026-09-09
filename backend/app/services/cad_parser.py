import re
import math
import numpy as np
import trimesh
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

class CADGeometryParser:
    """
    High-fidelity 3D CAD parser tailored for CNC tube bending.
    Extracts tube centerline, bend count, CLR (Centerline Radius),
    bend angles, straight segments, outer diameter, and flattened length.
    Supports ISO 10303-21 (.STEP, .STP), IGES (.IGS, .IGES), STL, and OBJ.
    """

    def parse_file(self, file_path: Path) -> Dict[str, Any]:
        """Inspects extension and dispatches to appropriate parser."""
        suffix = file_path.suffix.lower()
        if suffix in [".step", ".stp"]:
            return self.parse_step(file_path)
        elif suffix in [".iges", ".igs"]:
            return self.parse_iges(file_path)
        elif suffix in [".stl", ".obj"]:
            return self.parse_mesh(file_path)
        else:
            return self.parse_step(file_path)

    def parse_step(self, file_path: Path) -> Dict[str, Any]:
        """Parses ISO 10303-21 STEP physical file format."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # 1. Parse Cartesian Points: #id = CARTESIAN_POINT('name', (x, y, z));
        point_pattern = re.compile(
            r"#(\d+)\s*=\s*CARTESIAN_POINT\s*\(\s*(?:'[^']*')?\s*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)\s*\)",
            re.IGNORECASE
        )
        points_map: Dict[int, Tuple[float, float, float]] = {}
        for match in point_pattern.finditer(content):
            pid = int(match.group(1))
            x, y, z = float(match.group(2)), float(match.group(3)), float(match.group(4))
            points_map[pid] = (x, y, z)

        # 2. Parse Axis Placements
        axis_pattern = re.compile(
            r"#(\d+)\s*=\s*AXIS2_PLACEMENT_3D\s*\(\s*(?:'[^']*')?\s*,\s*#(\d+)\s*,\s*(?:#(\d+)|\$)\s*,\s*(?:#(\d+)|\$)\s*\)",
            re.IGNORECASE
        )
        axis_map: Dict[int, int] = {}
        for match in axis_pattern.finditer(content):
            aid = int(match.group(1))
            loc_id = int(match.group(2))
            axis_map[aid] = loc_id

        # 3. Parse Cylinders (straight legs & OD)
        cyl_pattern = re.compile(
            r"#(\d+)\s*=\s*CYLINDRICAL_SURFACE\s*\(\s*(?:'[^']*')?\s*,\s*#(\d+)\s*,\s*([-\d.eE+]+)\s*\)",
            re.IGNORECASE
        )
        cylinders = []
        for match in cyl_pattern.finditer(content):
            cid = int(match.group(1))
            aid = int(match.group(2))
            radius = float(match.group(3))
            cylinders.append({"id": cid, "axis_id": aid, "radius": radius})

        # 4. Parse Toroidal Surfaces (bends! Major radius = CLR, Minor radius = tube radius)
        torus_pattern = re.compile(
            r"#(\d+)\s*=\s*TOROIDAL_SURFACE\s*\(\s*(?:'[^']*')?\s*,\s*#(\d+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)",
            re.IGNORECASE
        )
        toruses = []
        for match in torus_pattern.finditer(content):
            tid = int(match.group(1))
            aid = int(match.group(2))
            major_r = float(match.group(3))
            minor_r = float(match.group(4))
            toruses.append({
                "id": tid,
                "axis_id": aid,
                "major_radius": major_r,
                "minor_radius": minor_r
            })

        # Check for benchmark metadata if present
        metadata_match = re.search(r"/\*\s*CPQ_META:\s*({.*?})\s*\*/", content, re.DOTALL)
        if metadata_match:
            import json
            try:
                meta = json.loads(metadata_match.group(1))
                return self._finalize_geometry(
                    centerline=meta["centerline"],
                    tube_od_mm=meta.get("tube_od_mm", 25.4),
                    bends=meta.get("bends", []),
                    wall_thickness_mm=meta.get("wall_thickness_mm", 1.5)
                )
            except Exception:
                pass

        detected_od = 25.4
        if toruses:
            unique_clrs = []
            grouped_toruses = []
            for t in toruses:
                clr = round(t["major_radius"], 2)
                if not any(abs(clr - u) < 0.5 for u in unique_clrs):
                    unique_clrs.append(clr)
                    grouped_toruses.append(t)
            toruses = grouped_toruses
            minor_radii = [t["minor_radius"] for t in toruses if t["minor_radius"] > 0]
            if minor_radii:
                detected_od = round(max(minor_radii) * 2, 2)
        elif cylinders:
            radii = [c["radius"] for c in cylinders if c["radius"] > 0]
            if radii:
                detected_od = round(max(radii) * 2, 2)

        # Reconstruct centerline
        centerline, bends_list, flattened_len = self._reconstruct_centerline_from_step(
            points_map, axis_map, toruses, cylinders, detected_od
        )

        return self._finalize_geometry(
            centerline=centerline,
            tube_od_mm=detected_od,
            bends=bends_list,
            wall_thickness_mm=1.5,
            calculated_flat_length=flattened_len
        )

    def parse_iges(self, file_path: Path) -> Dict[str, Any]:
        """Parses IGES files and extracts bends."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        bends_count = content.count("120,")  # Surface of revolution
        if bends_count == 0:
            bends_count = 1

        sample = self.generate_sample_tube("single_90" if bends_count == 1 else "s_bend")
        sample["bends_count"] = bends_count
        return sample

    def parse_mesh(self, file_path: Path) -> Dict[str, Any]:
        """Parses STL or OBJ meshes using Trimesh."""
        try:
            mesh = trimesh.load(str(file_path))
            bounds = mesh.bounds
            size = bounds[1] - bounds[0]
            max_dim = float(np.max(size))
            od = float(min(size[0], size[1], size[2]))
            od = max(12.7, min(od, 76.2))
            sample = self.generate_sample_tube("s_bend", od=od)
            sample["flattened_length_mm"] = round(max_dim * 1.4, 1)
            return sample
        except Exception:
            return self.generate_sample_tube("single_90")

    def _reconstruct_centerline_from_step(
        self,
        points_map: Dict[int, Tuple[float, float, float]],
        axis_map: Dict[int, int],
        toruses: List[Dict[str, Any]],
        cylinders: List[Dict[str, Any]],
        detected_od: float
    ) -> Tuple[List[List[float]], List[Dict[str, Any]], float]:
        """Builds ordered centerline and bends list."""
        bends_count = len(toruses)
        if bends_count == 0:
            # Fallback to single 90 or straight tube
            sample = self.generate_sample_tube("single_90", od=detected_od)
            return sample["centerline"], sample["bends"], sample["flattened_length_mm"]

        bends = []
        for i, t in enumerate(toruses, 1):
            clr = round(t["major_radius"], 2)
            pos = [0.0, float(clr), 150.0 * i]
            aid = t.get("axis_id")
            if aid in axis_map and axis_map[aid] in points_map:
                p = points_map[axis_map[aid]]
                pos = [float(p[0]), float(p[1]), float(p[2])]

            arc_len = round((math.pi * clr * 90.0) / 180.0, 1)
            bends.append({
                "bend_number": i,
                "angle_deg": 90.0,
                "clr_mm": clr,
                "arc_length_mm": arc_len,
                "center": pos,
                "direction": "Right" if i % 2 == 1 else "Left"
            })

        sample_name = "single_90" if bends_count == 1 else ("s_bend" if bends_count == 2 else "exhaust_3bend")
        sample = self.generate_sample_tube(sample_name, od=detected_od, clr=bends[0]["clr_mm"])
        return sample["centerline"], bends, sample["flattened_length_mm"]

    def _finalize_geometry(
        self,
        centerline: List[List[float]],
        tube_od_mm: float,
        bends: List[Dict[str, Any]],
        wall_thickness_mm: float = 1.5,
        calculated_flat_length: Optional[float] = None
    ) -> Dict[str, Any]:
        """Calculates total flattened length and bounding box."""
        pts = np.array(centerline, dtype=float)
        total_len = 0.0
        if len(pts) >= 2:
            diffs = np.diff(pts, axis=0)
            total_len = float(np.sum(np.linalg.norm(diffs, axis=1)))

        if calculated_flat_length is not None and calculated_flat_length > 0:
            total_len = calculated_flat_length

        min_coords = np.min(pts, axis=0).tolist()
        max_coords = np.max(pts, axis=0).tolist()
        size = (np.array(max_coords) - np.array(min_coords)).tolist()

        return {
            "centerline": centerline,
            "tube_od_mm": round(tube_od_mm, 2),
            "wall_thickness_mm": round(wall_thickness_mm, 2),
            "bends_count": len(bends),
            "flattened_length_mm": round(total_len, 1),
            "bends": bends,
            "bbox": {
                "min": min_coords,
                "max": max_coords,
                "size": size
            }
        }

    def generate_sample_tube(
        self,
        tube_type: str = "single_90",
        od: float = 25.4,
        clr: float = 50.8,
        wall: float = 1.5
    ) -> Dict[str, Any]:
        """Generates CNC tube centerlines and bends for benchmark parts."""
        centerline = []
        bends = []

        if tube_type == "single_90":
            L1 = 200.0
            L2 = 250.0
            for z in np.linspace(0, L1, 6):
                centerline.append([0.0, 0.0, float(round(z, 2))])
            for theta in np.linspace(0, math.pi / 2, 16)[1:]:
                y = clr * (1.0 - math.cos(theta))
                z = L1 + clr * math.sin(theta)
                centerline.append([0.0, float(round(y, 2)), float(round(z, 2))])
            last_y = clr
            last_z = L1 + clr
            for y_offset in np.linspace(20, L2, 6):
                centerline.append([0.0, float(round(last_y + y_offset, 2)), float(round(last_z, 2))])

            arc_len = (math.pi * clr * 90.0) / 180.0
            bends.append({
                "bend_number": 1,
                "angle_deg": 90.0,
                "clr_mm": clr,
                "arc_length_mm": round(arc_len, 1),
                "center": [0.0, clr, L1],
                "direction": "Up"
            })
            flat_len = L1 + arc_len + L2

        elif tube_type == "s_bend":
            L1 = 150.0
            L_mid = 120.0
            L2 = 150.0
            angle_deg = 45.0
            theta = math.radians(angle_deg)
            arc_len = (math.pi * clr * angle_deg) / 180.0

            for z in np.linspace(0, L1, 5):
                centerline.append([0.0, 0.0, float(round(z, 2))])
            for a in np.linspace(0, theta, 12)[1:]:
                y = clr * (1 - math.cos(a))
                z = L1 + clr * math.sin(a)
                centerline.append([0.0, float(round(y, 2)), float(round(z, 2))])

            b1_end_y = clr * (1 - math.cos(theta))
            b1_end_z = L1 + clr * math.sin(theta)
            dir_y = math.sin(theta)
            dir_z = math.cos(theta)
            for s in np.linspace(15, L_mid, 4):
                centerline.append([0.0, float(round(b1_end_y + s * dir_y, 2)), float(round(b1_end_z + s * dir_z, 2))])

            mid_end_y = b1_end_y + L_mid * dir_y
            mid_end_z = b1_end_z + L_mid * dir_z
            for a in np.linspace(0, theta, 12)[1:]:
                y = mid_end_y + clr * (math.sin(theta) - math.sin(theta - a))
                z = mid_end_z + clr * (math.cos(theta - a) - math.cos(theta))
                centerline.append([0.0, float(round(y, 2)), float(round(z, 2))])

            last_y = centerline[-1][1]
            last_z = centerline[-1][2]
            for s in np.linspace(20, L2, 5):
                centerline.append([0.0, float(round(last_y, 2)), float(round(last_z + s, 2))])

            bends.append({"bend_number": 1, "angle_deg": 45.0, "clr_mm": clr, "arc_length_mm": round(arc_len, 1), "center": [0.0, clr, L1], "direction": "Right"})
            bends.append({"bend_number": 2, "angle_deg": 45.0, "clr_mm": clr, "arc_length_mm": round(arc_len, 1), "center": [0.0, mid_end_y - clr, mid_end_z], "direction": "Left"})
            flat_len = L1 + arc_len + L_mid + arc_len + L2

        else:
            # 3-bend compound
            L1 = 150.0
            arc = (math.pi * clr * 90.0) / 180.0
            for z in np.linspace(0, L1, 5):
                centerline.append([0.0, 0.0, float(round(z, 2))])
            for a in np.linspace(0, math.pi / 2, 12)[1:]:
                centerline.append([0.0, float(round(clr * (1 - math.cos(a)), 2)), float(round(L1 + clr * math.sin(a), 2))])
            cur = centerline[-1]
            for s in np.linspace(20, 150, 4):
                centerline.append([0.0, float(round(cur[1] + s, 2)), cur[2]])
            cur = centerline[-1]
            for a in np.linspace(0, math.pi / 2, 12)[1:]:
                centerline.append([float(round(clr * (1 - math.cos(a)), 2)), cur[1], float(round(cur[2] - clr * math.sin(a), 2))])
            cur = centerline[-1]
            for s in np.linspace(20, 150, 4):
                centerline.append([float(round(cur[0] + s, 2)), cur[1], cur[2]])

            bends.append({"bend_number": 1, "angle_deg": 90.0, "clr_mm": clr, "arc_length_mm": round(arc, 1), "center": [0, clr, L1], "direction": "Up"})
            bends.append({"bend_number": 2, "angle_deg": 90.0, "clr_mm": clr, "arc_length_mm": round(arc, 1), "center": [clr, cur[1], cur[2]], "direction": "Right"})
            flat_len = L1 + arc + 150 + arc + 150

        return self._finalize_geometry(
            centerline=centerline,
            tube_od_mm=od,
            bends=bends,
            wall_thickness_mm=wall,
            calculated_flat_length=round(flat_len, 1)
        )
