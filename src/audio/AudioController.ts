export class AudioController {
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private frequencyData: Uint8Array;
    private timeDomainData: Uint8Array;
    private micSource: MediaStreamAudioSourceNode | null = null;
    private fileSource: MediaElementAudioSourceNode | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private _fftSize: number = 512;
    private currentSourceType: 'microphone' | 'file' | 'none' = 'none';

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();

        // Theory Check: FFT (Fast Fourier Transform)
        // The FFT is an algorithm that converts a signal from the Time Domain (waveform, amplitude over time)
        // to the Frequency Domain (spectral content, amplitude of component frequencies).
        //
        // fftSize:
        // This defines the window size for the FFT. It must be a power of 2 (e.g., 512, 1024, 2048).
        // A larger fftSize means more frequency bins (finer resolution), but it's computationally more expensive.
        // The number of data points we get back is fftSize / 2 (the "frequencyBinCount").
        // We choose 512 to get 256 data points, which is a good balance for our visualizer.
        this.analyser.fftSize = this._fftSize;

        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    }

    // Educational Feature: Allow dynamic FFT size changes
    // This lets users see how FFT resolution affects frequency analysis
    setFFTSize(size: number) {
        // Validate: must be power of 2 between 32 and 32768
        if (size < 32 || size > 32768 || (size & (size - 1)) !== 0) {
            console.warn('FFT size must be a power of 2 between 32 and 32768');
            return;
        }

        this._fftSize = size;
        this.analyser.fftSize = size;

        // Resize data arrays
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeDomainData = new Uint8Array(this.analyser.fftSize);

        console.log(`FFT size changed to ${size}, frequency bins: ${this.analyser.frequencyBinCount}`);
    }

    getFFTSize(): number {
        return this._fftSize;
    }

    getFrequencyBinCount(): number {
        return this.analyser.frequencyBinCount;
    }

    getCurrentSourceType(): string {
        return this.currentSourceType;
    }

    getAudioContext(): AudioContext {
        return this.audioContext;
    }

    // Setup microphone input
    async setupMicrophone(): Promise<void> {
        try {
            // Disconnect any existing sources
            this.disconnectAllSources();

            // Access user's microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create Source
            this.micSource = this.audioContext.createMediaStreamSource(stream);

            // Connect to Analyser
            // We do NOT connect to audioContext.destination to avoid feedback loop (hearing yourself).
            this.micSource.connect(this.analyser);

            // Resume context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.currentSourceType = 'microphone';
            console.log('Microphone setup complete.');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            throw err;
        }
    }

    // NEW: Setup audio file input
    async setupAudioFile(file: File): Promise<void> {
        try {
            // Disconnect any existing sources
            this.disconnectAllSources();

            // Create audio element if it doesn't exist
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.controls = false;
            }

            // Load the file
            const url = URL.createObjectURL(file);
            this.audioElement.src = url;

            // Create media element source
            this.fileSource = this.audioContext.createMediaElementSource(this.audioElement);

            // Connect to analyser AND destination (so we can hear it)
            this.fileSource.connect(this.analyser);
            this.fileSource.connect(this.audioContext.destination);

            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.currentSourceType = 'file';
            console.log(`Audio file loaded: ${file.name}`);

            // Auto-play the file
            await this.audioElement.play();
        } catch (err) {
            console.error('Error loading audio file:', err);
            throw err;
        }
    }

    // Disconnect all audio sources
    private disconnectAllSources() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
        }

        if (this.fileSource) {
            this.fileSource.disconnect();
            this.fileSource = null;
        }

        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }

    // Playback controls for audio files
    play() {
        if (this.audioElement && this.currentSourceType === 'file') {
            this.audioElement.play();
        }
    }

    pause() {
        if (this.audioElement && this.currentSourceType === 'file') {
            this.audioElement.pause();
        }
    }

    isPlaying(): boolean {
        return this.audioElement ? !this.audioElement.paused : false;
    }

    getCurrentTime(): number {
        return this.audioElement ? this.audioElement.currentTime : 0;
    }

    getDuration(): number {
        return this.audioElement ? this.audioElement.duration : 0;
    }

    seek(time: number) {
        if (this.audioElement && this.currentSourceType === 'file') {
            this.audioElement.currentTime = time;
        }
    }

    getFrequencyData(): Uint8Array {
        // Populates the frequencyData array with current frequency data (0-255).
        // The array indices correspond to frequency bands.
        // Lower indices (0, 1, 2...) = Deep Bass (Low Frequencies)
        // Higher indices = High Treble (High Frequencies)
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }

    // Educational Feature: Get Time Domain Data
    // This shows the RAW WAVEFORM (what the microphone captures)
    // BEFORE the FFT transforms it into frequency data
    getTimeDomainData(): Uint8Array {
        this.analyser.getByteTimeDomainData(this.timeDomainData);
        return this.timeDomainData;
    }

    // Get the frequency (in Hz) for a given bin index
    // This helps label what frequencies we're actually visualizing
    getFrequencyForBin(binIndex: number): number {
        const nyquist = this.audioContext.sampleRate / 2;
        return (binIndex / this.analyser.frequencyBinCount) * nyquist;
    }
}
