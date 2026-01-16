import GUI from 'lil-gui';
import Stats from 'stats.js';
import { AudioController } from '../audio/AudioController';

export interface EducationalSettings {
    fftSize: number;
    showWaveform: boolean;
    showFrequencyGraph: boolean;
    showPolarGrid: boolean;
    usePerspective: boolean;
    barCount: number;
    radius: number;
    autoRotate: boolean;
    visualizationMode: 'realtime' | '3d-model';
    waveformSpread: number;
}

export class EducationalUI {
    public gui: GUI;
    public stats: Stats;
    public settings: EducationalSettings;
    private infoPanel: HTMLDivElement;
    private audioSourcePanel: HTMLDivElement;
    private playbackControls: HTMLDivElement;
    private fileInput: HTMLInputElement;
    private audioController: AudioController | null = null;
    public onFileLoaded: ((file: File) => void) | null = null;

    constructor() {
        // Initialize settings
        this.settings = {
            fftSize: 512,
            showWaveform: false,
            showFrequencyGraph: false,
            showPolarGrid: false,
            usePerspective: true,
            barCount: 64,
            radius: 10,
            autoRotate: true,
            visualizationMode: 'realtime',
            waveformSpread: 1.0
        };

        // Create GUI
        this.gui = new GUI({ title: 'Educational Controls' });

        // FFT Settings
        const fftFolder = this.gui.addFolder('FFT Settings');
        fftFolder.add(this.settings, 'fftSize', [128, 256, 512, 1024, 2048])
            .name('FFT Size')
            .onChange(() => {
                this.updateInfo('FFT size changed. Larger = more frequency bins (better resolution), but slower.');
            });
        fftFolder.open();

        // Visualization Modes
        const vizFolder = this.gui.addFolder('Visualization Modes');
        vizFolder.add(this.settings, 'showWaveform')
            .name('Time Domain (Waveform)')
            .onChange((value: boolean) => {
                this.updateInfo(value ? 'Showing TIME DOMAIN: Raw audio signal before FFT' : 'Waveform hidden');
            });
        vizFolder.add(this.settings, 'showFrequencyGraph')
            .name('Frequency Domain (Graph)')
            .onChange((value: boolean) => {
                this.updateInfo(value ? 'Showing FREQUENCY DOMAIN: Audio after FFT transformation' : 'Frequency graph hidden');
            });
        vizFolder.add(this.settings, 'showPolarGrid')
            .name('Polar Coordinate Grid')
            .onChange((value: boolean) => {
                this.updateInfo(value ? 'Showing polar grid: Demonstrates r·cos(θ), r·sin(θ) conversion' : 'Polar grid hidden');
            });
        vizFolder.open();

        // Visualization Mode Toggle
        const modeFolder = this.gui.addFolder('Visualization Mode');
        modeFolder.add(this.settings, 'visualizationMode', ['realtime', '3d-model'])
            .name('Mode')
            .onChange((value: string) => {
                this.updateInfo(value === 'realtime' ?
                    'REALTIME MODE: Live audio visualization' :
                    '3D MODEL MODE: Static waveform model (upload file to generate)');
            });
        modeFolder.open();

        // Waveform Spread Control
        const spreadFolder = this.gui.addFolder('Waveform Detail');
        spreadFolder.add(this.settings, 'waveformSpread', 0.5, 3.0, 0.1)
            .name('Horizontal Spread')
            .onChange((value: number) => {
                this.updateInfo(`Waveform spread: ${value.toFixed(1)}x - ${value > 1 ? 'More spread out' : 'More compressed'}`);
            });
        spreadFolder.open();

        // Camera Settings
        const cameraFolder = this.gui.addFolder('Camera & Projection');
        cameraFolder.add(this.settings, 'usePerspective')
            .name('Use Perspective')
            .onChange((value: boolean) => {
                this.updateInfo(value ?
                    'PERSPECTIVE: Objects farther away appear smaller (realistic)' :
                    'ORTHOGRAPHIC: All objects same size regardless of distance (technical drawings)');
            });
        cameraFolder.add(this.settings, 'autoRotate').name('Auto Rotate');
        cameraFolder.open();

        // Geometry Settings
        const geoFolder = this.gui.addFolder('Geometry Settings');
        geoFolder.add(this.settings, 'barCount', 16, 128, 1)
            .name('Bar Count')
            .onChange(() => {
                this.updateInfo('Bar count changed. More bars = smoother circle distribution.');
            });
        geoFolder.add(this.settings, 'radius', 5, 20, 0.5)
            .name('Circle Radius')
            .onChange(() => {
                this.updateInfo('Radius changed. Affects polar coordinate calculation: x = r·cos(θ), z = r·sin(θ)');
            });

        // Stats (FPS counter)
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = '10px';
        this.stats.dom.style.right = '10px';
        document.body.appendChild(this.stats.dom);

        // Audio Source Panel
        this.audioSourcePanel = this.createAudioSourcePanel();
        document.body.appendChild(this.audioSourcePanel);

        // Playback Controls (hidden by default)
        this.playbackControls = this.createPlaybackControls();
        document.body.appendChild(this.playbackControls);

        // File Input (hidden)
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'audio/*';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        // Info Panel
        this.infoPanel = document.createElement('div');
        this.infoPanel.style.position = 'absolute';
        this.infoPanel.style.bottom = '10px';
        this.infoPanel.style.left = '10px';
        this.infoPanel.style.padding = '10px';
        this.infoPanel.style.background = 'rgba(0, 0, 0, 0.8)';
        this.infoPanel.style.color = '#00ff00';
        this.infoPanel.style.fontFamily = 'monospace';
        this.infoPanel.style.fontSize = '12px';
        this.infoPanel.style.maxWidth = '400px';
        this.infoPanel.style.border = '1px solid #00ff00';
        this.infoPanel.style.zIndex = '1000';
        this.infoPanel.innerHTML = `
      <strong>Spec3D Educational Visualizer</strong><br>
      Choose audio source: Microphone or Upload File
    `;
        document.body.appendChild(this.infoPanel);
    }

