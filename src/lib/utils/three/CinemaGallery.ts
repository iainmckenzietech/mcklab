// CinemaGallery.ts (updated - bloom threshold tweak)
import * as THREE from 'three';
import { get } from 'svelte/store';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'; // Keep this for the main bloom pass
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

import {
	ChromaticAberrationShader,
	RadialBlurShader,
	// Remove StarfieldShader as it's not used directly here
	StarfieldShader
} from './shaders';
import { getBoundsAtDepth } from './maths';
import { createSafePerlinNoiseTexture, createSafeProceduralStarTexture } from './helpers';
import { Starfield } from './Starfield';
import { Nebula } from './Nebula';
import { FloatingObjectsManager, type FloatingObject } from './FloatingObjectsManager';
import { AssetLoader, type LoadedAssets } from './AssetLoader';
import { setPerlinTexture } from './materials';
import { SPROCKET_BLOOM_LAYER } from './layers'; // ✅ ADD: Import the new layer constant

import { PerformanceMonitor, type QualityLevel } from './PerformanceMonitor';
import { activeAudio as activeAudioStore, currentTrack, phase, ExperiencePhase } from '$lib/stores';

// --- CONSTANTS & LAYERS ---
const BLOOM_LAYER = 1; // A dedicated layer for objects that should bloom.

// --- BLOOM EFFECT TUNING (Adjusted for selective bloom) ---
const BLOOM_CONFIG = {
	strength: 0.4,   // ✅ TWEAK: Further reduced strength for subtlety.
	radius: 0.4,   // ✅ TWEAK: Further reduced radius for a crisper glow.
	threshold: 0.35  // ✅ TWEAK: Slightly increased threshold to tighten the glow source.
};

// ✅ ROBUSTNESS: Centralized configuration for tunable parameters.
const GALLERY_CONFIG = {
	CAMERA_Z: 7.1,
	WARP_INTENSITY: 4.5,
	FILM_GRAIN_INTENSITY: 0.35,
	STARFIELD_FINAL_GLOW: 0.85 // The final resting brightness/glow of the stars after the warp.
};

// --- AUDIO REACTIVITY TUNING ---
const AUDIO_REACTIVE_CONFIG = {
	// How loud the mid-range frequencies need to be (0-255) to trigger the nebula pulse.
	NEBULA_THRESHOLD: 20,
	// How loud the bass frequencies need to be (0-255) to trigger the monkey jitter.
	MONKEY_KICK_THRESHOLD: 190,
	// The range of frequency bins for bass/kick drum detection.
	KICK_BINS: { start: 10, end: 30 },
	// The range of frequency bins for mid-ranges/swell detections.
	SWELL_BINS: { start: 10, end: 60 }
};

interface CinemaGalleryProps {
	settings: any;
	audioManager?: any;
	teleportAudio: HTMLAudioElement;
	filmstripAudio: HTMLAudioElement;
	onWarpPeak: () => void;
	onTeleportsComplete: () => void;
	posts: any[];
	onSlideClick: (post: any) => void;
	onFilmstripReady: () => void; // <-- ADD THIS
	titlesContainer: HTMLElement;
	onMusicComplete: () => void;
}

interface VisibilityConfig {
	stars?: boolean;
	nebula?: boolean;
	objects?: boolean;
}

// ✅ ROBUSTNESS: A state machine to manage the application lifecycle.
enum GalleryState {
	Initializing,
	Ready,
	Warping,
	Disposed
}

// --- CLASS DEFINITION ---
export class CinemaGallery {
	public targetPosition: number = 0;
	public currentPosition: number = 0;
	public isInputActive: boolean = false;
	public props: CinemaGalleryProps;
	
