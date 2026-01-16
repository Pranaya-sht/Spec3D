# spec3D - Spectre 3D Audio Visualizer

**spec3D** is a powerful, interactive 3D audio visualization tool designed to help users explore and understand audio data through immersive graphics. Built with **Three.js**, **TypeScript**, and **Vite**, it provides both real-time spectral analysis and static 3D waveform generation.

---

## 🌟 Features

### 1. Real-Time 3D Visualization
- **Circular Frequency Bars**: High-performance 3D bars that react to audio frequencies in real-time.
- **Dynamic Color Mapping**: Bars change color based on their frequency range using HSL mapping.
- **Interactive Environment**: Full camera control (Pan, Tilt, Zoom) using OrbitControls.

### 2. Multi-Mode Analysis
- **Real-Time Mode**: Watch the spectrum dance to the current playback.
- **3D-Model Mode**: Generates a static 3D mesh of the entire audio track's waveform, allowing you to visualize the whole song's structure at once.

### 3. Comprehensive Data Overlays
- **2D Waveform**: Real-time time-domain visualization.
- **2D Frequency Graph**: Real-time frequency-domain (spectral) analysis.
- **Polar Grid**: Optional guide for the circular visualizer layout.

### 4. Educational Controls
- **Variable FFT Size**: Adjust the Fast Fourier Transform resolution.
- **Customizable Geometry**: Change the number of bars and the radius of the visualizer.
- **Camera Comparison**: Toggle between Perspective and Orthographic cameras to understand geometric projection.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone or download the project folder.
2. Open your terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
To start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 📖 User Manual

### 1. Audio Interaction
- **Upload**: Use the "Upload Audio File" button in the menu to load your own MP3 or WAV file.
- **Play/Pause**: Control playback using the on-screen UI buttons.

### 2. Camera Controls
- **Rotate**: Click and drag with the Left Mouse Button.
- **Zoom**: Use the Scroll Wheel.
- **Pan**: Click and drag with the Right Mouse Button.
- **Auto-Rotate**: Enable this in the settings for a cinematic view.

### 3. Customization Menu (Top-Right)
- **Visualization Settings**:
  - `barCount`: Number of frequency bars in the circle.
  - `radius`: Distance from the center for the bars.
  - `fftSize`: Accuracy of the frequency analysis (higher = more detail, lower = better performance).
- **Toggle Overlays**:
  - `showWaveform`: Toggle the 2D wave at the bottom.
  - `showFrequencyGraph`: Toggle the spectral graph.
  - `showPolarGrid`: Toggle the 3D floor grid.
- **Visualization Mode**: 
  - Switch between `real-time` and `3d-model`.

### 4. Technical Mode
- Enable `usePerspective` to switch between realistic depth and flat technical views.

---

## 🛠️ Tech Stack
- **Framework**: [Vite](https://vitejs.dev/)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Language**: TypeScript
- **UI Architecture**: Vanilla CSS & lil-gui
