import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Annotation } from '../types/annotation';
import { POINT_CLOUD, ANNOTATION_MARKER, CAMERA, SCENE, LIGHTS } from '../constants';

interface PotreeViewerProps {
    annotations: Annotation[];
    selectedAnnotation: string | null;
    onPointClick: (position: { x: number; y: number; z: number }) => void;
    onAnnotationClick: (id: string) => void;
}

// Create a sample point cloud (lion-like shape)
function createSamplePointCloud(scene: THREE.Scene, pointCloudRef: React.MutableRefObject<THREE.Points | null>) {
    const numPoints = POINT_CLOUD.NUM_POINTS;
    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    // Create a lion-like shape using parametric equations
    for (let i = 0; i < numPoints; i++) {
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI;
        const r = 2 + Math.random() * 0.5;

        // Body (elongated sphere)
        if (i < numPoints * 0.4) {
            positions[i * 3] = r * Math.sin(u) * Math.cos(t) * 1.5;
            positions[i * 3 + 1] = r * Math.sin(u) * Math.sin(t) * 0.8;
            positions[i * 3 + 2] = r * Math.cos(u);
        }
        // Head
        else if (i < numPoints * 0.6) {
            const headR = 1 + Math.random() * 0.3;
            positions[i * 3] = headR * Math.sin(u) * Math.cos(t) + 3;
            positions[i * 3 + 1] = headR * Math.sin(u) * Math.sin(t) + 0.5;
            positions[i * 3 + 2] = headR * Math.cos(u);
        }
        // Mane (fluffy around head)
        else if (i < numPoints * 0.8) {
            const maneR = 1.5 + Math.random() * 0.5;
            const angle = Math.random() * Math.PI * 2;
            positions[i * 3] = maneR * Math.cos(angle) + 3;
            positions[i * 3 + 1] = maneR * Math.sin(angle) + 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        // Legs
        else {
            const legIndex = Math.floor((i - numPoints * 0.8) / (numPoints * 0.05));
            const legX = legIndex < 2 ? -1 : 1;
            const legZ = legIndex % 2 === 0 ? 1.5 : -1.5;
            positions[i * 3] = legX + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = -1.5 + Math.random() * 1.5;
            positions[i * 3 + 2] = legZ + (Math.random() - 0.5) * 0.3;
        }

        // Golden/orange colors for lion
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.2 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: POINT_CLOUD.POINT_SIZE,
        vertexColors: true,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointCloudRef.current = points;
}

// Create annotation marker mesh
function createMarkerMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
        ANNOTATION_MARKER.SIZE,
        ANNOTATION_MARKER.SEGMENTS,
        ANNOTATION_MARKER.SEGMENTS
    );
    const material = new THREE.MeshPhongMaterial({
        color: ANNOTATION_MARKER.COLOR_DEFAULT,
        emissive: ANNOTATION_MARKER.COLOR_DEFAULT,
        emissiveIntensity: ANNOTATION_MARKER.EMISSIVE_INTENSITY,
        transparent: true,
        opacity: ANNOTATION_MARKER.OPACITY,
    });
    return new THREE.Mesh(geometry, material);
}

