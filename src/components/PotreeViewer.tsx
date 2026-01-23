import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Potree, PointCloudOctree } from 'potree-core';
import type { Annotation } from '../types/annotation';
import { ANNOTATION_MARKER, CAMERA, SCENE, LIGHTS } from '../constants';

interface PotreeViewerProps {
    annotations: Annotation[];
    selectedAnnotation: string | null;
    onPointClick: (position: { x: number; y: number; z: number }) => void;
    onAnnotationClick: (id: string) => void;
    annotateMode: boolean;
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
    const potreeRef = useRef<Potree | null>(null);
    const pointCloudsRef = useRef<PointCloudOctree[]>([]);
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

        // Potree Initialization
        const potree = new Potree();
        potree.pointBudget = 2_000_000;
        potreeRef.current = potree;

        console.log('Starting Potree load...');

        potree.loadPointCloud(
            'metadata.json',
            '/potree-data/pointclouds/lion/'
        ).then((pco: PointCloudOctree) => {
            console.log('Potree: Point cloud loaded!', pco);
            const pointcloud = pco;
            const material = pointcloud.material;

            material.size = 1;
            material.pointSizeType = 2; // Adaptive
            material.shape = 0; // Square
            material.activeAttributeName = 'rgba';

            // Fix orientation: Potree data is often Z-up, Three.js is Y-up
            pointcloud.rotation.x = -Math.PI / 2;

            scene.add(pointcloud);
            pointCloudsRef.current = [pointcloud];

            if (pointcloud.boundingBox) {
                // Update matrix to account for rotation
                pointcloud.updateMatrixWorld(true);

                const center = pointcloud.boundingBox.getCenter(new THREE.Vector3());
                const size = pointcloud.boundingBox.getSize(new THREE.Vector3());

                // We need the world center for the camera
                const centerWorld = center.clone().applyMatrix4(pointcloud.matrixWorld);

                console.log('Potree: Bounding Box Center', center);
                console.log('Potree: World Center', centerWorld);
                console.log('Potree: Bounding Box Size', size);

                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraZ *= 2.0;

                controls.target.copy(centerWorld);

                // Position camera based on transformed center
                camera.position.set(
                    centerWorld.x,
                    centerWorld.y + size.y, // Look from slightly above
                    centerWorld.z + cameraZ
                );
                camera.lookAt(centerWorld);
                controls.update();

                console.log('Potree: Camera set to', camera.position);
            }
        }).catch(err => console.error('Potree: loadPointCloud failed:', err));

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            if (potreeRef.current && pointCloudsRef.current.length > 0) {
                potreeRef.current.updatePointClouds(
                    pointCloudsRef.current,
                    camera,
                    renderer
                );
            }

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

            // Clean up
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

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        mouseStartRef.current = { x: event.clientX, y: event.clientY };
    }, []);

    const handleMouseUp = useCallback((event: React.MouseEvent) => {
        if (!containerRef.current || !cameraRef.current || !sceneRef.current || !mouseStartRef.current) return;

        const deltaX = Math.abs(event.clientX - mouseStartRef.current.x);
        const deltaY = Math.abs(event.clientY - mouseStartRef.current.y);
        const DRAG_THRESHOLD = SCENE.DRAG_THRESHOLD;

        mouseStartRef.current = null;

        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // Check markers intersection
        const markers = Array.from(annotationMarkersRef.current.values());
        const markerIntersects = raycasterRef.current.intersectObjects(markers);

        if (markerIntersects.length > 0) {
            const annotationId = markerIntersects[0].object.userData.annotationId;
            onAnnotationClick(annotationId);
            return;
        }

        // Check point cloud intersection
        // Note: Generic raycaster might not hit Potree Octree perfectly without using potree's own raycasting
        // But PointCloudOctree inherits from Object3D, Three's raycaster *can* hit bounding boxes or points if visible
        // potree-core doesn't expose a simple high-level intersection method easily, 
        // we might need to rely on Three.js standard raycast against the loaded points.
        // If the points are standard THREE.Points inside the octree nodes, it should work.

        if (pointCloudsRef.current.length > 0 && annotateMode) {
            // Traverse to find all Points objects
            const pointsObjects: THREE.Points[] = [];
            pointCloudsRef.current.forEach(pco => {
                pco.traverse((child) => {
                    if (child.type === 'Points') {
                        pointsObjects.push(child as THREE.Points);
                    }
                });
            });

            // If traversal didn't find them (because they load dynamically), we might need to raycast against the whole group
            // However, raycasting against massive point clouds is slow. 
            // For now, let's try intersecting the root octree object.
            const intersects = raycasterRef.current.intersectObjects(pointCloudsRef.current, true);

            if (intersects.length > 0) {
                // Filter for points only?
                // The intersect object will be one of the loaded nodes
                const point = intersects[0].point;
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
                    <p className="annotate-hint">✏️ Click on the point cloud to add an annotation</p>
                ) : (
                    <p className="explore-hint">👁️ Exploring mode — use the toggle above to annotate</p>
                )}
            </div>
        </div>
    );
}
