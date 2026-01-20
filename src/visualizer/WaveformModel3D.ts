import * as THREE from 'three';

// WaveformModel3D: Dynamic animated waveform with playback visualization
export class WaveformModel3D {
    private group: THREE.Group;
    private waveformLine: THREE.Line | null = null;
    private hitArea: THREE.Mesh | null = null;
    private progressIndicator: THREE.Mesh | null = null;
    private audioBuffer: AudioBuffer | null = null;
    private infoPanel: HTMLDivElement;
    private graphCanvas: HTMLCanvasElement;
    private graphCtx: CanvasRenderingContext2D;
    private spreadFactor: number = 1.0;
    private isPlaying: boolean = false;

    constructor(scene: THREE.Scene) {
        this.group = new THREE.Group();
        scene.add(this.group);

        // Create info panel
        this.infoPanel = this.createInfoPanel();

        // Create 2D graph canvas
        const { canvas, ctx } = this.createGraphCanvas();
        this.graphCanvas = canvas;
        this.graphCtx = ctx;
    }

    private createInfoPanel(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '350px';
        panel.style.left = '10px';
        panel.style.padding = '15px';
        panel.style.background = 'rgba(0, 0, 0, 0.95)';
        panel.style.color = '#00ff00';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '13px';
        panel.style.border = '2px solid #00ff00';
        panel.style.borderRadius = '8px';
        panel.style.zIndex = '1000';
        panel.style.display = 'none';
        panel.style.minWidth = '280px';
        panel.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';
        document.body.appendChild(panel);
        return panel;
    }

