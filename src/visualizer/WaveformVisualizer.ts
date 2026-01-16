// WaveformVisualizer: Shows TIME DOMAIN representation
// This is what the audio looks like BEFORE FFT transformation
export class WaveformVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 400;
    private height: number = 150;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '10px';
        this.canvas.style.left = '10px';
        this.canvas.style.border = '2px solid #00ff00';
        this.canvas.style.background = 'rgba(0, 0, 0, 0.7)';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.display = 'none'; // Hidden by default

        this.ctx = this.canvas.getContext('2d')!;
        document.body.appendChild(this.canvas);
    }

    show() {
        this.canvas.style.display = 'block';
    }

    hide() {
        this.canvas.style.display = 'none';
    }

    draw(timeDomainData: Uint8Array) {
        const { ctx, width, height } = this;

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        // Draw title
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.fillText('TIME DOMAIN (Raw Waveform)', 10, 15);

        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();

        const sliceWidth = width / timeDomainData.length;
        let x = 0;

        for (let i = 0; i < timeDomainData.length; i++) {
            const v = timeDomainData[i] / 128.0; // Normalize to 0-2
            const y = (v * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }
}
