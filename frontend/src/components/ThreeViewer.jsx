import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function ThreeViewer({
  centerline = [],
  tubeOdMm = 25.4,
  bends = [],
  partName = "Technical Model",
  theme = "light"
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const tubeMeshRef = useRef(null);
  const centerlineLineRef = useRef(null);
  const markersGroupRef = useRef(null);
  const boxHelperRef = useRef(null);
  const heightDimGroupRef = useRef(null);
  const gridRef = useRef(null);
  const ambientLightRef = useRef(null);
  const reqIdRef = useRef(null);

  // View state - clean default view
  const [wireframe] = useState(false);
  const [showCenterline] = useState(false);
  const [showMarkers] = useState(false);
  const [showBBox] = useState(false);
  const [showHeightDim] = useState(false);
  const [autoRotate] = useState(false);
  const [activeView, setActiveView] = useState("iso");

  // Dynamic 3D bounding dimensions state
  const [envelope, setEnvelope] = useState({
    width: 0,
    length: 0,
    height: 0,
    heightIn: "0.00",
    is3D: false
  });

  // Mouse interaction state for manual orbit controls
  const isDraggingRef = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 450 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 440;
    const isLight = theme === "light";

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isLight ? "#F8FAFC" : "#080D18");
    sceneRef.current = scene;

    // Grid Floor (X-Z horizontal plane)
    const grid = new THREE.GridHelper(
      600,
      30,
      isLight ? 0xCBD5E1 : 0x1E2E4A,
      isLight ? 0xE2E8F0 : 0x131E33
    );
    grid.position.y = -100;
    scene.add(grid);
    gridRef.current = grid;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Lighting setup (CNC Studio Metal reflection)
    const ambient = new THREE.AmbientLight(0xFFFFFF, isLight ? 1.3 : 0.9);
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const keyLight = new THREE.DirectionalLight(0xE0F2FE, 2.2);
    keyLight.position.set(200, 300, 200);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93C5FD, 1.4);
    fillLight.position.set(-200, -100, -200);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38BDF8, 1.8);
    rimLight.position.set(0, 300, -300);
    scene.add(rimLight);

    // Group for bend markers
    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    scene.add(markersGroup);

    // 5. Build Tube & Centerline
    rebuildTubeGeometry(centerline, tubeOdMm, bends);

    // 6. Animation loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (autoRotate) {
        cameraAngle.current.theta += 0.008;
        updateCameraPosition();
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Mouse orbit listeners
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMousePos.current.x;
      const dy = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      cameraAngle.current.theta -= dx * 0.008;
      cameraAngle.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cameraAngle.current.phi + dy * 0.008));
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAngle.current.radius = Math.max(80, Math.min(2000, cameraAngle.current.radius + e.deltaY * 0.8));
      updateCameraPosition();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      domEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Update scene when theme changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const isLight = theme === "light";
    sceneRef.current.background = new THREE.Color(isLight ? "#F8FAFC" : "#080D18");

    if (gridRef.current) {
      sceneRef.current.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      const newGrid = new THREE.GridHelper(
        600,
        30,
        isLight ? 0xCBD5E1 : 0x1E2E4A,
        isLight ? 0xE2E8F0 : 0x131E33
      );
      newGrid.position.y = -100;
      sceneRef.current.add(newGrid);
      gridRef.current = newGrid;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = isLight ? 1.3 : 0.9;
    }
  }, [theme]);

  // Update geometry when centerline, OD, bends, or toggles change
  useEffect(() => {
    rebuildTubeGeometry(centerline, tubeOdMm, bends);
  }, [centerline, tubeOdMm, bends, wireframe, showCenterline, showMarkers, showBBox, showHeightDim, theme]);

  function updateCameraPosition() {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngle.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  }

  function setView(view) {
    setActiveView(view);
    setAutoRotate(false);
    const r = cameraAngle.current.radius;
    if (view === "iso") {
      cameraAngle.current.theta = Math.PI / 4;
      cameraAngle.current.phi = Math.PI / 3;
    } else if (view === "top") {
      cameraAngle.current.theta = 0;
      cameraAngle.current.phi = 0.05;
    } else if (view === "front") {
      cameraAngle.current.theta = 0;
      cameraAngle.current.phi = Math.PI / 2;
    } else if (view === "side") {
      cameraAngle.current.theta = Math.PI / 2;
      cameraAngle.current.phi = Math.PI / 2;
    }
    updateCameraPosition();
  }

  function rebuildTubeGeometry(points, od, bendsList) {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old tube
    if (tubeMeshRef.current) {
      scene.remove(tubeMeshRef.current);
      tubeMeshRef.current.geometry.dispose();
      tubeMeshRef.current = null;
    }
    // Clear old centerline
    if (centerlineLineRef.current) {
      scene.remove(centerlineLineRef.current);
      centerlineLineRef.current.geometry.dispose();
      centerlineLineRef.current = null;
    }
    // Clear markers
    if (markersGroupRef.current) {
      while (markersGroupRef.current.children.length > 0) {
        const obj = markersGroupRef.current.children[0];
        markersGroupRef.current.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }
    }
    // Clear bounding box helper
    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }
    // Clear height dimension visual
    if (heightDimGroupRef.current) {
      scene.remove(heightDimGroupRef.current);
      heightDimGroupRef.current = null;
    }

    if (!points || points.length < 2) return;

    // Map backend coordinates: (X=width, Y=length, Z=height) -> Three.js (X=x, Y=height [Z in backend], Z=length [Y in backend])
    const pts = points.map((p) => new THREE.Vector3(p[0], p[2], p[1]));
    const bbox = new THREE.Box3().setFromPoints(pts);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    pts.forEach((p) => p.sub(center));

    // Centered bounding box
    const centeredBBox = new THREE.Box3().setFromPoints(pts);
    const size = new THREE.Vector3();
    centeredBBox.getSize(size);

    const hMm = Math.round(size.y);
    const hIn = (size.y / 25.4).toFixed(2);
    const wMm = Math.round(size.x);
    const lMm = Math.round(size.z);
    const is3D = hMm > 8;

    setEnvelope({
      width: wMm,
      length: lMm,
      height: hMm,
      heightIn: hIn,
      is3D: is3D
    });

    // Smooth 3D spline
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.15);

    // 1. Create Extruded Tube Geometry
    const radius = Math.max(2, od / 2);
    const tubularSegments = Math.max(64, pts.length * 16);
    const radialSegments = 32;
    const tubeGeo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x94A3B8,
      metalness: 0.88,
      roughness: 0.22,
      wireframe: wireframe,
      side: THREE.DoubleSide
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);
    tubeMeshRef.current = tubeMesh;

    // 2. Create Centerline overlay line
    if (showCenterline) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(tubularSegments));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x06B6D4,
        linewidth: 3,
        transparent: true,
        opacity: 0.95
      });
      const centerLine = new THREE.Line(lineGeo, lineMat);
      scene.add(centerLine);
      centerlineLineRef.current = centerLine;
    }

    // 3. Create 3D Bend Highlights & Indicators
    if (showMarkers && bendsList && bendsList.length > 0) {
      bendsList.forEach((b, idx) => {
        let bendPos = new THREE.Vector3(0, 0, 0);
        if (b.center) {
          bendPos.set(b.center[0], b.center[2], b.center[1]).sub(center);
        } else {
          const t = Math.min(0.95, (idx + 1) / (bendsList.length + 1));
          bendPos = curve.getPointAt(t);
        }

        // Glowing sphere marker
        const markerGeo = new THREE.SphereGeometry(radius * 0.75, 16, 16);
        const markerMat = new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0x10B981 : 0xF59E0B,
          emissive: idx % 2 === 0 ? 0x059669 : 0xD97706,
          emissiveIntensity: 0.6,
          roughness: 0.3
        });
        const markerMesh = new THREE.Mesh(markerGeo, markerMat);
        markerMesh.position.copy(bendPos);
        markersGroupRef.current.add(markerMesh);

        // Ring indicator around bend
        const ringGeo = new THREE.TorusGeometry(radius * 1.5, radius * 0.15, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x06B6D4, wireframe: true });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(bendPos);
        markersGroupRef.current.add(ringMesh);
      });
    }

    // 4. Optional 3D Bounding Envelope Wireframe Box Helper
    if (showBBox) {
      const boxHelper = new THREE.Box3Helper(centeredBBox, 0x38BDF8);
      scene.add(boxHelper);
      boxHelperRef.current = boxHelper;
    }

    // 5. Visual Vertical Height Dimension Line Bracket & Callout (3rd Axis)
    if (showHeightDim && is3D) {
      const dimGroup = new THREE.Group();
      const offset = radius * 2.5 + 20;
      const dimX = centeredBBox.min.x - offset;
      const dimZ = centeredBBox.min.z;
      const minY = centeredBBox.min.y;
      const maxY = centeredBBox.max.y;

      // Vertical measurement guide line
      const linePts = [
        new THREE.Vector3(dimX, minY, dimZ),
        new THREE.Vector3(dimX, maxY, dimZ)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x06B6D4, linewidth: 2 });
      dimGroup.add(new THREE.Line(lineGeo, lineMat));

      // Horizontal ticks at bottom and top
      const tickHalf = 10;
      const botPts = [
        new THREE.Vector3(dimX - tickHalf, minY, dimZ),
        new THREE.Vector3(dimX + tickHalf, minY, dimZ)
      ];
      dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(botPts), lineMat));

      const topPts = [
        new THREE.Vector3(dimX - tickHalf, maxY, dimZ),
        new THREE.Vector3(dimX + tickHalf, maxY, dimZ)
      ];
      dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(topPts), lineMat));

      // Canvas text badge for height
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 70;
      const ctx = canvas.getContext("2d");
      const isLight = theme === "light";
      ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(10, 18, 35, 0.92)";
      ctx.strokeStyle = isLight ? "#0284C7" : "#06B6D4";
      ctx.lineWidth = 3;
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, 320, 70, 10);
      } else {
        ctx.rect(0, 0, 320, 70);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 24px monospace";
      ctx.fillStyle = isLight ? "#0369A1" : "#38BDF8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`↕ Height (Z): ${hMm}mm (${hIn}")`, 160, 35);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(dimX - 25, (minY + maxY) / 2, dimZ);
      sprite.scale.set(70, 16, 1);
      dimGroup.add(sprite);

      scene.add(dimGroup);
      heightDimGroupRef.current = dimGroup;
    }

    // Adjust camera radius based on part size
    const maxDim = Math.max(size.x, size.y, size.z, 200);
    cameraAngle.current.radius = maxDim * 2.2;
    updateCameraPosition();
  }

  const cleanPartName = (partName || "Technical Model")
    .replace(/Universal Precision Drawing Brain/gi, "Technical Drawing")
    .replace(/Universal Drawing/gi, "Drawing")
    .replace(/\(\d+\s*Bends?\s*Detected\)/gi, "")
    .trim();

  return (
    <div className="viewport-card">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="three-canvas-container" />

      {/* Top Bar: Part Info & Camera Orientation View Selector (Non-Overlapping Flex Layout) */}
      <div className="viewer-top-bar">
        <div className="viewer-part-info">
          <div className="part-name-tag">{cleanPartName}</div>
          <div className="part-meta-chips">
            <span className="meta-chip">Ø{tubeOdMm}mm</span>
            <span className="meta-chip">{bends.length} {bends.length === 1 ? "Bend" : "Bends"}</span>
            <span className="meta-chip">
              {envelope.is3D ? "3D Multi-Plane" : "Flat 2D"}
            </span>
            {envelope.width > 0 && (
              <span className="meta-chip dimensions">
                {envelope.width} × {envelope.length} {envelope.is3D ? `× ${envelope.height}` : ""} mm
              </span>
            )}
          </div>
        </div>

        {/* Camera View Presets */}
        <div className="viewport-views-selector">
          {["iso", "top", "front", "side"].map((view) => (
            <button
              key={view}
              className={`view-chip ${activeView === view ? "active" : ""}`}
              onClick={() => setView(view)}
              title={`Switch to ${view.toUpperCase()} view`}
            >
              {view.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Subtle 3D Interaction Hint */}
      <div style={{
        position: "absolute",
        bottom: 10,
        right: 12,
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        background: "var(--bg-surface-glass)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: "3px 8px",
        pointerEvents: "none",
        zIndex: 10
      }}>
        Drag to rotate &bull; Scroll to zoom
      </div>
    </div>
  );
}
