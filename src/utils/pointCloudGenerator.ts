
import * as THREE from 'three';

// Helper to get random point in sphere
function randomPointInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random()); // Uniform distribution inside
    const sinPhi = Math.sin(phi);
    return new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
    );
}

// Helper to get random point on sphere surface
function randomPointOnSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const sinPhi = Math.sin(phi);
    return new THREE.Vector3(
        radius * sinPhi * Math.cos(theta),
        radius * sinPhi * Math.sin(theta),
        radius * Math.cos(phi)
    );
}

// Helper to get random point in cylinder
function randomPointInCylinder(radius: number, height: number): THREE.Vector3 {
    const angle = Math.random() * 2 * Math.PI;
    const r = radius * Math.sqrt(Math.random());
    const y = (Math.random() - 0.5) * height;
    return new THREE.Vector3(
        r * Math.cos(angle),
        y,
        r * Math.sin(angle)
    );
}

// Helper to get random point in box
function randomPointInBox(width: number, height: number, depth: number): THREE.Vector3 {
    return new THREE.Vector3(
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height,
        (Math.random() - 0.5) * depth
    );
}

interface ShapeDef {
    type: 'sphere' | 'cylinder' | 'box';
    params: number[]; // sphere: [r], cylinder: [r, h], box: [w, h, d]
    position: [number, number, number];
    rotation?: [number, number, number]; // Euler angles
    color: [number, number, number]; // RGB
    weight: number; // Probability weight for sampling
}

export function generateLionPointCloud(numPoints: number): { positions: Float32Array, colors: Float32Array } {
    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    const bodyColor: [number, number, number] = [0.8, 0.6, 0.2];
    const maneColor: [number, number, number] = [0.4, 0.2, 0.05];
    const noseColor: [number, number, number] = [0.1, 0.1, 0.1];

    const shapes: ShapeDef[] = [
        // Main Body (Cylinder)
        {
            type: 'cylinder',
            params: [0.5, 1.8],
            position: [0, 0, 0],
            rotation: [Math.PI / 2, 0, 0], // Align with Z axis
            color: bodyColor,
            weight: 3.0
        },
        // Chest/Front Body (Sphere equivalent for smoother join)
        {
            type: 'sphere',
            params: [0.55],
            position: [0, 0, 0.7],
            color: bodyColor,
            weight: 1.0
        },
        // Back Body (Sphere)
        {
            type: 'sphere',
            params: [0.52],
            position: [0, 0, -0.7],
            color: bodyColor,
            weight: 1.0
        },
        // Head (Sphere)
        {
            type: 'sphere',
            params: [0.45],
            position: [0, 0.6, 1.2],
            color: bodyColor,
            weight: 1.5
        },
        // Mane (Larger Sphere/Disk)
        {
            type: 'sphere',
            params: [0.65],
            position: [0, 0.6, 1.1],
            color: maneColor,
            weight: 2.0
        },
        // Snout (Box)
        {
            type: 'box',
            params: [0.3, 0.25, 0.4],
            position: [0, 0.55, 1.55],
            color: bodyColor,
            weight: 0.5
        },
        // Nose Tip
        {
            type: 'sphere',
            params: [0.08],
            position: [0, 0.65, 1.75],
            color: noseColor,
            weight: 0.1
        },
        // Leg Front Left
        {
            type: 'cylinder',
            params: [0.15, 1.2],
            position: [0.35, -0.6, 0.8],
            color: bodyColor,
            weight: 0.5
        },
        // Leg Front Right
        {
            type: 'cylinder',
            params: [0.15, 1.2],
            position: [-0.35, -0.6, 0.8],
            color: bodyColor,
            weight: 0.5
        },
        // Leg Back Left
        {
            type: 'cylinder',
            params: [0.15, 1.2],
            position: [0.35, -0.6, -0.8],
            color: bodyColor,
            weight: 0.5
        },
        // Leg Back Right
        {
            type: 'cylinder',
            params: [0.15, 1.2],
            position: [-0.35, -0.6, -0.8],
            color: bodyColor,
            weight: 0.5
        },
        // Tail
        {
            type: 'cylinder',
            params: [0.08, 1.0],
            position: [0, 0.2, -1.3],
            rotation: [Math.PI / 4, 0, 0], // Stick up and out
            color: bodyColor,
            weight: 0.2
        },
        // Tail Tuft
        {
            type: 'sphere',
            params: [0.15],
            position: [0, 0.5, -1.6],
            color: maneColor,
            weight: 0.2
        }
    ];

    // Normalize weights
    const totalWeight = shapes.reduce((sum, s) => sum + s.weight, 0);

    // Generate points
    let currentPointIndex = 0;

    // Helper to rotate vector
    const rotateVector = (v: THREE.Vector3, rotation?: [number, number, number]) => {
        if (!rotation) return v;
        const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
        return v.applyEuler(euler);
    };

    // Distribute points based on weights
    for (const shape of shapes) {
        const count = Math.floor((shape.weight / totalWeight) * numPoints);

        for (let i = 0; i < count && currentPointIndex < numPoints; i++) {
            let p = new THREE.Vector3();

            // Generate local point
            if (shape.type === 'sphere') {
                // Use surface sampling mostly for definition, some volume
                if (Math.random() > 0.3) {
                    p = randomPointOnSphere(shape.params[0]);
                } else {
                    p = randomPointInSphere(shape.params[0]);
                }
            } else if (shape.type === 'cylinder') {
                p = randomPointInCylinder(shape.params[0], shape.params[1]);
            } else if (shape.type === 'box') {
                p = randomPointInBox(shape.params[0], shape.params[1], shape.params[2]);
            }

            // Apply rotation
            p = rotateVector(p, shape.rotation);

            // Apply position
            p.add(new THREE.Vector3(shape.position[0], shape.position[1], shape.position[2]));

            // Store position
            positions[currentPointIndex * 3] = p.x;
            positions[currentPointIndex * 3 + 1] = p.y;
            positions[currentPointIndex * 3 + 2] = p.z;

            // Store color (add some noise)
            const colorVar = (Math.random() - 0.5) * 0.1;
            colors[currentPointIndex * 3] = Math.min(1, Math.max(0, shape.color[0] + colorVar));
            colors[currentPointIndex * 3 + 1] = Math.min(1, Math.max(0, shape.color[1] + colorVar));
            colors[currentPointIndex * 3 + 2] = Math.min(1, Math.max(0, shape.color[2] + colorVar));

            currentPointIndex++;
        }
    }

    // Fill remaining if any
    while (currentPointIndex < numPoints) {
        // Just duplicate last valid point or 0,0,0
        positions[currentPointIndex * 3] = 0;
        positions[currentPointIndex * 3 + 1] = 0;
        positions[currentPointIndex * 3 + 2] = 0;
        colors[currentPointIndex * 3] = 0;
        colors[currentPointIndex * 3 + 1] = 0;
        colors[currentPointIndex * 3 + 2] = 0;
        currentPointIndex++;
    }

    return { positions, colors };
}