    private createAudioSourcePanel(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.padding = '20px';
        panel.style.background = 'rgba(0, 0, 0, 0.9)';
        panel.style.color = '#fff';
        panel.style.fontFamily = 'sans-serif';
        panel.style.borderRadius = '10px';
        panel.style.border = '2px solid #00ff00';
        panel.style.zIndex = '2000';
        panel.style.textAlign = 'center';
        panel.innerHTML = `
      <h2 style="margin-top: 0;">Audio Source</h2>
      <p>Choose your audio input:</p>
      <button id="useMicBtn" style="margin: 10px; padding: 15px 30px; font-size: 16px; cursor: pointer; background: #00ff00; border: none; border-radius: 5px;">
        🎤 Use Microphone
      </button>
      <button id="uploadFileBtn" style="margin: 10px; padding: 15px 30px; font-size: 16px; cursor: pointer; background: #ff00ff; border: none; border-radius: 5px;">
        📁 Upload Audio File
      </button>
      <p style="font-size: 12px; color: #aaa; margin-top: 20px;">Upload MP3, WAV, OGG, or other audio formats</p>
    `;
        return panel;
    }

    private createPlaybackControls(): HTMLDivElement {
        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.bottom = '80px';
        controls.style.left = '10px';
        controls.style.padding = '10px';
        controls.style.background = 'rgba(0, 0, 0, 0.8)';
        controls.style.color = '#fff';
        controls.style.fontFamily = 'monospace';
        controls.style.fontSize = '12px';
        controls.style.border = '1px solid #ff00ff';
        controls.style.borderRadius = '5px';
        controls.style.zIndex = '1000';
        controls.style.display = 'none';
        controls.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>🎵 Playback Controls</strong></div>
      <button id="playPauseBtn" style="padding: 5px 15px; margin-right: 5px; cursor: pointer;">▶️ Play</button>
      <span id="timeDisplay">0:00 / 0:00</span>
    `;
        return controls;
    }

    setAudioController(controller: AudioController) {
        this.audioController = controller;

        // Setup event listeners
        const useMicBtn = document.getElementById('useMicBtn');
        const uploadFileBtn = document.getElementById('uploadFileBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');

        useMicBtn?.addEventListener('click', async () => {
            try {
                await controller.setupMicrophone();
                this.audioSourcePanel.style.display = 'none';
                this.playbackControls.style.display = 'none';
                this.updateInfo('Using MICROPHONE as audio source');
            } catch (err) {
                this.updateInfo('Error: Could not access microphone');
            }
        });

        uploadFileBtn?.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    await controller.setupAudioFile(file);
                    this.audioSourcePanel.style.display = 'none';
                    this.playbackControls.style.display = 'block';
                    this.updateInfo(`Playing: ${file.name}`);
                    this.startPlaybackUpdate();

                    // Trigger 3D model generation callback
                    if (this.onFileLoaded) {
                        this.onFileLoaded(file);
                    }
                } catch (err) {
                    this.updateInfo('Error: Could not load audio file');
                }
            }
        });

        playPauseBtn?.addEventListener('click', () => {
            if (controller.isPlaying()) {
                controller.pause();
                playPauseBtn.textContent = '▶️ Play';
            } else {
                controller.play();
                playPauseBtn.textContent = '⏸️ Pause';
            }
        });
    }

    private startPlaybackUpdate() {
        setInterval(() => {
            if (this.audioController && this.audioController.getCurrentSourceType() === 'file') {
                const current = this.audioController.getCurrentTime();
                const duration = this.audioController.getDuration();
                const timeDisplay = document.getElementById('timeDisplay');
                if (timeDisplay) {
                    timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
                }
            }
        }, 100);
    }

    private formatTime(seconds: number): string {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateInfo(message: string) {
        this.infoPanel.innerHTML = `<strong>Info:</strong> ${message}`;
    }

    updateStats() {
        this.stats.update();
    }
}
