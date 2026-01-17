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
- **Fourier View (New!)**: An immersive educational laboratory that visualizes the decomposition of a complex signal into its constituent sine waves.

### 3. Fourier Laboratory Features
- **Moving Analysis Scanner**: A high-tech "graph-style" wall that slices through the 3D signal in real-time.
- **Dynamic Connection Waves**: Vibrant purple signal wall that projects frequency-colored constituent sine waves into the distance.
- **Immersive 3D Hall**: A massive "Analsyis Hall" environment with a full 3D coordinate system (Amplitude, Time, and Spectral Depth).
- **Tethered Tracking Arrow**: A blue vector arrow that dynamically connects the moving scanner to the static spectral station.

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
  - Switch between `real-time`, `3d-model`, and `fourier-view`.

### 4. Technical Mode
- Enable `usePerspective` to switch between realistic depth and flat technical views.

---

## 🏗️ Project Structure (For Study)

This project is organized as a modular TypeScript application. Here is a guide to the key files for developers and students:

### Core Architecture
- **[src/main.ts](src/main.ts)**: The application entry point. It orchestrates the animation loop, manages transitions between visualization modes, and houses the primary `lil-gui` configuration.
- **[src/core/SceneManager.ts](src/core/SceneManager.ts)**: Manages the Three.js ecosystem. It initializes the scene, renderer, cameras (Perspective/Orthographic), and lighting.

### Audio Engine
- **[src/audio/AudioController.ts](src/audio/AudioController.ts)**: The heart of the audio logic. It uses the Web Audio API to handle file loading, playback, and provides the `AnalyserNode` for fetching FFT data (Frequency and Time Domain).

### Visualization Layers
- **[src/visualizer/Visualizer3D.ts](src/visualizer/Visualizer3D.ts)**: Implements the real-time circular frequency bar visualizer.
- **[src/visualizer/WaveformModel3D.ts](src/visualizer/WaveformModel3D.ts)**: Contains the logic for processing entire audio buffers into a single, unified static 3D mesh.
- **[src/visualizer/FourierVisualizer.ts](src/visualizer/FourierVisualizer.ts)**: The most complex visual component. It implements the "Static Lab" layout, move-able analysis planes, and the connection logic for constituent sine waves.

### Interface
- **[src/ui/EducationalUI.ts](src/ui/EducationalUI.ts)**: Manages the 2D overlays (Canvas-based waveform and graphs) and provides a clean interface for modifying simulation parameters.

---

## 🛠️ Tech Stack
- **Framework**: [Vite](https://vitejs.dev/)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Language**: TypeScript
- **UI Architecture**: Vanilla CSS & lil-gui
