import * as THREE from 'three';

// PolarGrid: Visualizes the polar coordinate system in 3D
// This helps understand how we convert from polar (r, theta) to cartesian (x, z)
export class PolarGrid {
    private group: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
    }

    create(radius: number, divisions: number) {
        // Clear existing grid
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.5
        });

        // Create concentric circles (radius lines)
        const radiusSteps = 5;
        for (let i = 1; i <= radiusSteps; i++) {
            const r = (radius / radiusSteps) * i;
            const points = [];

            for (let j = 0; j <= divisions; j++) {
                const theta = (j / divisions) * Math.PI * 2;
                const x = r * Math.cos(theta);
                const z = r * Math.sin(theta);
                points.push(new THREE.Vector3(x, 0, z));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const circle = new THREE.Line(geometry, material);
            this.group.add(circle);
        }

        // Create radial lines (angle divisions)
        for (let i = 0; i < divisions; i++) {
            const theta = (i / divisions) * Math.PI * 2;
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(
                    radius * Math.cos(theta),
                    0,
                    radius * Math.sin(theta)
                )
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.group.add(line);
        }
    }

    show() {
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }
}