	private canvas: HTMLCanvasElement;
	private renderer: THREE.WebGLRenderer;
	private camera: THREE.PerspectiveCamera;
	private scene: THREE.Scene;
	private backgroundScene: THREE.Scene; // Scene for stars, nebula
	private composer: EffectComposer;
	private bloomLayer = new THREE.Layers();
	private darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' }); // Used for selective bloom
	private originalMaterials: { [key: string]: THREE.Material | THREE.Material[] } = {};
	private nonBloomingObjects: THREE.Mesh[] = []; // ✅ PERFORMANCE: Cache for bloom effect
	private bloomPass: UnrealBloomPass;
	private bloomComposer: EffectComposer;
	private finalPass: ShaderPass;
	private radialBlurPass: ShaderPass;
	private filmPass: FilmPass; // ✅ ADD: To hold a reference to the film pass
	private chromaticPass: ShaderPass; // For warp effect
	private clock: THREE.Clock;
	private perlinNoiseTexture: THREE.Texture;
	private nebula: Nebula | null = null;
	private frameCounter: number = 0;
	private qualityLevel: QualityLevel = 'high';
	private floatingObjects: FloatingObjectsManager | null = null;

 
	private starfield: Starfield | null = null;
	private responsiveScale: number = 1;
	private viewBounds: { x: number, y: number };
	private masterWarpIntensity: number = 0;
	private mouse: THREE.Vector2 = new THREE.Vector2();
	

	private resizePending: boolean = false;
	private currentWarp: number = 0.0; // For starfield stretching during scroll
	private interactionsEnabled: boolean = false; // ✅ ADD: Guard for filmstrip interaction
	private warpActivated: boolean = false; // ✅ ADD: Track warp state
	private state: GalleryState = GalleryState.Initializing;

	// --- AUDIO REACTIVITY ---
	private lastTriggerTime = 0; // Throttling for audio cues
	private TRIGGER_COOLDOWN = 250; // ms; adjust for drum spacing in zarathustra

	// --- AUDIO REACTIVITY ---
	// ✅ PERFORMANCE: Add properties for throttling raycasting.
	private lastRaycastTime = 0;
	private raycastDebounceTimer: number | null = null; // ✅ PERFORMANCE (Item #5)
	private readonly raycastInterval = 1000 / 30; // ~30 FPS
	// ✅ FIX: Add properties for click debouncing
	private lastClickTime = 0;
	private readonly clickDebounce = 300; // 300ms between clicks
	private activeAudioElement: HTMLAudioElement | null = null;

	constructor(props: CinemaGalleryProps & { canvas: HTMLCanvasElement, titlesContainer: HTMLElement }) {
		// ✅ FIX: Assign the canvas from the properties.
		this.canvas = props.canvas;
		this.props = props;
		this.responsiveScale = window.innerWidth < 768 ? 0.8 : 1;
		this.clock = new THREE.Clock();
		this.viewBounds = { x: window.innerWidth, y: window.innerHeight };

		// Bind methods
		this.setupThree = this.setupThree.bind(this);
		this.createContent = this.createContent.bind(this);
		this.animate = this.animate.bind(this);
		this.resize = this.resize.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		// Arrow functions are auto-bound; manual binding removed to prevent initialization errors

		// Subscribe to the active audio element for the visualizer
		activeAudioStore.subscribe((audio) => (this.activeAudioElement = audio));
		this.bloomLayer.set(BLOOM_LAYER); // Initialize the bloom layer helper
	}

	// ✅ PERFORMANCE (Item #7): New methods to use the cached list of objects.
	// This avoids traversing the entire scene on every frame.
	private darkenNonBloomers() {
		for (const obj of this.nonBloomingObjects) {
			if (obj.material !== this.darkMaterial) {
				this.originalMaterials[obj.uuid] = obj.material;
				obj.material = this.darkMaterial;
			}
		}
	}

	private restoreOriginalMaterials() {
		for (const obj of this.nonBloomingObjects) {
			if (this.originalMaterials[obj.uuid]) {
				obj.material = this.originalMaterials[obj.uuid] as THREE.Material;
				delete this.originalMaterials[obj.uuid];
			}
		}
	}

