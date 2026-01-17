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
import { FourierVisualizer } from './visualizer/FourierVisualizer';

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
const fourierVisualizer = new FourierVisualizer(scene);

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

  // Mode switching: Real-time vs 3D Model vs Fourier View
  const isModelMode = educationalUI.settings.visualizationMode === '3d-model';
  const isFourierMode = educationalUI.settings.visualizationMode === 'fourier-view';

  if (isModelMode) {
    // 3D Model Mode: Show dynamic waveform, hide real-time bars
    visualizer.meshes.forEach(mesh => mesh.visible = false);
    waveformModel.show();
    fourierVisualizer.hide();

    // Update waveform animation with current playback time
    const currentTime = audioController.getCurrentTime();
    const isPlaying = audioController.isPlaying();
    waveformModel.updatePlayback(currentTime, isPlaying);
  } else if (isFourierMode) {
    // Fourier View Mode
    visualizer.meshes.forEach(mesh => mesh.visible = false);

    // Integration: If a model exists, show it
    if (waveformModel.getAudioInfo()) {
      waveformModel.show();
      // Model stays centered as the "ground"
      waveformModel.setPosition(0, 0, 0);
      waveformModel.setRotation(0, 0, 0);

      // sync model playback
      const currentTime = audioController.getCurrentTime();
      const isPlaying = audioController.isPlaying();
      waveformModel.updatePlayback(currentTime, isPlaying);

      // STATIC LAB POSITION: Pull back further for the expanded environment
      fourierVisualizer.setPosition(0, 10, 40);
      fourierVisualizer.setRotation(0, 0, 0);

      const progPos = waveformModel.getProgressPosition();
      const timeData = audioController.getTimeDomainData();
      const freqData = audioController.getFrequencyData();

      fourierVisualizer.show();
      fourierVisualizer.update(timeData, freqData, progPos);
    } else {
      waveformModel.hide();
      fourierVisualizer.hide();
    }
  } else {
    // Real-time Mode: Show frequency bars, hide 3D model
    visualizer.meshes.forEach(mesh => mesh.visible = true);
    waveformModel.hide();
    waveformModel.setRotation(0, 0, 0);
    fourierVisualizer.hide();

    // Phase 4: Real-Time Rendering Pipeline
    const frequencyData = audioController.getFrequencyData();
    const step = Math.floor(frequencyData.length / BAR_COUNT);

    visualizer.meshes.forEach((mesh, index) => {
      const dataIndex = index * step;
      const value = frequencyData[dataIndex];

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
