// FrequencyGraph: Shows FREQUENCY DOMAIN representation
// This is what the audio looks like AFTER FFT transformation
export class FrequencyGraph {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 400;
    private height: number = 150;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '170px';
        this.canvas.style.left = '10px';
        this.canvas.style.border = '2px solid #ff00ff';
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

    draw(frequencyData: Uint8Array) {
        const { ctx, width, height } = this;

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);

        // Draw title
        ctx.fillStyle = '#ff00ff';
        ctx.font = '12px monospace';
        ctx.fillText('FREQUENCY DOMAIN (After FFT)', 10, 15);

        // Draw frequency bars
        const barWidth = width / frequencyData.length;

        for (let i = 0; i < frequencyData.length; i++) {
            const barHeight = (frequencyData[i] / 255) * (height - 20);

            // Color gradient from bass (red) to treble (blue)
            const hue = (i / frequencyData.length) * 280;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

            ctx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth - 1,
                barHeight
            );
        }

        // Draw labels
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText('Bass', 5, height - 5);
        ctx.fillText('Treble', width - 40, height - 5);
    }
}
