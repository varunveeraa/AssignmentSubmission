import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Annotation } from '../types/annotation';
import { POINT_CLOUD, ANNOTATION_MARKER, CAMERA, SCENE, LIGHTS } from '../constants';
import { generateLionPointCloud } from '../utils/pointCloudGenerator';

interface PotreeViewerProps {
    annotations: Annotation[];
    selectedAnnotation: string | null;
    onPointClick: (position: { x: number; y: number; z: number }) => void;
    onAnnotationClick: (id: string) => void;
    annotateMode: boolean;
}

// Create a sample point cloud (lion-like shape)
function createSamplePointCloud(scene: THREE.Scene, pointCloudRef: React.MutableRefObject<THREE.Points | null>) {
    const numPoints = POINT_CLOUD.NUM_POINTS;

    const { positions, colors } = generateLionPointCloud(numPoints);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: POINT_CLOUD.POINT_SIZE,
        vertexColors: true,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);

    // Rotate to face camera better if needed, or adjust camera
    // My generator aligns body along Z, so lion faces Z (or -Z).
    // Let's rotate it so it stands on XZ plane and faces X or something standard.
    // The generator produces:
    // Body along Z (horizontal?)
    // Legs -Y relative to body?
    // Let's check generator axis: 
    // Cylinder rot PI/2 on X -> Aligned with Z? No. Cyl default is Y. Rot on X makes it Z. Correct.
    // Legs pos y = -0.6. So "up" is Y.
    // So it stands UP on Y axis.

    // Scale the lion to be bigger as requested
    points.scale.set(SCENE.LION_SCALE, SCENE.LION_SCALE, SCENE.LION_SCALE);

    // Raise the lion so it stands on the grid
    points.position.y = SCENE.LION_Y_OFFSET;

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
    annotateMode,
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

            // Clean up Three.js resources to prevent memory leaks
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((m: THREE.Material) => m.dispose());
                        } else {
                            (object.material as THREE.Material).dispose();
                        }
                    }
                }
            });

            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
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
    const mouseStartRef = useRef<{ x: number; y: number } | null>(null);

    // Track mouse down to detect drags vs clicks
    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        mouseStartRef.current = { x: event.clientX, y: event.clientY };
    }, []);

    // Handle click events (only if not a drag)
    const handleMouseUp = useCallback((event: React.MouseEvent) => {
        if (!containerRef.current || !cameraRef.current || !sceneRef.current || !mouseStartRef.current) return;

        // Calculate distance moved
        const deltaX = Math.abs(event.clientX - mouseStartRef.current.x);
        const deltaY = Math.abs(event.clientY - mouseStartRef.current.y);
        const DRAG_THRESHOLD = SCENE.DRAG_THRESHOLD;

        mouseStartRef.current = null; // Reset

        // If moved more than threshold, it's a drag (rotate/pan) - ignore click
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            return;
        }

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
        if (pointCloudRef.current && annotateMode) { // Only allow creating annotations in annotate mode
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
    }, [onPointClick, onAnnotationClick, annotateMode]);

    return (
        <div className="potree-viewer-container">
            <div
                ref={containerRef}
                className={`potree-viewer ${annotateMode ? 'annotate-mode' : 'explore-mode'}`}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                role="application"
                aria-label="3D Point Cloud Viewer - Click to add annotations"
                tabIndex={0}
            />
            <div className="viewer-instructions" aria-live="polite">
                <p>🔄 Drag to rotate • Scroll to zoom • Right-click to pan</p>
                {annotateMode ? (
                    <p className="annotate-hint">✏️ Click on the lion to add an annotation</p>
                ) : (
                    <p className="explore-hint">👁️ Exploring mode — use the toggle above to annotate</p>
                )}
            </div>
        </div>
    );
}
