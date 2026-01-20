import * as THREE from 'three';

export class FourierVisualizer {
    private group: THREE.Group;
    private timePlane: THREE.Group;
    private frequencyPlane: THREE.Group;
    private sineWavesGroup: THREE.Group;
    private labelsGroup: THREE.Group;

    private complexWaveformLine!: THREE.Line;
    private depthArrow!: THREE.ArrowHelper;
    private hitArea: THREE.Mesh | null = null;
    private spectrumBars: THREE.Mesh[] = [];
    private sineWaves: THREE.Line[] = [];

    private readonly planeSize = 50;
    private readonly planeDistance = 60;
    private barCount: number = 48; // Initial default

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

    public updateBarCount(count: number) {
        if (this.barCount === count) return;
        this.barCount = count;
        this.clearComponents();
        this.setupComponents();
    }

    private clearComponents() {
        // Clear spectrum bars
        this.spectrumBars.forEach(bar => {
            this.frequencyPlane.remove(bar);
            bar.geometry.dispose();
            (bar.material as THREE.Material).dispose();
        });
        this.spectrumBars = [];

        // Clear sine waves
        this.sineWaves.forEach(wave => {
            this.sineWavesGroup.remove(wave);
            wave.geometry.dispose();
            (wave.material as THREE.Material).dispose();
        });
        this.sineWaves = [];
    }

    private setupPlanes() {
        // --- TIME PLANE (Red Frame) ---
        const timeFrameGeom = new THREE.BoxGeometry(this.planeSize, this.planeSize, 1);
        const timeFrameMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const timePlaneMesh = new THREE.Mesh(timeFrameGeom, timeFrameMat);

        // Red border/frame
        const timeEdgeGeom = new THREE.EdgesGeometry(timeFrameGeom);
        const timeEdgeMat = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 3 });
        const timeEdges = new THREE.LineSegments(timeEdgeGeom, timeEdgeMat);

        this.timePlane.add(timePlaneMesh);
        this.timePlane.add(timeEdges);

        // Hit area for dragging
        const hitGeom = new THREE.PlaneGeometry(this.planeSize, this.planeSize);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.hitArea = new THREE.Mesh(hitGeom, hitMat);
        this.hitArea.name = 'fourier-time-hit';
        this.timePlane.add(this.hitArea);

        // --- FREQUENCY PLANE (Blue Frame) ---
        const freqFrameGeom = new THREE.BoxGeometry(this.planeSize, this.planeSize, 1);
        const freqFrameMat = new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const freqPlaneMesh = new THREE.Mesh(freqFrameGeom, freqFrameMat);
        freqPlaneMesh.position.z = this.planeDistance;

        // Blue border/frame
        const freqEdgeGeom = new THREE.EdgesGeometry(freqFrameGeom);
        const freqEdgeMat = new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 3 });
        const freqEdges = new THREE.LineSegments(freqEdgeGeom, freqEdgeMat);
        freqEdges.position.z = this.planeDistance;

        this.frequencyPlane.add(freqPlaneMesh);
        this.frequencyPlane.add(freqEdges);

        // Grid helpers
        const gridHelperFront = new THREE.GridHelper(this.planeSize, 10, 0xff0000, 0x440000);
        gridHelperFront.rotation.x = Math.PI / 2;
        gridHelperFront.position.z = 0;
        this.timePlane.add(gridHelperFront);

        const gridHelperBack = new THREE.GridHelper(this.planeSize, 10, 0x0000ff, 0x000044);
        gridHelperBack.rotation.x = Math.PI / 2;
        gridHelperBack.position.z = this.planeDistance;
        this.frequencyPlane.add(gridHelperBack);
    }

    private setupComponents() {
        // Complex Waveform (Time Domain)
        const complexGeom = new THREE.BufferGeometry();
        const complexPositions = new Float32Array(512 * 3);
        complexGeom.setAttribute('position', new THREE.BufferAttribute(complexPositions, 3));
        const complexMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 3 }); // Vibrant Cyan for visibility
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
        // Gradient from Red (Bass) to Blue (Treble)
        const r = Math.floor((1 - ratio) * 255);
        const b = Math.floor(ratio * 255);
        return (r << 16) | b;
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

        // 3. Labels "TIME" and "FREQUENCY" - Moved to TOP for better visibility
        this.addTextLabel('TIME', 0xff0000, new THREE.Vector3(0, this.planeSize / 2 + 5, 0), this.timePlane);
        this.addTextLabel('FREQUENCY', 0x0000ff, new THREE.Vector3(0, this.planeSize / 2 + 5, this.planeDistance), this.frequencyPlane);
    }

    private addTextLabel(text: string, color: number, position: THREE.Vector3, parent: THREE.Group) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Increased resolution
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 512, 256);
        ctx.font = 'bold 80px Arial'; // Much bigger font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow for better legibility
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.strokeText(text, 256, 128);
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.fillText(text, 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(16, 8, 1); // Larger sprite
        sprite.position.copy(position);
        parent.add(sprite);
    }

    update(timeData: Uint8Array, freqData: Uint8Array, trackingPosition: THREE.Vector3, currentTime: number) {
        if (!this.group.visible) return;

        // Convert world tracking position to local coordinates of the fourier group
        const localTrackingPos = this.group.worldToLocal(trackingPosition.clone());

        // Move the front wall (Time Plane) to the tracking position - LOCK Y TO 0
        this.timePlane.position.set(localTrackingPos.x, 0, localTrackingPos.z);

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
                // STABLE ANIMATION: Use currentTime instead of Date.now() to stop vibrating when paused
                const waveY = Math.sin(t * frequency * Math.PI * 2 + currentTime * 5) * amp;

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

    getHitArea(): THREE.Mesh | null {
        return this.hitArea;
    }

    calculateProgressFromPoint(point: THREE.Vector3): number {
        const localPoint = this.group.worldToLocal(point.clone());
        // Z axis is the depth axis here
        let progress = localPoint.z / this.planeDistance;
        return Math.min(Math.max(progress, 0), 1);
    }
}
