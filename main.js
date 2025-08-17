// main.js - Entry script for the 3D Fashion Store
// Uses ES modules and vanilla Three.js loaded via module import in this file.

// Import Three.js from a CDN (pure ES module). No bundler required.
// We pin a recent version known to support WebGL2 and WebAudio seamlessly.
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/RGBELoader.js";
import { RectAreaLightUniformsLib } from "https://unpkg.com/three@0.160.0/examples/jsm/lights/RectAreaLightUniformsLib.js";

// Modules
import { buildEnvironment } from "./modules/environment.js";
import { createNavigator } from "./modules/navigation.js";
import { createInteractionSystem } from "./modules/interactions.js";
import { createTryOnSystem } from "./modules/tryon.js";
import { createUI } from "./modules/ui.js";
import { createPanels } from "./modules/panels.js";
import { createOptimization } from "./modules/optimization.js";

// Global references to make interop simpler across modules
export const StoreApp = {
	scene: null,
	camera: null,
	renderer: null,
	clock: new THREE.Clock(),
	listener: null,
	sections: {},
	mixers: [],
	disposeCallbacks: [],
	state: {
		selectedItem: null,
		cart: [],
		wishlist: [],
		graphics: "high",
	},
	navigator: null,
	footstepSound: null,
	rustleSound: null,
	ambientMusic: null,
};

// Canvas
const canvas = document.getElementById("scene-canvas");

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f14);

// Camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 1.7, 5);

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);
const ambientMusic = new THREE.Audio(listener);
const footstepSound = new THREE.Audio(listener);
const rustleSound = new THREE.Audio(listener);

// Simple loading manager to reflect readiness
const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => setTooltip("Loading assets...");
loadingManager.onLoad = () => setTooltip("Welcome! WASD to move, mouse to look.");
loadingManager.onError = (url) => console.warn("Failed to load:", url);

// HDRI / Environment (optional subtle reflections). Using RGBELoader from examples.
// For fully offline, we skip network env maps and rely on local lighting.
// new RGBELoader(loadingManager)
// 	.setPath("assets/textures/")
// 	.load("studio_small_08_1k.hdr", (hdr) => {
// 		hdr.mapping = THREE.EquirectangularReflectionMapping;
// 		scene.environment = hdr;
// 	});

// Store references on app object
StoreApp.scene = scene;
StoreApp.camera = camera;
StoreApp.renderer = renderer;
StoreApp.listener = listener;
StoreApp.footstepSound = footstepSound;
StoreApp.rustleSound = rustleSound;
StoreApp.ambientMusic = ambientMusic;

// Resize handling
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// Controls (Orbit disabled by default; navigation replaces this with pointer-lock)
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.enabled = false;

// Build environment
const environment = buildEnvironment(THREE, scene, loadingManager);

// Optimization manager
const optimization = createOptimization(THREE, renderer, scene);
optimization.setGraphics(StoreApp.state.graphics);

// Interactions and Try-On systems
const interactions = createInteractionSystem(THREE, scene, camera, renderer, StoreApp);
const tryOn = createTryOnSystem(THREE, scene, camera, renderer, StoreApp);

// Navigation (WASD + mouse look + teleport hotspots)
const navigator = createNavigator(THREE, scene, camera, renderer, StoreApp, {
	height: 1.7,
	speed: 2.6,
});
StoreApp.navigator = navigator;

// UI & Panels
const ui = createUI(StoreApp, {
	ambientMusic,
	footstepSound,
	rustleSound,
	setGraphics: (quality) => optimization.setGraphics(quality),
});
const panels = createPanels(StoreApp, interactions, tryOn);

// Audio buffer loading (placeholders). Files are empty/silent if not provided.
const audioLoader = new THREE.AudioLoader(loadingManager);
audioLoader.load("./audio/ambient.mp3", (buffer) => {
	ambientMusic.setBuffer(buffer);
	ambientMusic.setLoop(true);
	ambientMusic.setVolume(0.35);
});
audioLoader.load("./audio/footstep.mp3", (buffer) => {
	footstepSound.setBuffer(buffer);
	footstepSound.setVolume(0.5);
});
audioLoader.load("./audio/rustle.mp3", (buffer) => {
	rustleSound.setBuffer(buffer);
	rustleSound.setVolume(0.5);
});

// Entry overlay: start app and pointer lock
const entryOverlay = document.getElementById("entry-overlay");
const enterBtn = document.getElementById("enter-btn");

enterBtn.addEventListener("click", async () => {
	entryOverlay.style.display = "none";
	// Play ambient music when unlocked
	try { ambientMusic.play(); } catch (e) {}
	// Request pointer lock through navigator module
	navigator.requestPointerLock();
	setTooltip("Explore the store. Aim at items to preview.");
});

// Tooltip helper
function setTooltip(text) {
	const tip = document.getElementById("tooltip");
	if (!tip) return;
	tip.textContent = text;
	tip.hidden = !text;
}

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	const dt = StoreApp.clock.getDelta();
	orbit.update();
	navigator.update(dt);
	interactions.update(dt);
	tryOn.update(dt);
	for (const mixer of StoreApp.mixers) mixer.update(dt);
	renderer.render(scene, camera);
}
animate();

// Expose some controls for debugging via console
window.__STORE__ = { THREE, StoreApp, scene, camera, renderer };