	public init(): Promise<void> {

		return new Promise(async (resolve, reject) => {
			try {
				while (this.canvas.clientWidth === 0) {
					await new Promise(res => setTimeout(res, 50));
				}

				const assets = await AssetLoader.loadAll();
				this.perlinNoiseTexture = assets.perlinTexture;
				setPerlinTexture(this.perlinNoiseTexture);

				this.setupThree(assets.placeholderTexture);
				this.addContextHandlers(); // ✅ ROBUSTNESS: Add context loss handlers

				// ✅ STABILITY: Skip the expensive FPS check which can cause context loss on weak devices during load.
				// Instead, use a heuristic based on logical screen size and pixel ratio.
				const width = this.canvas.clientWidth;
				const height = this.canvas.clientHeight;
				const pixelCount = width * height * window.devicePixelRatio;
				
				if (window.devicePixelRatio > 2 || pixelCount > 2000000) {
					this.qualityLevel = 'medium'; // Safer default for high-res screens
				} else {
					this.qualityLevel = 'high';
				}
				
				// ✅ FIX: Move starfield creation here, after quality check, and await createContent.
				await this.createContent(assets);

				this.renderer.setAnimationLoop(this.animate); // ✅ ROBUSTNESS: Use the recommended animation loop

				setTimeout(this.resize, 0); // Defer initial resize

				window.addEventListener('resize', this.resize);
				window.addEventListener('mousemove', this.onMouseMove);
				document.addEventListener('visibilitychange', this.handleVisibilityChange);

				this.cacheSceneObjects();
				// ✅ FIX: isReady is now set only after all async setup is complete.

				this.markAsReady();
				resolve();
			} catch (error) {
				// Fallback for critical errors
				if (!this.perlinNoiseTexture) {
					this.perlinNoiseTexture = createSafePerlinNoiseTexture();
					setPerlinTexture(this.perlinNoiseTexture);
					this.setupThree(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
					this.renderer.setAnimationLoop(this.animate);
				}
				reject(error);
			}
		});
	}

	/**
	 * ✅ NEW: Dims or brightens the background elements to shift focus.
	 * @param shouldDim - True to dim the background, false to restore brightness.
	 */
	public dimBackground(shouldDim: boolean): void {
		const duration = 1.5;
		const ease = 'power2.out';

		// Dim starfield
		this.starfield?.setBrightness(shouldDim ? 0.1 : 0.3, duration, ease);

		// Dim nebula
		if (this.nebula?.mesh.material instanceof THREE.ShaderMaterial) {
			const targetOpacity = shouldDim ? (this.responsiveScale < 1 ? 0.4 : 0.15) : 0.6;
			gsap.to(this.nebula.mesh.material.uniforms.u_opacity, { value: targetOpacity, duration, ease });
		}

		// Dim floating objects
		this.floatingObjects?.setBrightness(shouldDim ? 0.6 : 1.0, duration, ease);
	}

	// ✅ PERFORMANCE: New method to traverse the scene only once.
	private cacheSceneObjects() {
		this.nonBloomingObjects = [];
		// ✅ FIX: Correctly identify non-blooming objects.
		// An object is non-blooming if it's NOT on the base bloom layer AND NOT on the sprocket bloom layer.
		this.scene.traverse((obj) => {
			const isMesh = (obj as THREE.Mesh).isMesh;
			if (!isMesh) return;
			const isBlooming = obj.layers.test(this.bloomLayer) || obj.layers.isEnabled(SPROCKET_BLOOM_LAYER);
			if (!isBlooming) {
				this.nonBloomingObjects.push(obj as THREE.Mesh);
			}
		});
	}

	/**
	 * ✅ ADD: Dims or brightens the main scene elements to focus/unfocus the view.
	 * This is called from the Svelte component to create focus on the player.
	 * @param dim - True to dim the scene, false to restore brightness.
	 */
	public dimScene(dim: boolean): void {
		// Dim the nebula and stars
		this.dimBackground(dim);
	}

	// ──────────────────────────────────────────────────────────────
	//  PUBLIC: Safe warp trigger – call this from UniverseScene
	// ──────────────────────────────────────────────────────────────

	public activateWarpEffect() {
		// Only trigger if the gallery is in a ready state.
		if (this.state !== GalleryState.Ready) return;
		this.triggerWarpSequence();
	}

	// Call this from the very end of init() when everything is truly ready
	public markAsReady() {
		if (this.state === GalleryState.Initializing) {
			this.state = GalleryState.Ready;
		} else if (this.state === GalleryState.Warping) {
			this.triggerWarpSequence();
		}
	}
	
	private triggerWarpSequence() {
		if (this.warpActivated || !this.starfield) return;
		this.warpActivated = true;

		const tl = gsap.timeline({
			onComplete: () => {
				this.warpActivated = false; // Keep this
				this.masterWarpIntensity = 0; // Keep this
				// ✅ FINAL POLISH: Gently fade the star glow back in after the warp for a magical effect.
				if (this.starfield) {
					const mat = this.starfield.material as THREE.ShaderMaterial;
					gsap.fromTo(
						mat.uniforms.u_warpGlow,
						{ value: mat.uniforms.u_warpGlow.value }, // Start from whatever it is now
						{
							value: GALLERY_CONFIG.STARFIELD_FINAL_GLOW, // Use the configurable value
							duration: 4,
							ease: 'power2.out'
						}
					);
				}
			}
		});

		// Make stars brighter during the warp for a more dramatic effect
		this.starfield?.setBrightness(1.5, 1.0, 'power2.in');

		gsap.to(this.starfield.material.uniforms.u_warpGlow, {
			value: 4.0, duration: 0.8, ease: 'power2.inOut', yoyo: true, repeat: 1
		});

		tl.to(this, {
			masterWarpIntensity: GALLERY_CONFIG.WARP_INTENSITY,
			duration: 1.8, // Increased duration for a slower warp effect
			ease: 'power2.inOut',
			yoyo: true,
			repeat: 1,
		}, 0);

		// Animate in the "other" objects slightly before the warp peak.
		tl.call(() => {
			// The "other" objects start animating in first with a faster animation.
			// When they are all done (which should be right around 1.8s), the onComplete callback will fire.
			this.floatingObjects?.animateInOtherObjects(() => {
				// NOW, trigger the nebula and the astronaut together.
				this.nebula?.startIntroAnimation(this.camera);
				this.floatingObjects?.animateInAstronaut();
			});
		}, null, 1.0);

		// At the peak of the warp (1.8s), fade in the UI. The main animations are now handled by the callback.
		tl.call(() => {
			this.props.onWarpPeak?.();
			this.dimBackground(true); // Dim the background to make the filmstrip pop.
			phase.set(ExperiencePhase.FILMSTRIP_GALLERY); // ✅ TRIGGER UI FADE-IN
			this.starfield?.setBrightness(0.3, 1.0, 'power1.in');
			this.interactionsEnabled = true;
		}, null, 2.5); // Adjust this to match the new duration
	}


	public setVisibility(config: VisibilityConfig) {
		if (config.stars !== undefined) this.starfield?.setVisible(config.stars);
		if (config.nebula !== undefined) this.nebula?.setVisible(config.nebula);
		if (config.objects !== undefined) this.floatingObjects?.setVisible(config.objects);
	}

	public dispose() {
		if (this.state === GalleryState.Disposed) return;
		this.state = GalleryState.Disposed;

		console.log('Disposing CinemaGallery resources...');

		// 1. Stop the animation loop
		this.renderer.setAnimationLoop(null);

		// 2. Remove all event listeners
		window.removeEventListener('resize', this.resize);
		window.removeEventListener('mousemove', this.onMouseMove);
		
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		this.removeContextHandlers();

		// 3. Dispose of managers and custom objects
		this.filmstripManager?.dispose();
		this.floatingObjects?.dispose();
		this.starfield?.dispose();
		this.nebula?.dispose();

		// 4. Traverse the scenes and dispose of all materials, geometries, and textures
		this.scene.traverse(object => {
			if (object instanceof THREE.Mesh) {
				object.geometry?.dispose();
				// Handle arrays of materials
				if (Array.isArray(object.material)) {
					object.material.forEach(material => material.dispose());
				} else if (object.material) {
					object.material.dispose();
				}
			}
		});
		this.perlinNoiseTexture?.dispose();

		// 5. Dispose of post-processing and the renderer itself
		this.composer?.dispose();
		this.bloomComposer?.dispose();
		this.renderer.dispose();
		this.props.audioManager?.unregister();
	}
	
	private setupThree(placeholderTexture: THREE.Texture) {
		// ✅ FIX: Ensure the canvas rendering buffer matches its client size.
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		this.canvas.width = width;
		this.canvas.height = height;

		// ✅ ROBUSTNESS: Updated renderer options for better compatibility and performance.
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true, // Keep antialiasing for quality
			alpha: true,     // Keep alpha for transparency
			powerPreference: 'high-performance', // Request the high-performance GPU
			failIfMajorPerformanceCaveat: false  // CRITICAL: Allows running on software rendering as a fallback.
		});
		// Note: We removed `context: this.canvas.getContext('webgl2')`.
		// Three.js will now automatically request a WebGL2 context if available,
		// and gracefully fall back to WebGL1 if not.
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.autoClear = false;

