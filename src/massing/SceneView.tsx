import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SNAPSHOT_MAX_EDGE, SNAPSHOT_QUALITY } from "./config";
import { MM_TO_SCENE } from "./geometry";

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface Props {
  group: THREE.Group;
  interior: boolean;
  eyeHeightMm: number;
  // Bumped by the parent when the camera should re-frame (new concept, or a
  // camera-mode switch) — deliberately NOT on every slider tick, which would
  // yank the view out from under the designer mid-drag.
  frameKey: number;
  snapshotRef?: MutableRefObject<(() => string | null) | null>;
  // Viewport height as a fraction of its width.
  aspect?: number;
  // Set to drive this view's camera from outside (linked side-by-side views).
  camera?: CameraState | null;
  onCameraChange?: (c: CameraState) => void;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
}

export function SceneView({
  group,
  interior,
  eyeHeightMm,
  frameKey,
  snapshotRef,
  aspect = 0.68,
  camera: externalCamera = null,
  onCameraChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const renderRef = useRef<() => void>(() => {});
  // Guards the camera-link feedback loop: while applying an external camera,
  // the resulting "change" event must not be echoed back out.
  const applyingRef = useRef(false);
  const cameraChangeRef = useRef(onCameraChange);
  cameraChangeRef.current = onCameraChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f2f2f0");

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    camera.position.set(0.4, 0.3, 0.6);

    // preserveDrawingBuffer is what makes the snapshot work for the render pane.
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-1.5, 0.5, -1);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    // Damping would need a continuous animation loop; several of these views
    // run side by side in prototype 7, so they render on demand instead.
    controls.enableDamping = false;

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    rendererRef.current = renderer;

    let queued = false;
    const requestRender = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderer.render(scene, camera);
      });
    };
    renderRef.current = requestRender;

    const onControlsChange = () => {
      requestRender();
      if (!applyingRef.current && cameraChangeRef.current) {
        cameraChangeRef.current({
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [controls.target.x, controls.target.y, controls.target.z],
        });
      }
    };
    controls.addEventListener("change", onControlsChange);

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = Math.max(180, Math.round(w * aspect));
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestRender();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (snapshotRef) {
      snapshotRef.current = () => {
        const grid = gridRef.current;
        const wasVisible = grid?.visible ?? false;
        // The grid would read as an invented floor to the image model.
        if (grid) grid.visible = false;
        renderer.render(scene, camera);
        const source = renderer.domElement;
        if (grid) grid.visible = wasVisible;

        // A full-size canvas is several megabytes of base64, which the image
        // API rejects; downscale and send JPEG instead.
        const longest = Math.max(source.width, source.height);
        const scale = longest > SNAPSHOT_MAX_EDGE ? SNAPSHOT_MAX_EDGE / longest : 1;
        if (scale === 1) return source.toDataURL("image/jpeg", SNAPSHOT_QUALITY);

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return source.toDataURL("image/jpeg", SNAPSHOT_QUALITY);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", SNAPSHOT_QUALITY);
      };
    }

    return () => {
      observer.disconnect();
      controls.removeEventListener("change", onControlsChange);
      if (snapshotRef) snapshotRef.current = null;
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [snapshotRef, aspect]);

  // Swap in new geometry whenever the parameters rebuild it.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const previous = groupRef.current;
    if (previous) {
      scene.remove(previous);
      disposeGroup(previous);
    }
    group.scale.setScalar(MM_TO_SCENE);
    scene.add(group);
    groupRef.current = group;
    renderRef.current();
  }, [group]);

  // Re-frame only on an explicit frameKey change.
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const scene = sceneRef.current;
    if (!camera || !controls || !scene || !groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.05);

    if (gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.dispose();
      gridRef.current = null;
    }

    applyingRef.current = true;
    if (interior) {
      const eyeY = box.min.y + eyeHeightMm * MM_TO_SCENE;
      camera.near = 0.01;
      camera.far = Math.max(50, radius * 40);
      camera.position.set(center.x, eyeY, center.z + size.z * 0.15);
      controls.target.set(center.x, eyeY, center.z - Math.max(0.5, size.z * 0.3));
      controls.minDistance = 0.05;
      controls.maxDistance = Math.max(1, radius);
    } else {
      camera.near = radius / 100;
      camera.far = radius * 60;
      camera.position.set(
        center.x + radius * 1.5,
        center.y + radius * 1.0,
        center.z + radius * 1.9
      );
      controls.target.copy(center);
      controls.minDistance = radius * 0.3;
      controls.maxDistance = radius * 12;

      const grid = new THREE.GridHelper(radius * 8, 20, 0xcccccc, 0xe4e4e4);
      grid.position.set(center.x, box.min.y - radius * 0.02, center.z);
      scene.add(grid);
      gridRef.current = grid;
    }

    camera.updateProjectionMatrix();
    controls.update();
    applyingRef.current = false;
    renderRef.current();
  }, [frameKey, interior, eyeHeightMm]);

  // Follow a linked view's camera.
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !externalCamera) return;

    applyingRef.current = true;
    camera.position.set(...externalCamera.position);
    controls.target.set(...externalCamera.target);
    controls.update();
    applyingRef.current = false;
    renderRef.current();
  }, [externalCamera]);

  return <div className="massing-viewport" ref={containerRef} />;
}
