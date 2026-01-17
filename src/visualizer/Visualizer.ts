import * as THREE from 'three';

export class Visualizer {
    public meshes: THREE.Mesh[] = [];
    private group: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
    }

    createVisualizerBars(count: number, radius: number) {
        // Clear existing bars first
        this.clear();

        // 1. Geometry
        // We use BoxGeometry for each bar.
        // Initial size: width, height, depth.
        // We'll scale the Y-axis (height) dynamically.
        // Note: To make scaling "grow up" from the floor, we would typically translate geometry,
        // but here we can just position the mesh at y = scale/2, or easier: scale usually happens from center.
        // For simplicity in this prompt, we scale from center and let it grow both ways, 
        // OR we can translate the geometry so the pivot is at the bottom.
        // Let's stick to simple center scaling but maybe shift positions up by scale/2 in the loop?
        // Actually, simpler: just let it grow from center (it will go below floor).
        // Better Optimization Tip: Translate the geometry buffer so the origin is at the bottom (y=0).
        const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        // Shift vertices so that y=0 is the bottom.
        geometry.translate(0, 0.5, 0);

        // 2. Material
        // Using MeshStandardMaterial for nice lighting response.
        // We clone for each bar later if we want unique dynamic colors per bar without attributes (simplest way for now).
        // Or we can use vertex colors, but individual materials are easier for beginners to grasp "one color per bar".
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.6
        });

        // 3. Distribution Loop
        for (let i = 0; i < count; i++) {
            // We clone the material so each bar can have its own color
            const material = baseMaterial.clone();
            const bar = new THREE.Mesh(geometry, material);

            // Theory Check: Polar to Cartesian Coordinates
            // We want to arrange bars in a circle.
            // Polar coordinates describe a point by an angle (theta) and a distance (radius).
            // Cartesian coordinates (x, z) are needed for Three.js.
            //
            // Conversion Formula:
            // x = r * cos(theta)
            // z = r * sin(theta)
            //
            // Calculate the angle for this specific bar.
            // We divide the full circle (2 * PI radians) by the total count.
            const theta = (i / count) * Math.PI * 2;

            const x = radius * Math.cos(theta);
            const z = radius * Math.sin(theta);

            // Position the bar
            bar.position.set(x, 0, z);

            // Position them in the circle facing outward (lookAt center)
            bar.lookAt(0, 0, 0);

            // Add to group and array
            this.group.add(bar);
            this.meshes.push(bar);
        }
    }

    clear() {
        this.meshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                (mesh.material as THREE.Material).dispose();
            }
            this.group.remove(mesh);
        });
        this.meshes = [];
    }
}