    private createGraphCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
        const canvas = document.createElement('canvas');
        canvas.width = 800; // Wider
        canvas.height = 200; // Taller
        canvas.style.position = 'absolute';
        canvas.style.bottom = '10px';
        canvas.style.right = '10px';
        canvas.style.border = '2px solid #00ff00';
        canvas.style.background = 'rgba(0, 0, 0, 0.9)';
        canvas.style.borderRadius = '8px';
        canvas.style.zIndex = '1000';
        canvas.style.display = 'none';
        canvas.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d')!;
        return { canvas, ctx };
    }

    async loadAudioFile(file: File, audioContext: AudioContext): Promise<void> {
        try {
            console.log('[WaveformModel3D] Loading audio file:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            console.log(`[WaveformModel3D] Audio loaded: ${this.audioBuffer.duration.toFixed(2)}s`);

            // Generate the dynamic waveform
            this.generateDynamicWaveform();

            // Update info panel
            this.updateInfoPanel(file.name);

            console.log('[WaveformModel3D] Dynamic waveform ready!');
        } catch (err) {
            console.error('[WaveformModel3D] Error loading audio:', err);
            throw err;
        }
    }

    private generateDynamicWaveform() {
        if (!this.audioBuffer) return;

        // Clear existing
        this.clearMeshes();

        const channelData = this.audioBuffer.getChannelData(0);

        // Create readable waveform with good detail
        const targetPoints = 8000;
        const step = Math.max(1, Math.floor(channelData.length / targetPoints));

        const points: THREE.Vector3[] = [];
        const colors: number[] = [];

        const length = 60 * this.spreadFactor; // Apply spread factor
        const amplitudeScale = 6;

        // Generate waveform points
        for (let i = 0; i < channelData.length; i += step) {
            const sample = channelData[i];
            const progress = i / channelData.length;

            const x = progress * length - length / 2;
            const y = sample * amplitudeScale;
            const z = 0;

            points.push(new THREE.Vector3(x, y, z));

            // Cyan to white gradient for readability
            const intensity = 0.5 + Math.abs(sample) * 0.5;
            colors.push(0, intensity, intensity); // Cyan tones
        }

        // Create main waveform line
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 3
        });

        this.waveformLine = new THREE.Line(geometry, material);
        this.group.add(this.waveformLine);

        // Add a transparent hit area for easier raycasting
        this.createHitArea(length, amplitudeScale);

        // Add progress indicator (moving sphere)
        this.createProgressIndicator(length, amplitudeScale);

        // Add readable grid
        this.addReadableGrid(length, amplitudeScale);

        console.log(`[WaveformModel3D] Generated ${points.length} points`);
    }

    private createHitArea(length: number, amplitudeScale: number) {
        const geometry = new THREE.PlaneGeometry(length, amplitudeScale * 2);
        const material = new THREE.MeshBasicMaterial({
            visible: false, // Keep it invisible
            side: THREE.DoubleSide
        });
        this.hitArea = new THREE.Mesh(geometry, material);
        this.hitArea.name = 'waveform-hit-area';
        this.group.add(this.hitArea);
    }

    private createProgressIndicator(length: number, amplitudeScale: number) {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0,
            roughness: 0.2,
            metalness: 0.8
        });

        this.progressIndicator = new THREE.Mesh(geometry, material);
        this.progressIndicator.position.set(-length / 2, 0, 0);
        this.group.add(this.progressIndicator);

        // Add vertical progress line
        const linePoints = [
            new THREE.Vector3(-length / 2, -amplitudeScale - 2, 0),
            new THREE.Vector3(-length / 2, amplitudeScale + 2, 0)
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 2
        });
        const progressLine = new THREE.Line(lineGeometry, lineMaterial);
        this.group.add(progressLine);
    }

    private addReadableGrid(length: number, amplitudeScale: number) {
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2
        });

        // Time divisions (every second)
        const duration = this.audioBuffer?.duration || 1;
        const secondsCount = Math.ceil(duration);

        for (let i = 0; i <= secondsCount; i++) {
            const progress = i / duration;
            const x = progress * length - length / 2;

            if (x >= -length / 2 && x <= length / 2) {
                const points = [
                    new THREE.Vector3(x, -amplitudeScale - 1, 0),
                    new THREE.Vector3(x, amplitudeScale + 1, 0)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, gridMaterial);
                this.group.add(line);
            }
        }

        // Amplitude grid
        for (let i = -4; i <= 4; i++) {
            const y = (i / 4) * amplitudeScale;
            const points = [
                new THREE.Vector3(-length / 2, y, 0),
                new THREE.Vector3(length / 2, y, 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.group.add(line);
        }
    }

    // Update animation based on audio playback time
    updatePlayback(currentTime: number, isPlaying: boolean) {
        if (!this.audioBuffer || !this.progressIndicator) return;

        this.isPlaying = isPlaying;

        const duration = this.audioBuffer.duration;
        const progress = currentTime / duration;

        // Move progress indicator
        const length = 60;
        const x = progress * length - length / 2;
        this.progressIndicator.position.x = x;

        // Update waveform at current position
        const channelData = this.audioBuffer.getChannelData(0);
        const sampleIndex = Math.floor(progress * channelData.length);
        const sample = channelData[sampleIndex] || 0;
        const amplitudeScale = 6;
        this.progressIndicator.position.y = sample * amplitudeScale;

        // Update 2D graph
        this.drawGraph(currentTime);

        // Update info panel with current time
        this.updatePlaybackInfo(currentTime);
    }

    private drawGraph(currentTime: number) {
        if (!this.audioBuffer) return;

        const ctx = this.graphCtx;
        const width = this.graphCanvas.width;
        const height = this.graphCanvas.height;

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        // Draw title
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('REAL-TIME FREQUENCY SPECTRUM', 10, 20);

        // Get current frequency data (simplified FFT)
        const channelData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        const windowSize = 2048;
        const startSample = Math.floor((currentTime / this.audioBuffer.duration) * channelData.length);

        // Perform simple FFT approximation
        const fftBins = 32; // Reduced from 64 for more spread out bars
        const spectrum = new Array(fftBins).fill(0);

        for (let i = 0; i < fftBins; i++) {
            const freqStart = startSample + i * (windowSize / fftBins);
            const freqEnd = Math.min(freqStart + (windowSize / fftBins), channelData.length);

            let sum = 0;
            for (let j = freqStart; j < freqEnd; j++) {
                sum += Math.abs(channelData[Math.floor(j)] || 0);
            }
            spectrum[i] = sum / (freqEnd - freqStart);
        }

        // Normalize
        const max = Math.max(...spectrum, 0.01);

        // Draw spectrum bars with more spacing
        const barWidth = (width / fftBins) - 4; // More spacing between bars
        const graphHeight = height - 50;

        for (let i = 0; i < fftBins; i++) {
            const barHeight = (spectrum[i] / max) * graphHeight;
            const x = i * (width / fftBins) + 2; // Add offset for spacing
            const y = height - barHeight - 15;

            // Gradient color
            const hue = (i / fftBins) * 120; // Green to cyan
            ctx.fillStyle = `hsl(${hue + 120}, 100%, 50%)`;
            ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Draw frequency labels
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px monospace';
        ctx.fillText('0 Hz', 5, height - 2);
        ctx.fillText(`${(sampleRate / 2).toFixed(0)} Hz`, width - 60, height - 2);
        ctx.fillText('Low', width / 4, height - 2);
        ctx.fillText('Mid', width / 2, height - 2);
        ctx.fillText('High', 3 * width / 4, height - 2);
    }

    private updateInfoPanel(filename: string) {
        if (!this.audioBuffer) return;

        const duration = this.audioBuffer.duration;
        const sampleRate = this.audioBuffer.sampleRate;
        const channels = this.audioBuffer.numberOfChannels;

        this.infoPanel.innerHTML = `
      <div style="border-bottom: 2px solid #00ff00; padding-bottom: 8px; margin-bottom: 8px;">
        <strong>🎵 DYNAMIC WAVEFORM ANALYZER</strong>
      </div>
      <div style="line-height: 1.8; font-size: 12px;">
        <strong>File:</strong> ${filename}<br>
        <strong>Duration:</strong> ${this.formatTime(duration)}<br>
        <strong>Sample Rate:</strong> ${sampleRate} Hz<br>
        <strong>Channels:</strong> ${channels === 1 ? 'Mono' : 'Stereo'}<br>
        <div id="playback-time" style="margin-top: 10px; padding: 8px; background: rgba(0, 255, 0, 0.1); border-radius: 4px;">
          <strong>⏱️ Time:</strong> <span id="current-time">0:00</span> / ${this.formatTime(duration)}
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #00ff00; font-size: 10px; color: #0f0;">
        🔴 Red sphere = Current playback position<br>
        📊 Bottom-right = Live frequency spectrum
      </div>
    `;
    }

    private updatePlaybackInfo(currentTime: number) {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = this.formatTime(currentTime);
            timeElement.style.color = this.isPlaying ? '#ff0000' : '#00ff00';
        }
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private clearMeshes() {
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            this.group.remove(child);
            if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        this.waveformLine = null;
        this.hitArea = null;
        this.progressIndicator = null;
    }

    // Helper to get the hit area mesh for raycasting
    getHitArea(): THREE.Mesh | null {
        return this.hitArea;
    }

    // Calculate 0-1 progress from a world-space point on the hit area
    calculateProgressFromPoint(point: THREE.Vector3): number {
        // Convert world point to local point
        const localPoint = this.group.worldToLocal(point.clone());
        const length = 60 * this.spreadFactor;

        // Map local x (-length/2 to length/2) to progress (0 to 1)
        let progress = (localPoint.x + length / 2) / length;
        return Math.min(Math.max(progress, 0), 1);
    }

    getProgressPosition(): THREE.Vector3 {
        return this.progressIndicator ? this.progressIndicator.position.clone() : new THREE.Vector3();
    }

    setPosition(x: number, y: number, z: number) {
        this.group.position.set(x, y, z);
    }

    setRotation(x: number, y: number, z: number) {
        this.group.rotation.set(x, y, z);
    }

    setSpread(spread: number) {
        if (this.spreadFactor !== spread) {
            this.spreadFactor = spread;
            // Regenerate waveform with new spread
            if (this.audioBuffer) {
                this.generateDynamicWaveform();
            }
        }
    }

    show() {
        this.group.visible = true;
        this.infoPanel.style.display = 'block';
        this.graphCanvas.style.display = 'block';
    }

    hide() {
        this.group.visible = false;
        this.infoPanel.style.display = 'none';
        this.graphCanvas.style.display = 'none';
    }

    clear() {
        this.clearMeshes();
        this.infoPanel.style.display = 'none';
        this.graphCanvas.style.display = 'none';
    }

    getAudioInfo(): { duration: number; sampleRate: number; channels: number } | null {
        if (!this.audioBuffer) return null;
        return {
            duration: this.audioBuffer.duration,
            sampleRate: this.audioBuffer.sampleRate,
            channels: this.audioBuffer.numberOfChannels
        };
    }
}
