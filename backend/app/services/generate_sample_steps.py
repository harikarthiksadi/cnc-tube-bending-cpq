import json
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_files"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

def create_step_file(filename: str, name: str, clr: float, tube_r: float, bends: list, centerline: list, flat_len: float):
    meta_json = json.dumps({
        "name": name,
        "tube_od_mm": tube_r * 2,
        "wall_thickness_mm": 1.65,
        "bends": bends,
        "centerline": centerline,
        "flattened_length_mm": flat_len
    })

    entities = []
    eid = 1
    # Header
    step_text = f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('CNC Tube Bending Benchmark Part', '2;1'), '2;1');
FILE_NAME('{filename}', '2026-09-08T22:00:00', ('Antigravity CAD'), ('Precision Tube'), 'FastAPI STEP Gen', 'CNC CPQ Engine', 'Approved');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
/* CPQ_META: {meta_json} */
#{eid} = APPLICATION_CONTEXT('core data for automotive design');
"""
    eid += 1
    # Axis & Origin
    step_text += f"#{eid} = CARTESIAN_POINT('Origin', (0., 0., 0.));\n"
    origin_id = eid
    eid += 1
    step_text += f"#{eid} = DIRECTION('Z_Axis', (0., 0., 1.));\n"
    eid += 1
    step_text += f"#{eid} = DIRECTION('X_Axis', (1., 0., 0.));\n"
    eid += 1
    step_text += f"#{eid} = AXIS2_PLACEMENT_3D('Placement', #{origin_id}, #{eid-2}, #{eid-1});\n"
    base_axis_id = eid

    # Cylindrical surfaces
    for i in range(len(bends) + 1):
        eid += 1
        step_text += f"#{eid} = CYLINDRICAL_SURFACE('Leg_{i+1}_Straight', #{base_axis_id}, {tube_r});\n"

    # Toroidal surfaces (bends!)
    for b in bends:
        eid += 1
        step_text += f"#{eid} = TOROIDAL_SURFACE('Bend_{b['bend_number']}_Toroid', #{base_axis_id}, {b['clr_mm']}, {tube_r});\n"

    # Cartesian points from centerline
    for pt in centerline:
        eid += 1
        step_text += f"#{eid} = CARTESIAN_POINT('CenterlinePoint', ({pt[0]}, {pt[1]}, {pt[2]}));\n"

    step_text += """ENDSEC;
END-ISO-10303-21;
"""
    file_path = SAMPLE_DIR / filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(step_text)
    print(f"Created {file_path}")

if __name__ == "__main__":
    from app.services.cad_parser import CADGeometryParser
    parser = CADGeometryParser()

    # 1. Single 90
    s1 = parser.generate_sample_tube("single_90", od=25.4, clr=50.8)
    create_step_file("single_90_bend.step", "90° Exhaust Downpipe", 50.8, 12.7, s1["bends"], s1["centerline"], s1["flattened_length_mm"])

    # 2. S-Bend
    s2 = parser.generate_sample_tube("s_bend", od=25.4, clr=50.8)
    create_step_file("s_bend_coolant_tube.step", "S-Bend Radiator Bypass Tube", 50.8, 12.7, s2["bends"], s2["centerline"], s2["flattened_length_mm"])

    # 3. Exhaust 3-Bend
    s3 = parser.generate_sample_tube("exhaust_3bend", od=38.1, clr=76.2)
    create_step_file("exhaust_manifold_tube.step", "3D Compound Header Tube", 76.2, 19.05, s3["bends"], s3["centerline"], s3["flattened_length_mm"])

    # 4. U-Bend 180
    s4 = parser.generate_sample_tube("u_bend", od=31.75, clr=63.5)
    create_step_file("u_bend_180.step", "180° Intercooler Return U-Bend", 63.5, 15.875, s4["bends"], s4["centerline"], s4["flattened_length_mm"])
