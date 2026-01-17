import * as THREE from 'three';

export class FourierVisualizer {
    private group: THREE.Group;
    private timePlane: THREE.Group;
    private frequencyPlane: THREE.Group;
    private sineWavesGroup: THREE.Group;
    private labelsGroup: THREE.Group;

    private complexWaveformLine!: THREE.Line;
    private depthArrow!: THREE.ArrowHelper;
    private spectrumBars: THREE.Mesh[] = [];
    private sineWaves: THREE.Line[] = [];

    private readonly planeSize = 50;
    private readonly planeDistance = 60;
    private readonly barCount = 48;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();
        scene.add(this.group);

        this.timePlane = new THREE.Group();
        this.frequencyPlane = new THREE.Group();
        this.sineWavesGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();

        this.group.add(this.timePlane);
        this.group.add(this.frequencyPlane);
        this.group.add(this.sineWavesGroup);
        this.group.add(this.labelsGroup);

        this.setupPlanes();
        this.setupComponents();
        this.setupLabels();

        this.hide();
    }

    private setupPlanes() {
        // Vertical walls receding into depth (Z-axis)
        const planeGeom = new THREE.PlaneGeometry(this.planeSize, this.planeSize);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        // Time Plane (Front Wall at Z = 0)
        const timePlaneMesh = new THREE.Mesh(planeGeom, planeMat);
        timePlaneMesh.position.z = 0;
        this.timePlane.add(timePlaneMesh);

        // Frequency Plane (Back Wall at Z = Depth)
        const freqPlaneMesh = new THREE.Mesh(planeGeom, planeMat);
        freqPlaneMesh.position.z = this.planeDistance;
        this.frequencyPlane.add(freqPlaneMesh);

        // Grid helpers (rotated to be vertical walls)
        const gridHelperFront = new THREE.GridHelper(this.planeSize, 20, 0x444444, 0x222222);
        gridHelperFront.rotation.x = Math.PI / 2;
        gridHelperFront.position.z = 0;
        this.timePlane.add(gridHelperFront);

        const gridHelperBack = new THREE.GridHelper(this.planeSize, 20, 0x444444, 0x222222);
        gridHelperBack.rotation.x = Math.PI / 2;
        gridHelperBack.position.z = this.planeDistance;
        this.frequencyPlane.add(gridHelperBack);
    }

    private setupComponents() {
        // Complex Waveform (Time Domain)
        const complexGeom = new THREE.BufferGeometry();
        const complexPositions = new Float32Array(512 * 3);
        complexGeom.setAttribute('position', new THREE.BufferAttribute(complexPositions, 3));
        const complexMat = new THREE.LineBasicMaterial({ color: 0x8800ff, linewidth: 3 }); // Purple highlight
        this.complexWaveformLine = new THREE.Line(complexGeom, complexMat);
        this.timePlane.add(this.complexWaveformLine);

        // Spectrum Bars (Frequency Domain) - Thicker for the larger space
        const barGeom = new THREE.BoxGeometry(0.8, 1, 0.8);
        barGeom.translate(0, 0.5, 0);

        for (let i = 0; i < this.barCount; i++) {
            const color = this.getFrequencyColor(i);
            const barMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5
            });

            const bar = new THREE.Mesh(barGeom, barMat);
            const x = ((i / this.barCount) - 0.5) * this.planeSize;
            // Bars are centered vertically on the back wall floor
            bar.position.set(x, -this.planeSize / 2, this.planeDistance);
            this.frequencyPlane.add(bar);
            this.spectrumBars.push(bar);

            // Sine Waves (Connecting) - Multicolored per frequency band
            const sineGeom = new THREE.BufferGeometry();
            const sinePositions = new Float32Array(100 * 3);
            sineGeom.setAttribute('position', new THREE.BufferAttribute(sinePositions, 3));
            const sineMat = new THREE.LineBasicMaterial({
                color: color, // Frequency-band color
                transparent: true,
                opacity: 0.4
            });
            const sineLine = new THREE.Line(sineGeom, sineMat);
            this.sineWavesGroup.add(sineLine);
            this.sineWaves.push(sineLine);
        }
    }

    private getFrequencyColor(index: number): number {
        const ratio = index / this.barCount;
        if (ratio < 0.2) return 0xff4400; // Bass: Red/Orange
        if (ratio < 0.6) return 0xccff00; // Mids: Lime/Yellow
        return 0x00aaff; // Treble: Cyan/Blue
    }

    private setupLabels() {
        // Dynamic Depth Arrow Reference (Z-Axis connecting scanner to station)
        this.depthArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, -this.planeSize / 2, 0),
            this.planeDistance,
            0x00aaff
        );
        this.labelsGroup.add(this.depthArrow);

        // --- SCANNER INSTRUMENTATION (Attached to moving timePlane) ---

        // 1. Sky Blue Graph Axes (L-Shape) - Proper Graph Look
        // Vertical Y Axis (Amplitude)
        const verticalLabelAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(-this.planeSize / 2, -this.planeSize / 2, 0),
            this.planeSize,
            0x00ccff
        );
        this.timePlane.add(verticalLabelAxis);

        // Horizontal X Axis (Time)
        const horizontalLabelAxis = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-this.planeSize / 2, -this.planeSize / 2, 0),
            this.planeSize,
            0x00ccff
        );
        this.timePlane.add(horizontalLabelAxis);

        // 2. White Base Ring
        const ringGeom = new THREE.TorusGeometry(8, 0.05, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, -this.planeSize / 2, 0);
        this.timePlane.add(ring);
    }

    update(timeData: Uint8Array, freqData: Uint8Array, trackingPosition: THREE.Vector3) {
        if (!this.group.visible) return;

        // Convert world tracking position to local coordinates of the fourier group
        const localTrackingPos = this.group.worldToLocal(trackingPosition.clone());

        // Move the front wall (Time Plane) to the tracking position
        this.timePlane.position.copy(localTrackingPos);

        // Update Dynamic Depth Arrow
        this.depthArrow.position.set(0, -this.planeSize / 2, localTrackingPos.z);
        const remainingDist = this.planeDistance - localTrackingPos.z;
        this.depthArrow.setLength(remainingDist, 2, 1);

        // Update Complex Waveform (Relative to the moving timePlane)
        const positions = this.complexWaveformLine.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 512; i++) {
            const val = (timeData[i] / 128.0) - 1.0;
            const y = val * (this.planeSize / 2.5);
            const x = ((i / 512) - 0.5) * this.planeSize;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = 0; // Local Z is 0 on the plane
        }
        this.complexWaveformLine.geometry.attributes.position.needsUpdate = true;

        // Update Spectrum Bars & Moving Sine Waves
        const step = Math.floor(freqData.length / this.barCount);
        for (let i = 0; i < this.barCount; i++) {
            const val = freqData[i * step] / 255.0;
            const h = val * this.planeSize;
            this.spectrumBars[i].scale.y = Math.max(0.1, h);

            // Update Sine Wave (Stretch from tracking point to static bar)
            const sineLine = this.sineWaves[i];
            const sinePositions = sineLine.geometry.attributes.position.array as Float32Array;
            const xOffset = ((i / this.barCount) - 0.5) * this.planeSize;
            const frequency = (i + 1) * 2;

            // Start point (at tracking position on the model)
            const startX = localTrackingPos.x + xOffset;
            const startY = localTrackingPos.y;
            const startZ = localTrackingPos.z;

            // End point (at static bar on back wall)
            const endX = xOffset;
            const endY = -this.planeSize / 2;
            const endZ = this.planeDistance;

            for (let j = 0; j < 100; j++) {
                const t = j / 100;
                const x = startX + (endX - startX) * t;
                const yPos = startY + (endY - startY) * t;
                const z = startZ + (endZ - startZ) * t;

                // Amplitude projection along the path - scaled for larger space
                const amp = val * (this.planeSize / 3) * t;
                const waveY = Math.sin(t * frequency * Math.PI * 2 + Date.now() * 0.005) * amp;

                sinePositions[j * 3] = x;
                sinePositions[j * 3 + 1] = yPos + waveY;
                sinePositions[j * 3 + 2] = z;
            }
            sineLine.geometry.attributes.position.needsUpdate = true;

            // Optional: Dynamic emissive intensity based on value
            const bar = this.spectrumBars[i];
            (bar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + val * 0.7;
            (sineLine.material as THREE.LineBasicMaterial).opacity = 0.15 + val * 0.55;
        }
    }

    setPosition(x: number, y: number, z: number) {
        this.group.position.set(x, y, z);
    }

    setRotation(x: number, y: number, z: number) {
        this.group.rotation.set(x, y, z);
    }

    show() {
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }
}
