import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioController } from './audio/AudioController';
import { Visualizer } from './visualizer/Visualizer';
import { EducationalUI } from './ui/EducationalUI';
import { WaveformVisualizer } from './visualizer/WaveformVisualizer';
import { FrequencyGraph } from './visualizer/FrequencyGraph';
import { PolarGrid } from './visualizer/PolarGrid';
import { WaveformModel3D } from './visualizer/WaveformModel3D';

// --- Phase 1: Project Setup & Basic Scene ---

// 1. Scene
const scene = new THREE.Scene();

// 2. Cameras (both Perspective and Orthographic for educational comparison)
const perspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
perspectiveCamera.position.set(0, 15, 30);
perspectiveCamera.lookAt(0, 0, 0);

const orthographicCamera = new THREE.OrthographicCamera(
  -20, 20, 15, -15, 0.1, 1000
);
orthographicCamera.position.set(0, 15, 30);
orthographicCamera.lookAt(0, 0, 0);

let activeCamera: THREE.Camera = perspectiveCamera;

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 4. OrbitControls
const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

// Lighting for StandardMaterial
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1000, 100);
pointLight.position.set(0, 20, 0);
scene.add(pointLight);

// --- Educational Components ---

const educationalUI = new EducationalUI();
const audioController = new AudioController();
const visualizer = new Visualizer(scene);
const waveformViz = new WaveformVisualizer();
const frequencyGraph = new FrequencyGraph();
const polarGrid = new PolarGrid(scene);
const waveformModel = new WaveformModel3D(scene);

// Initial setup
let BAR_COUNT = educationalUI.settings.barCount;
let RADIUS = educationalUI.settings.radius;
visualizer.createVisualizerBars(BAR_COUNT, RADIUS);
polarGrid.create(RADIUS, BAR_COUNT);
polarGrid.hide(); // Hidden by default
waveformModel.hide(); // Hidden by default

// Watch for settings changes
let previousFFTSize = educationalUI.settings.fftSize;
let previousBarCount = educationalUI.settings.barCount;
let previousRadius = educationalUI.settings.radius;
let previousPerspective = educationalUI.settings.usePerspective;
let previousSpread = educationalUI.settings.waveformSpread;

// Connect UI to AudioController
educationalUI.setAudioController(audioController);

// Handle file upload for 3D model generation
educationalUI.onFileLoaded = async (file: File) => {
  try {
    await waveformModel.loadAudioFile(file, audioController.getAudioContext());
    educationalUI.updateInfo(`3D Waveform Model generated! Switch to '3d-model' mode to view it.`);
  } catch (err) {
    educationalUI.updateInfo('Error generating 3D model');
  }
};

// Resize Handler
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;

  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  const frustumSize = 30;
  orthographicCamera.left = -frustumSize * aspect / 2;
  orthographicCamera.right = frustumSize * aspect / 2;
  orthographicCamera.top = frustumSize / 2;
  orthographicCamera.bottom = -frustumSize / 2;
  orthographicCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
const animate = () => {
  requestAnimationFrame(animate);

  // Update stats
  educationalUI.updateStats();

  // Check for settings changes
  if (educationalUI.settings.fftSize !== previousFFTSize) {
    audioController.setFFTSize(educationalUI.settings.fftSize);
    previousFFTSize = educationalUI.settings.fftSize;
  }

  if (educationalUI.settings.barCount !== previousBarCount ||
    educationalUI.settings.radius !== previousRadius) {
    BAR_COUNT = educationalUI.settings.barCount;
    RADIUS = educationalUI.settings.radius;
    visualizer.createVisualizerBars(BAR_COUNT, RADIUS);
    polarGrid.create(RADIUS, BAR_COUNT);
    previousBarCount = BAR_COUNT;
    previousRadius = RADIUS;
  }

  if (educationalUI.settings.usePerspective !== previousPerspective) {
    activeCamera = educationalUI.settings.usePerspective ? perspectiveCamera : orthographicCamera;
    controls.object = activeCamera;
    previousPerspective = educationalUI.settings.usePerspective;
  }

  if (educationalUI.settings.waveformSpread !== previousSpread) {
    waveformModel.setSpread(educationalUI.settings.waveformSpread);
    previousSpread = educationalUI.settings.waveformSpread;
  }

  // Toggle visualizations
  if (educationalUI.settings.showWaveform) {
    waveformViz.show();
    waveformViz.draw(audioController.getTimeDomainData());
  } else {
    waveformViz.hide();
  }

  if (educationalUI.settings.showFrequencyGraph) {
    frequencyGraph.show();
    frequencyGraph.draw(audioController.getFrequencyData());
  } else {
    frequencyGraph.hide();
  }

  if (educationalUI.settings.showPolarGrid) {
    polarGrid.show();
  } else {
    polarGrid.hide();
  }

  controls.autoRotate = educationalUI.settings.autoRotate;
  controls.update();

  // Mode switching: Real-time vs 3D Model
  const isModelMode = educationalUI.settings.visualizationMode === '3d-model';

  if (isModelMode) {
    // 3D Model Mode: Show dynamic waveform, hide real-time bars
    visualizer.meshes.forEach(mesh => mesh.visible = false);
    waveformModel.show();

    // Update waveform animation with current playback time
    const currentTime = audioController.getCurrentTime();
    const isPlaying = audioController.isPlaying();
    waveformModel.updatePlayback(currentTime, isPlaying);
  } else {
    // Real-time Mode: Show frequency bars, hide 3D model
    visualizer.meshes.forEach(mesh => mesh.visible = true);
    waveformModel.hide();

    // Phase 4: Real-Time Rendering Pipeline (Upgraded: Average Sampling)
    const frequencyData = audioController.getFrequencyData();
    const totalBins = frequencyData.length;

    visualizer.meshes.forEach((mesh, index) => {
      // Calculate the range of bins this bar represents
      // This ensures every single bin is accounted for, even if they don't divide perfectly
      const startBin = Math.floor((index / BAR_COUNT) * totalBins);
      const endBin = Math.floor(((index + 1) / BAR_COUNT) * totalBins);

      let value = 0;

      // If bins > bars (Downsampling): Average the values in the range
      if (endBin > startBin) {
        let sum = 0;
        for (let i = startBin; i < endBin; i++) {
          sum += frequencyData[i];
        }
        value = sum / (endBin - startBin);
      }
      // If bars >= bins (Upsampling): Just take the nearest bin value
      else {
        value = frequencyData[startBin] || 0;
      }

      // Geometric Transformation
      const intensity = value / 255.0;
      const scaleY = intensity * 15 + 0.1;
      mesh.scale.y = scaleY;

      // HSV Color Mapping
      const hue = index / BAR_COUNT;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHSL(hue, 1.0, 0.5);
      material.emissive.setHSL(hue, 1.0, intensity * 0.5);
    });
  }

  renderer.render(scene, activeCamera);
};

animate();