// Update annotation markers in the scene
function updateAnnotationMarkers(
    scene: THREE.Scene,
    annotations: Annotation[],
    selectedAnnotation: string | null,
    markersRef: React.MutableRefObject<Map<string, THREE.Mesh>>
) {
    const existingMarkers = markersRef.current;

    // Remove markers that no longer exist
    existingMarkers.forEach((marker, id) => {
        if (!annotations.find(a => a.id === id)) {
            scene.remove(marker);
            existingMarkers.delete(id);
        }
    });

    // Add or update markers
    annotations.forEach(annotation => {
        let marker = existingMarkers.get(annotation.id);

        if (!marker) {
            marker = createMarkerMesh();
            marker.userData.annotationId = annotation.id;
            scene.add(marker);
            existingMarkers.set(annotation.id, marker);
        }

        // Update position
        marker.position.set(
            annotation.position.x,
            annotation.position.y,
            annotation.position.z
        );

        // Highlight selected
        const material = marker.material as THREE.MeshPhongMaterial;
        if (selectedAnnotation === annotation.id) {
            material.color.setHex(ANNOTATION_MARKER.COLOR_SELECTED);
            material.emissive.setHex(ANNOTATION_MARKER.COLOR_SELECTED);
            marker.scale.setScalar(ANNOTATION_MARKER.SCALE_SELECTED);
        } else {
            material.color.setHex(ANNOTATION_MARKER.COLOR_DEFAULT);
            material.emissive.setHex(ANNOTATION_MARKER.COLOR_DEFAULT);
            marker.scale.setScalar(ANNOTATION_MARKER.SCALE_DEFAULT);
        }
    });
}

export function PotreeViewer({
    annotations,
    selectedAnnotation,
    onPointClick,
    onAnnotationClick,
}: PotreeViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const pointCloudRef = useRef<THREE.Points | null>(null);
    const annotationMarkersRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(SCENE.BACKGROUND_COLOR);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            CAMERA.FOV,
            width / height,
            CAMERA.NEAR,
            CAMERA.FAR
        );
        camera.position.set(CAMERA.POSITION.x, CAMERA.POSITION.y, CAMERA.POSITION.z);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = CAMERA.DAMPING_FACTOR;
        controls.minDistance = CAMERA.MIN_DISTANCE;
        controls.maxDistance = CAMERA.MAX_DISTANCE;
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, LIGHTS.AMBIENT_INTENSITY);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, LIGHTS.DIRECTIONAL_INTENSITY);
        directionalLight.position.set(
            LIGHTS.DIRECTIONAL_POSITION.x,
            LIGHTS.DIRECTIONAL_POSITION.y,
            LIGHTS.DIRECTIONAL_POSITION.z
        );
        scene.add(directionalLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(
            SCENE.GRID_SIZE,
            SCENE.GRID_DIVISIONS,
            SCENE.GRID_COLOR_CENTER,
            SCENE.GRID_COLOR_GRID
        );
        scene.add(gridHelper);

        // Create sample point cloud (lion-like shape)
        createSamplePointCloud(scene, pointCloudRef);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;
            cameraRef.current.aspect = newWidth / newHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    // Update annotation markers - sync with scene
    useEffect(() => {
        if (!sceneRef.current) return;
        updateAnnotationMarkers(
            sceneRef.current,
            annotations,
            selectedAnnotation,
            annotationMarkersRef
        );
    }, [annotations, selectedAnnotation]);

    // Handle click events
    const handleClick = useCallback((event: React.MouseEvent) => {
        if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // First check for annotation marker clicks
        const markers = Array.from(annotationMarkersRef.current.values());
        const markerIntersects = raycasterRef.current.intersectObjects(markers);

        if (markerIntersects.length > 0) {
            const annotationId = markerIntersects[0].object.userData.annotationId;
            onAnnotationClick(annotationId);
            return;
        }

        // Then check for point cloud clicks
        if (pointCloudRef.current) {
            const pointIntersects = raycasterRef.current.intersectObject(pointCloudRef.current);

            if (pointIntersects.length > 0) {
                const point = pointIntersects[0].point;
                onPointClick({
                    x: point.x,
                    y: point.y,
                    z: point.z,
                });
            }
        }
    }, [onPointClick, onAnnotationClick]);

    return (
        <div className="potree-viewer-container">
            <div
                ref={containerRef}
                className="potree-viewer"
                onClick={handleClick}
                role="application"
                aria-label="3D Point Cloud Viewer - Click to add annotations"
                tabIndex={0}
            />
            <div className="viewer-instructions" aria-live="polite">
                <p>🖱️ Click on the point cloud to add annotations</p>
                <p>🔄 Drag to rotate • Scroll to zoom • Right-click to pan</p>
            </div>
        </div>
    );
}