		this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 2000);
		// ✅ CONFIG: Use centralized value for camera position.
		this.camera.position.z = GALLERY_CONFIG.CAMERA_Z;

		this.scene = new THREE.Scene();
		this.backgroundScene = new THREE.Scene();

		// --- Render Passes ---
		// These define what to render. We need one for the background and one for the main scene.
		const renderPass = new RenderPass(this.scene, this.camera);
		const bgRenderPass = new RenderPass(this.backgroundScene, this.camera);
		bgRenderPass.clear = true; // Clear before drawing background
		renderPass.clear = false; // Don't clear, draw on top of background

		// --- Bloom Pass (for glowing objects) ---
		// ✅ PERFORMANCE: Use half-resolution for bloom to save massive fill-rate overhead.
		// Bloom is blurry by nature, so full resolution is wasteful.
		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(width / 2, height / 2),
			BLOOM_CONFIG.strength, BLOOM_CONFIG.radius, BLOOM_CONFIG.threshold
		);

		// --- Bloom Composer ---
		// This composer's job is to render ONLY the glowing objects and create the bloom texture.
		this.bloomComposer = new EffectComposer(this.renderer);
		this.bloomComposer.renderToScreen = false; // We only want the resulting texture, not to draw it on screen.
		this.bloomComposer.addPass(bgRenderPass);
		this.bloomComposer.addPass(renderPass);
		this.bloomComposer.addPass(this.bloomPass);

		// --- Final Composer ---
		// This composer renders the normal scene, then adds the bloom effect on top, and finally adds other effects.
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(bgRenderPass);
		this.composer.addPass(renderPass);

		// The Mix Pass is the key: it takes the normal scene and additively blends the bloom texture.
		const mixPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: { value: null },
					bloomTexture: { value: this.bloomComposer.renderTarget2.texture } // The output of the bloom composer
				},
				vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
				fragmentShader: `
					uniform sampler2D baseTexture;
					uniform sampler2D bloomTexture;
					varying vec2 vUv;
					void main() { gl_FragColor = texture2D( baseTexture, vUv ) + texture2D( bloomTexture, vUv ); } // Additive blend
				`,
			}), 'baseTexture'
		);
		mixPass.needsSwap = true;
		this.composer.addPass(mixPass);

		this.radialBlurPass = new ShaderPass(RadialBlurShader);
		this.radialBlurPass.enabled = false;
		this.composer.addPass(this.radialBlurPass);

		this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
		this.chromaticPass.enabled = false;
		this.composer.addPass(this.chromaticPass);

		this.filmPass = new FilmPass(GALLERY_CONFIG.FILM_GRAIN_INTENSITY, 0.95, 2048, false);
		this.composer.addPass(this.filmPass);
		if (this.qualityLevel === 'low') this.filmPass.enabled = false;
	}

	/**
	 * ✅ ROBUSTNESS: Sets up event listeners for WebGL context loss and restoration.
	 */
	private addContextHandlers(): void {
		this.canvas.addEventListener('webglcontextlost', this.handleContextLoss, false);
		this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
	}

	private removeContextHandlers(): void {
		this.canvas.removeEventListener('webglcontextlost', this.handleContextLoss, false);
		this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
	}

	private handleContextLoss = (event: Event): void => {
		event.preventDefault();
		console.warn('WebGL context lost. Pausing renderer.');
		this.renderer.setAnimationLoop(null); // Stop rendering
	};

	private handleContextRestored = (): void => {
		console.log('WebGL context restored. Re-initializing...');
		// Re-initialize all GPU-dependent resources. This is a simplified approach.
		// A full implementation would re-create textures, materials, and buffers.
		this.setupThree(this.perlinNoiseTexture); // Re-run setup
		this.renderer.setAnimationLoop(this.animate); // Restart rendering
	};
	private async createContent(assets: LoadedAssets): Promise<void> {
		// ✅ FIX: Cleaned up starfield creation.
		// The static `Starfield.create` method is async and handles all initialization internally.
		// The erroneous call to a non-existent `.init()` method has been removed.
		// This resolves the TypeError and follows the modern factory pattern.
		this.starfield?.dispose(); // Dispose if it exists from a hot-reload or previous state
		this.starfield = await Starfield.create(this.backgroundScene, this.renderer, this.qualityLevel, assets.starCrossTexture, assets.starGlowTexture);

		this.nebula = new Nebula(this.backgroundScene, assets.perlinTexture, assets.nebulaTexture);
		// Pass null for the filmstripManager argument
		this.floatingObjects = new FloatingObjectsManager(this.backgroundScene, this.camera, this.perlinNoiseTexture, this.props.audioManager, window.innerWidth < 768, null);

		// --- FILMSTRIP INTEGRATION ---
		// this.filmstripManager = new FilmstripManager({
		// 	posts: this.props.posts,
		// 	scene: this.scene,
		// 	camera: this.camera,
		// 	titlesContainer: this.props.titlesContainer, // This is now correctly passed
		// 	onSlideClick: this.props.onSlideClick, // ✅ FIX: Pass the handler from the parent
		// 	audioManager: this.props.audioManager // 🔥 FIX: Pass AudioManager
		// });
		// await this.filmstripManager.init();
		this.filmstripManager = null; // Ensure it's null

		await this.prewarmShadersAndTextures();

		return Promise.resolve();
	}

	private async prewarmShadersAndTextures() {
		if (!this.starfield) return;

		// ✅ STABILITY: Only force material compilation, DO NOT trigger a full render.
		// Rendering a heavy frame during initialization causes TDR (Timeout Detection Recovery) crashes on some GPUs.
		const mat = this.starfield.material as THREE.ShaderMaterial;
		mat.uniforms.u_time.value += 0.001;
		mat.needsUpdate = true;
		
		// We skip the full composer.render() call here to prevent the "BindToCurrentSequence failed" crash.
		// The shader compile will happen lazily on the first warp frame, which is an acceptable trade-off.
	}

	public handleAudioCue(action: string) {
		this.nebula?.handleAudioCue(action, this.camera);
		this.floatingObjects?.handleAudioCue(action);
		if (action === 'FINAL_CLIMAX') { // Example of a specific cue
			// The final shake is now timed, but we could add other audio-based effects here.
		}
	}

	// --- INTERACTION HANDLERS ---
	// ✅ REFACTORED: Pointer Event Delegation
	// These handlers now do ONE thing: tell the specialist what happened.
	


	/**
	 * ✅ OPTIMIZATION: Handles background throttling to save battery and CPU.
	 */
	private handleVisibilityChange = () => {
		if (document.hidden) {
			// Tab is hidden: pause audio and stop the render loop.
			this.props.audioManager?.duckMainTrack(true, 0.1); // Quick fade out
			this.clock.stop();
		} else {
			// Tab is visible: resume audio and restart the render loop.
			this.props.audioManager?.duckMainTrack(false, 0.5); // Smooth fade in
			this.clock.start();
		}
	};

	private triggerCameraShake(duration = 2, intensity = 0.5) {
		const originalPos = this.camera.position.clone(); // Save to reset
		const shakeProxy = { intensity: intensity };

		// A GSAP ticker function that runs every frame during the tween
		const onUpdate = () => {
			const currentIntensity = shakeProxy.intensity;
			// Apply a random offset from the original position based on the current intensity
			const x = originalPos.x + gsap.utils.random(-currentIntensity, currentIntensity);
			const y = originalPos.y + gsap.utils.random(-currentIntensity, currentIntensity);
			const z = originalPos.z + gsap.utils.random(-currentIntensity / 2, currentIntensity / 2);

			this.camera.position.set(x, y, z);
			this.camera.lookAt(this.scene.position);
		};

		// Animate the intensity from its starting value down to 0
		gsap.to(shakeProxy, {
			intensity: 0,
			duration: duration,
			ease: 'power2.out', // This ease makes the shake fade out smoothly
			onUpdate: onUpdate,
			onComplete: () => {
				this.camera.position.copy(originalPos); // Ensure it ends exactly where it started
			}
		});
	}

	private rampBloom(intensity: number) {
		if (!this.bloomPass) return;
		gsap.to(this.bloomPass, {
			strength: 1.2 + intensity * 0.5, // Less aggressive bloom ramp for nebula pulses
			duration: 0.3,
			ease: 'power2.out',
			yoyo: true,
			repeat: 1
		});
	}

	private averageFreq(data: Uint8Array, startBin: number, endBin: number): number {
		let sum = 0, count = 0;
		for (let i = startBin; i <= endBin && i < data.length; i++) {
			sum += data[i];
			count++;
		}
		return count > 0 ? sum / count : 0;
	}

	private onMouseMove = (event: MouseEvent): void => {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	
		// Performance throttle
		const now = performance.now();
		if (now - this.lastRaycastTime < this.raycastInterval) {
			return;
		}
		this.lastRaycastTime = now;
	
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(this.mouse, this.camera);
	
		
	};

	public resize() {
		if (!this.resizePending) {
			this.resizePending = true;
			requestAnimationFrame(async () => {
				const width = this.canvas.clientWidth;
				const height = this.canvas.clientHeight;

				// ✅ OPTIMIZATION: Skip redundant resizes if dimensions haven't changed.
				if (this.renderer && width === this.renderer.domElement.width && height === this.renderer.domElement.height) {
					this.resizePending = false;
					return;
				}

				if (width <= 0 || height <= 0) {
					this.resizePending = false;
					return;
				}

				// Explicitly set the canvas buffer size to prevent stretching.
				this.canvas.width = width;
				this.canvas.height = height;

				// RESIZE CORE
				this.camera.aspect = width / height;
				this.camera.updateProjectionMatrix();
				this.renderer.setSize(width, height);
				this.composer.setSize(width, height);
				this.bloomComposer.setSize(width / 2, height / 2); // Keep bloom at half-res for performance
				this.viewBounds = { x: width, y: height };

				this.nebula?.resize(this.camera); // This will now correctly resize the nebula
				this.floatingObjects?.resize(this.camera);

				this.resizePending = false;
			});
		}
	}

	// ✅ REFACTORED: Grouped audio reactivity logic for clarity.
	private updateAudioReactivity() {
		if (this.activeAudioElement && !this.activeAudioElement.paused && this.props.audioManager) {
			const trackName = get(currentTrack);
			// Only trigger nebula animations when 'epic_theme' is playing AND after the initial build-up.
			if (trackName === 'epic_theme' && this.activeAudioElement.currentTime > 26) {
				const freqData = this.props.audioManager.getFrequencyData();

				if (freqData && freqData.length > 0) {
					const midAvg = this.averageFreq(freqData, AUDIO_REACTIVE_CONFIG.SWELL_BINS.start, AUDIO_REACTIVE_CONFIG.SWELL_BINS.end);
					const midIntensity = midAvg / 255;

					if (midAvg > AUDIO_REACTIVE_CONFIG.NEBULA_THRESHOLD) {
						this.nebula?.pulse(midIntensity);
					}
				}
			}
		}
	}

	public animate = () => {
		// The animation loop is now controlled by renderer.setAnimationLoop,
		// so we don't need to call requestAnimationFrame manually.

		// ✅ PERFORMANCE: Skip rendering if we are on the static intro screen.
		// This frees up massive GPU resources for the DOM-based intro animations.
		const currentPhase = get(phase);
		if (currentPhase === ExperiencePhase.INITIAL_SCREEN && !this.warpActivated) {
			return;
		}

		const elapsedTime = this.clock.getElapsedTime();

		// --- STATE & THROTTLING LOGIC ---
		const isCurrentlyWarping = this.masterWarpIntensity > 0;

		// --- POST-PROCESSING (Corrected Logic) ---
		this.bloomPass.enabled = true; // Bloom is almost always on

		const isWarping = this.masterWarpIntensity > 0;

		// Film grain: ON during warp, OFF otherwise (saves a ton of mobile perf)
		this.filmPass.enabled = isWarping && this.qualityLevel !== 'low';

		// Radial blur & chromatic aberration: ONLY during warp
		if (this.radialBlurPass) {
			this.radialBlurPass.enabled = isWarping;
			if (isWarping) this.radialBlurPass.uniforms.u_strength.value = this.masterWarpIntensity * 1.5;
		}

		if (this.chromaticPass) {
			this.chromaticPass.enabled = isWarping;
			if (isWarping) this.chromaticPass.uniforms.distortionAmount.value = 1.5 + this.masterWarpIntensity * 10.0;
		}

		// --- UPDATES (EVERY FRAME) ---
		this.nebula?.update();

		// --- UPDATES (~30 FPS) ---
		if (this.frameCounter % 2 === 0) {
			this.starfield?.update(elapsedTime, this.currentWarp, this.masterWarpIntensity, this.mouse);
			this.floatingObjects?.update(elapsedTime, this.frameCounter, this.mouse);
		}

		// =================================================================
		//                ✅ NEW, ROBUST RENDER PIPELINE
		// =================================================================

		// 1. Traverse the scene and black-out non-glowing objects
		this.darkenNonBloomers();

		// 2. Render the "darkened" scene through the bloom composer.
		// Only glowing objects (which kept their original materials) will contribute to the bloom texture.
		this.bloomComposer.render();

		// 3. Restore the original materials to the scene
		this.restoreOriginalMaterials();

		// 4. Render the final scene with the correct bloom blended on top
		this.composer.render();

		// --- UPDATES (~15 FPS) ---
		// ✅ FIX: Revert to a consistent, throttled update. Forcing updates on interaction was causing performance issues.
		if (this.frameCounter % 4 === 0) {
			this.updateAudioReactivity();
		}

		this.frameCounter++;
	};
}
