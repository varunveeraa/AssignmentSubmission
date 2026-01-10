import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Annotation } from '../types/annotation';

interface PotreeViewerProps {
    annotations: Annotation[];
    selectedAnnotation: string | null;
    onPointClick: (position: { x: number; y: number; z: number }) => void;
    onAnnotationClick: (id: string) => void;
}

// Create a sample point cloud (since we can't load LAZ directly without more setup)
function createSamplePointCloud(scene: THREE.Scene, pointCloudRef: React.MutableRefObject<THREE.Points | null>) {
    const numPoints = 100000;
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
        size: 0.05,
        vertexColors: true,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointCloudRef.current = points;
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
    const [sceneReady, setSceneReady] = useState(false);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(5, 5, 5);
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
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
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

        // Mark scene as ready to trigger annotation rendering
        setSceneReady(true);

        return () => {
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    // Update annotation markers - runs when scene is ready or annotations change
    useEffect(() => {
        if (!sceneReady) return;
        if (!sceneRef.current) return;

        const scene = sceneRef.current;
        const existingMarkers = annotationMarkersRef.current;

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
                // Create new marker
                const geometry = new THREE.SphereGeometry(0.15, 16, 16);
                const material = new THREE.MeshPhongMaterial({
                    color: 0x00ff88,
                    emissive: 0x00ff88,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.9,
                });
                marker = new THREE.Mesh(geometry, material);
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
                material.color.setHex(0xff4488);
                material.emissive.setHex(0xff4488);
                marker.scale.setScalar(1.5);
            } else {
                material.color.setHex(0x00ff88);
                material.emissive.setHex(0x00ff88);
                marker.scale.setScalar(1);
            }
        });
    }, [sceneReady, annotations, selectedAnnotation]);

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
            />
            <div className="viewer-instructions">
                <p>🖱️ Click on the point cloud to add annotations</p>
                <p>🔄 Drag to rotate • Scroll to zoom • Right-click to pan</p>
            </div>
        </div>
    );
}
