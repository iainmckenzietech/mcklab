// src/lib/utils/three/FilmstripManager.ts
import * as THREE from 'three';
import { gsap } from 'gsap';
import { InstancedMesh } from 'three/src/objects/InstancedMesh.js';
import { SPROCKET_BLOOM_LAYER, BLOOM_LAYER } from './layers'; // ✅ ADD: Import the new layer constant
import { popupPlayer } from '$lib/stores';
import { BlurShader } from './shaders'; // ✅ TWEAK: Thinner filmstrip borders on desktop.
import type { AudioManager } from '../AudioManager';

interface FilmstripManagerProps {
	posts: any[];
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	titlesContainer: HTMLElement;
	onSlideClick: (post: any) => void; // ✅ TWEAK: Pass the full post object on click
	audioManager?: AudioManager;
}
const SLIDE_WIDTH = 1.6;
const SLIDE_HEIGHT = 1.25; // This value can be adjusted if needed.
const FILMSTRIP_HEIGHT = 0.45;
const FILMSTRIP_HOLE_WIDTH = 0.18;
const FILMSTRIP_HOLE_HEIGHT = 0.18;
const FILMSTRIP_HOLE_COUNT = 9;
const BORDER_THICKNESS = 1.0;

/** Filmstrip manager – completely self-contained */
export class FilmstripManager {
	/* ---------------------------------------------------------- */
	/*                     PRIVATE STATE                         */
	/* ---------------------------------------------------------- */
	private props: FilmstripManagerProps;
	// ✅ INSTANCING: Replace individual meshes with instanced ones
	private borderInstancedMesh: InstancedMesh | null = null;
	private holeInstancedMesh: InstancedMesh | null = null;
	private borderMaterial: THREE.MeshPhysicalMaterial | null = null;
	private whiteBorderInstancedMesh: InstancedMesh | null = null;
	private whiteBorderMaterial: THREE.MeshStandardMaterial | null = null;
	private holeMaterial: THREE.MeshStandardMaterial | null = null;
	private slideGroups: THREE.Group[] = [];
	private titleElements: any[] = [];
	private responsiveScale = 1.0;
	private GHOST_SLIDES_COUNT = 3; // ✅ TWEAK: Reduced to prevent direct edge duplicates.
	private mobileFilmstripScale = 1.0;
	private slideUnit = 0;
	private totalWidth = 0;
	private totalSlides = 0;
	private videos: (HTMLVideoElement | null)[] = []; // This will store the video elements
	private loadingQueue: number[] = [];
	private activeLoads = 0;
	private maxConcurrentLoads = 4; // ✅ TWEAK: Increased for faster initial load
	private frameCounter = 0;

	// scrolling
	private currentPosition = 0;
	private targetPosition = 0;
	public isScrolling = false;
	public autoScrollSpeed = 0;
	public isDragging = false;
	private dragStartTime = 0; // To detect clicks vs. drags
	private dragDistance = 0;
	private lastDeltaX = 0;
	public isClick = true; // Make public for CinemaGallery to access
	private dragLastX = 0;
	private dragVelocity = 0;
	private isAutoplaying = false;          // start OFF
	public velocity = 0;                    // exposed
	private placeholderTexture: THREE.Texture | null = null;
	private isRevealed: boolean = false;    // ✅ ADD: Flag to control initial title visibility.
	private lastClosestIndex: number = -1;

	private wasInteracting: boolean = false;
	// ✅ FIX: Add properties for unified focus logic.
	public isMobile = window.innerWidth < 768;
	private hoveredSlideIndex: number | null = null;

	// NEW: Property to track last time popup was opened
	private lastPopupTime = 0;
	private readonly popupDebounce = 500; // 500ms

	private audioManager: AudioManager | null = null;
	private audioVolume = 0;
	private videoContainer: HTMLDivElement | null = null; // FIX: Hidden DOM container

	public settings = {
		wheelSensitivity: 0.05, // ✅ TWEAK: Slightly higher for wheel
		touchSensitivity: 0.1, // ✅ TWEAK: Higher for faster response
		// ✅ FIX: Device-aware threshold for better click reliability.
		// Higher on mobile to account for touch/finger slip; lower on desktop for precision.
		// Dynamically computed in handleDragEnd/handlePointerUp.
		dragThreshold: 0, // Placeholder; computed as this.getDragThreshold()
		maxClickDuration: 300,
		momentumMultiplier: 0.5, // ✅ TWEAK: Stronger throw
		smoothing: 0.08, // ✅ TWEAK: Slightly higher for faster settle
		audioFadeSpeed: 0.1,
	};

	// STATE MACHINE:
	// [Add this new private method after settings]
	public getDragThreshold(): number {
		// Update isMobile dynamically using the 1279px tablet breakpoint
		this.isMobile = window.innerWidth < 1279;
		return this.isMobile ? 80 : 60;
	}
	// - Autoplay -> [User Wheel] -> Scrolling
	// - Scrolling -> [Momentum Ends] -> Timeout -> Autoplay
	// - Autoplay -> [User Drag] -> Dragging
	// - Dragging -> [Drag Ends, has momentum] -> Scrolling
	// - Dragging -> [Drag Ends, no momentum] -> Timeout -> Autoplay
	// - Any State -> [Pointer Hover] -> Paused (Hover)
	// - Paused (Hover) -> [Pointer Leave] -> Autoplay
	// - Any State -> [Popup Opens] -> Paused (Popup)
	// - Paused (Popup) -> [Popup Closes] -> Timeout -> Autoplay

	/* ---------------------------------------------------------- */
	/*                     CONSTRUCTOR                           */
	/* ---------------------------------------------------------- */
	constructor(props: FilmstripManagerProps) {
		this.props = props;
		this.responsiveScale = window.innerWidth < 768 ? 0.8 : 0.5;
		this.mobileFilmstripScale = window.innerWidth < 768 ? 0.5 : 1.0;
		this.audioManager = props.audioManager || null;
		
		// ✅ FIX: Subscribe to the popupPlayer store to control autoplay.
		popupPlayer.subscribe(($popup) => {
			if ($popup.isOpen) {
				this.pauseAutoplay();
				this.isScrolling = false; // ✅ ADD: Kill momentum
				this.autoScrollSpeed = 0;
				this.velocity = 0;
				this.dragVelocity = 0;
			} else {
				this.resumeAutoplay(1000); // Resume after a short delay when closed.
				this.currentPosition = this.targetPosition; // ✅ ADD: Snap position to prevent drift
			}
		});
		// Event listeners are now handled by CinemaGallery

		// FIX: Create hidden DOM container for videos
		this.videoContainer = document.createElement("div");
		this.videoContainer.id = "filmstrip-video-container";
		this.videoContainer.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;z-index:-1;";
		document.body.appendChild(this.videoContainer);
	}

	// 👈 **ADD THESE HELPERS** (Class top)
	private setSolidLayer(mesh: THREE.Mesh) {
		mesh.layers.set(0); // SOLID POSTER!
	}

	private setGlowLayer(mesh: THREE.Mesh) {
		mesh.layers.set(BLOOM_LAYER); // GLOWING BORDER!
	}

	/** Call **after** the intro fade-in finishes */
	public startAutoplay() {
		this.isAutoplaying = true;
	}

	/** Pauses the filmstrip's autoplay feature. */
	public pauseAutoplay() {
		this.isAutoplaying = false;
	}

	/** Resumes autoplay after a delay, if the user is not interacting. */
	public resumeAutoplay(delay: number = 1000) {
		setTimeout(() => {
			// ✅ FIX: Only resume if not dragging/scrolling AND not currently hovering over a slide.
			if (!this.isDragging && !this.isScrolling && this.hoveredSlideIndex === null) {
				this.isAutoplaying = true;
			}
		}, delay);
	}

	/** ✅ NEW: Explicitly sets the hovered slide index from the parent (CinemaGallery). */
	public setHoveredIndex(index: number | null) {
		// Only act if the hover state changes.
		if (this.hoveredSlideIndex !== index) {
			this.hoveredSlideIndex = index;

			if (this.hoveredSlideIndex !== null) {
				// If a slide is being hovered, pause autoplay.
				this.pauseAutoplay();
			} else if (!this.isDragging && !this.isScrolling) {
				// If nothing is being hovered and user is not interacting, resume autoplay.
				this.resumeAutoplay(500);
			}
		}
	}
	/* ---------------------------------------------------------- */
	/*                     INITIALISATION                         */
	/* ---------------------------------------------------------- */
	public async init() {
		const placeholder = await new THREE.TextureLoader().loadAsync('/logo.png');
		placeholder.colorSpace = THREE.SRGBColorSpace;
		this.placeholderTexture = placeholder; // ✅ ADD: Cache the placeholder texture.
		const placeholderAspect = placeholder.image.width / placeholder.image.height;

		if (!this.props.posts?.length) return;

		const num = this.props.posts.length;
		this.totalSlides = num + this.GHOST_SLIDES_COUNT * 2;
		this.slideUnit = SLIDE_WIDTH * this.responsiveScale;
		this.totalWidth = this.totalSlides * this.slideUnit;

		// ghosts (end)
		for (let i = 0; i < this.GHOST_SLIDES_COUNT; i++) {
			const idx = (num - this.GHOST_SLIDES_COUNT + i) % num;
			const g = this.createSlide(i, this.props.posts[idx], placeholder, placeholderAspect);
			if (g) { g.userData.isGhost = true; this.slideGroups.push(g); }
		}

		// main slides
		this.props.posts.forEach((p, i) => {
			const g = this.createSlide(this.GHOST_SLIDES_COUNT + i, p, placeholder, placeholderAspect);
			if (g) this.slideGroups.push(g);
		});

		// ghosts (start)
		for (let i = 0; i < this.GHOST_SLIDES_COUNT; i++) {
			const postIndex = i % num; // Correctly wrap around from the beginning of the posts array
			const g = this.createSlide(num + this.GHOST_SLIDES_COUNT + i, this.props.posts[postIndex], placeholder, placeholderAspect);
			if (g) { g.userData.isGhost = true; this.slideGroups.push(g); }
		}

		// ✅ FIX: Initialize the closest index *before* the first update to prevent a race condition on fast scrolls.
		this.lastClosestIndex = this.getClosestSlide().index;
		this.update(); // Run one initial update to load the first set of slides.

		// ✅ INSTANCING: Create instanced meshes after slides are created
		this.createInstancedMeshes();
	}

	private createInstancedMeshes() {
		const numSlides = this.slideGroups.length;
		const numBorders = numSlides * 2; // Top and bottom
		const numHoles = numSlides * FILMSTRIP_HOLE_COUNT * 2;
		const numWhiteBorders = numSlides * 2;

		// --- Border Mesh ---
		const borderBaseGeo = new THREE.PlaneGeometry(1, 1); // Will be scaled by matrix
		this.borderMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x080808,
			metalness: 0.8,
			roughness: 0.6,
			transparent: true,
			opacity: 0.0,
			depthWrite: false, // ✅ FIX: Allow transparent stacking without blocking below
		});
		this.borderInstancedMesh = new InstancedMesh(borderBaseGeo, this.borderMaterial, numBorders);
		this.borderInstancedMesh.name = "FilmstripBorders";
		this.borderInstancedMesh.visible = false; // ✅ FIX: Start invisible to prevent bloom artifacts.
		this.borderInstancedMesh.frustumCulled = false; // ✅ ADD THIS LINE
		this.borderInstancedMesh.renderOrder = 0; // ✅ FIX: Draw first (behind posters/holes)
		this.props.scene.add(this.borderInstancedMesh);

		// --- White Border Lines ---
		const whiteBorderBaseGeo = new THREE.PlaneGeometry(1, 1);
		this.whiteBorderMaterial = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.0,
			emissive: new THREE.Color(0xffffff),
			emissiveIntensity: 1.0,
			depthWrite: false,
		});
		this.whiteBorderInstancedMesh = new InstancedMesh(whiteBorderBaseGeo, this.whiteBorderMaterial, numWhiteBorders);
		this.whiteBorderInstancedMesh.name = "FilmstripWhiteBorders";
		this.whiteBorderInstancedMesh.visible = false;
		this.whiteBorderInstancedMesh.frustumCulled = false;
		this.whiteBorderInstancedMesh.renderOrder = 1; // Above black borders
		this.whiteBorderInstancedMesh.layers.enable(BLOOM_LAYER); // ✅ Add to bloom layer
		this.props.scene.add(this.whiteBorderInstancedMesh);

		// --- Hole Mesh ---
		const holeBaseGeo = new THREE.PlaneGeometry(1, 1);
		// ✅ FIX: Use MeshStandardMaterial to support emissive properties for bloom.
		this.holeMaterial = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			transparent: true, // ✅ FIX: This was missing. Opacity has no effect without it.
			opacity: 0.0, // Start invisible
			emissive: new THREE.Color(0xffffff),
			emissiveIntensity: 1.5,
		});
		this.holeInstancedMesh = new InstancedMesh(holeBaseGeo, this.holeMaterial, numHoles);
		this.holeInstancedMesh.name = "FilmstripHoles";
		this.holeInstancedMesh.visible = false; // ✅ FIX: Start invisible for synchronized reveal.
		this.holeInstancedMesh.frustumCulled = false; // ✅ ADD THIS LINE
		this.holeInstancedMesh.layers.enable(BLOOM_LAYER);
		this.holeInstancedMesh.renderOrder = 2; // ✅ FIX: Draw last (above all)
		this.props.scene.add(this.holeInstancedMesh);

		// We will update these every frame in the update() loop, so we just need to initialize them.
		const dummyMatrix = new THREE.Matrix4();
		for (let i = 0; i < numBorders; i++) {
			this.borderInstancedMesh.setMatrixAt(i, dummyMatrix);
		}
		for (let i = 0; i < numHoles; i++) {
			this.holeInstancedMesh.setMatrixAt(i, dummyMatrix);
		}
		for (let i = 0; i < numWhiteBorders; i++) {
			this.whiteBorderInstancedMesh.setMatrixAt(i, dummyMatrix);
		}
		this.borderInstancedMesh.instanceMatrix.needsUpdate = true;
		this.holeInstancedMesh.instanceMatrix.needsUpdate = true;
	}

	// This is a placeholder that is no longer used with instancing
	public pulseHoles(intensity: number) {
		if (this.holeMaterial) {
			gsap.to(this.holeMaterial, {
				opacity: 0.8 + intensity * 0.2, // Example pulse effect
				emissiveIntensity: 1.5 + intensity * 0.5, // ✅ FIX: Pulse glow too
				duration: 0.2,
				yoyo: true,
				repeat: 1,
				ease: 'power2.out'
			});
		}
	}

	/* ---------------------------------------------------------- */
	/*                     SLIDE CREATION                        */
	/* ---------------------------------------------------------- */
	private createSlide(idx: number, post: any, placeholder: THREE.Texture, placeholderAspect: number) {
		// ✅ ROBUSTNESS: Guard against invalid post data.
		if (!post) return null;

		const group = new THREE.Group();
		group.visible = false; // Start hidden, reveal in animation
		this.props.scene.add(group);

		const w = SLIDE_WIDTH * this.responsiveScale;
		const h = SLIDE_HEIGHT * this.responsiveScale;
		const holeGap = (w - FILMSTRIP_HOLE_WIDTH * this.responsiveScale * FILMSTRIP_HOLE_COUNT) / (FILMSTRIP_HOLE_COUNT + 1);

		const geo = new THREE.PlaneGeometry(w, h, 16, 8);
		geo.userData.originalHeight = h;
		const mat = new THREE.ShaderMaterial({
			...BlurShader, // Assuming BlurShader is imported
			transparent: true,
			uniforms: {
				...BlurShader.uniforms,
				tDiffuse: { value: placeholder },
				u_opacity: { value: 0.0 },
				u_alpha: { value: 0.0 }, // ✅ FIX: Dedicated alpha for consistent trans (avoids black fallback)
				u_brightness: { value: 1.0 },
				u_scanlineIntensity: { value: 0.15 },
				u_noiseIntensity: { value: 0.1 },
				u_velocity: { value: 0 },
			},
		});
		const poster = new THREE.Mesh(geo, mat);
		this.setSolidLayer(poster);
		group.add(poster);
		poster.renderOrder = 1; // ✅ FIX: Draw posters after borders

		/* ---------- title anchor (invisible) ---------- */
		const titleAnchorGeo = new THREE.PlaneGeometry(0.1, 0.1);
		const titleAnchorMat = new THREE.MeshBasicMaterial({ visible: false });
		const titleAnchor = new THREE.Mesh(titleAnchorGeo, titleAnchorMat);
		titleAnchor.userData.isTitleAnchor = true; // Add identifier
		titleAnchor.position.set(0, 0, 0.02); // 🔥 X/Y=0 = DEAD-CENTER!
		group.add(titleAnchor);

		/* ---------- video ---------- */
		const videoUrl = post?.media?.[0]?.url;
		if (videoUrl) {
			const vid = document.createElement('video');
			// ✅ FIX: Ensure videos are always muted.
			vid.muted = true;
			vid.loop = true; // Loop the clip continuously
			vid.playsInline = true;
			vid.crossOrigin = 'anonymous'; // ✅ FIX: Allow cross-origin video loading for textures.
			poster.userData = { index: idx, video: vid, videoUrl, videoLoaded: false, fullRes: false, fallbackTexture: placeholder };
			this.videos[idx] = vid;
			if (this.videoContainer) this.videoContainer.appendChild(vid); // FIX: attach to DOM
		}
		/* ---------- title ---------- */
		const titleInfo = {
			title: post?.style || `VIDEO ${idx + 1}`,
			offset: { x: 0, y: 0 }
		};
		const el = document.createElement('div');
		el.className = 'slide-title';
		el.style.pointerEvents = 'none';
		
		const txt = document.createElement('h2');
		txt.className = 'title-text';
		txt.textContent = titleInfo.title;
		el.appendChild(txt);
		this.props.titlesContainer.appendChild(el);

		this.titleElements.push({
			element: el,
			offset: titleInfo.offset,
			index: idx,
			mesh: titleAnchor,
			loaded: !videoUrl,
		});

		/* ---------- scene & z-positioning ---------- */
		group.position.z = 2.0;
		group.userData.index = idx;
		group.userData.post = post; // ✅ ADD: Store the original post data on the group

		return group;
	}

	/* ---------------------------------------------------------- */
	/*                     FADE-IN                               */
	/* ---------------------------------------------------------- */
	/** Public method to fade in the entire filmstrip and titles simultaneously after the warp. */
	public revealFilmstrip(onStart?: () => void) {
		const tl = gsap.timeline({
			onStart: () => onStart?.(), // ✅ Call the new onStart callback here
			onComplete: () => {
				this.isRevealed = true; // ✅ FIX: Set flag to true after animation.
				// ✅ FIX: Delay autoplay 0.5s post-fade for full settle
				setTimeout(() => this.startAutoplay(), 500);
			}
		});
		tl.set(this.slideGroups, { visible: true }, 0.2);

		// 1. Make the HTML container visible. The 3D groups will be made visible later.
		tl.set(this.props.titlesContainer, { visibility: 'visible' }, 0);


		// 3. Fade in all poster materials.
		this.slideGroups.forEach((group, i) => {
			const poster = group.children[0] as THREE.Mesh;
			if (poster?.material) {
				const material = poster.material as any;
				const staggerDelay = 0.2 + i * 0.03;
				// ✅ FIX: Fade both u_opacity (for texture) and u_alpha (for overall trans)
				tl.to(material.uniforms.u_opacity, { value: 1.0, duration: 1.5, ease: 'power2.out' }, staggerDelay);
				tl.to(material.uniforms.u_alpha, { value: 1.0, duration: 1.5, ease: 'power2.out' }, staggerDelay);
			}
		});

		// ✅ FIX: Directly animate the titles' opacity with GSAP to ensure synchronization.
		// This bypasses the CSS class logic and ties their fade-in directly to the filmstrip reveal.
		const titleElements = this.titleElements.map(t => t.element);
		tl.to(titleElements, {
			opacity: 1,
			duration: 1.0,
			ease: 'power2.out'
		}, 0.5); // Start fading in titles as the posters become visible.

		// 4. Fade in the instanced materials
		// ✅ FIX: Delay to post-poster stagger (t=0.5 = after last poster at ~0.74) — no early tease
		const borderHoleStart = 0.5;

		// ✅ FIX: Set 3D objects to visible AT THE SAME TIME their animation starts.
		// This prevents a "ghost" render of the transparent borders before they fade in.
		tl.call(() => {
			this.slideGroups.forEach(g => g.visible = true);
			if (this.borderInstancedMesh) this.borderInstancedMesh.visible = true;
			if (this.whiteBorderInstancedMesh) this.whiteBorderInstancedMesh.visible = true;
			if (this.holeInstancedMesh) this.holeInstancedMesh.visible = true;
		}, [], borderHoleStart);
		if (this.borderMaterial) {
			tl.to(this.borderMaterial, { opacity: 0.95, duration: 1.2, ease: 'power2.out' }, borderHoleStart);
		}
		if (this.whiteBorderMaterial) {
			tl.to(this.whiteBorderMaterial, { opacity: 0.6, duration: 1.2, ease: 'power2.out' }, borderHoleStart);
		}
		if (this.holeMaterial) {
			// ✅ FIX: Fade in the sprocket holes.
			tl.to(this.holeMaterial, { opacity: 0.6, duration: 1.2, ease: 'power2.out' }, borderHoleStart); // ✅ FIX: Synchronize with border fade-in
		}
	}
	public startFadeIn() {
		// This method is now a proxy for the main reveal, ensuring compatibility.
		this.revealFilmstrip();
	}

	public getSlideMeshes(): THREE.Mesh[] {
		const meshes = this.slideGroups
			.map(g => {  // Temp: Include ALL (even ghosts/invisible) for testing
				return g.children[0] as THREE.Mesh;
			})
			.filter(m => m);  // Ensure mesh exists
		return meshes;
	}

	/* ---------------------------------------------------------- */
	public setVisible(visible: boolean) {
		this.slideGroups.forEach(group => {
			group.visible = visible;
		});
	}


	/* ---------------------------------------------------------- */
	/*                     RESIZE                                */
	/* ---------------------------------------------------------- */
	public resize() {
		// This method is now much simpler, as scaling handles the visual resize.
		// The core logic is handled by the main resize() in CinemaGallery.
	}



	/* ---------------------------------------------------------- */
	/*                     INTERACTION                           */
	/* ---------------------------------------------------------- */
	public handleWheel(e: WheelEvent) {
		// ✅ FIX: Dynamically adjust sensitivity based on camera distance.
		// A closer camera (smaller z) needs less sensitivity for the same "feel".
		const cameraDistanceFactor = this.props.camera ? Math.max(0.1, this.props.camera.position.z / 8.0) : 1.0;

		const scrollFactor = this.responsiveScale < 1 ? 0.5 : 1;
		const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
		
		// Apply the camera distance factor to the sensitivity.
		const effectiveDelta = -scrollDelta * (this.settings.wheelSensitivity * cameraDistanceFactor) * scrollFactor;
		this.targetPosition += effectiveDelta;

		this.autoScrollSpeed += effectiveDelta * 0.5; // Add a portion of the scroll to momentum

		this.isScrolling = true;
		this.isAutoplaying = false;
	}

	public handleDragStart(x: number, isOverSlide: boolean) {
		// ✅ FIX: Immediately kill any existing momentum when a new drag starts.
		// This prevents a new click/drag from being ignored while the filmstrip is coasting.
		this.isScrolling = false;
		this.autoScrollSpeed = 0;
		this.targetPosition = this.currentPosition; // ✅ FIX: Stop movement instantly so click doesn't miss.

		this.isDragging = true;
		this.dragLastX = x;
		this.dragStartTime = performance.now();
		this.dragDistance = 0;
		this.isClick = true;
		this.isAutoplaying = false;
		this.dragVelocity = 0;
	}

	public handleDragMove(x: number) {
		if (!this.isDragging) return;

		// ✅ FIX: Dynamically adjust sensitivity based on camera distance.
		const cameraDistanceFactor = this.props.camera ? Math.max(0.1, this.props.camera.position.z / 8.0) : 1.0;

		const touchFactor = this.responsiveScale < 1 ? 1.5 : 1;
		const deltaX = x - this.dragLastX; // Current X minus Last X
		// ✅ FIX: Calculate positionDelta on every move for immediate feedback.
		const positionDelta = deltaX * (this.settings.touchSensitivity * cameraDistanceFactor) * touchFactor;

		this.dragDistance += Math.abs(deltaX);

		// The threshold is now only used to determine if the action is a click or a drag.
		if (this.dragDistance > this.getDragThreshold()) {
			this.isClick = false;
		}

		// ✅ FIX: Apply movement and velocity regardless of the threshold.
		this.targetPosition += positionDelta;
		this.dragVelocity = deltaX * 2.0;
		this.lastDeltaX = positionDelta;
		this.dragLastX = x;
	}

	public handleDragEnd(wasClick: boolean) {
		this.isDragging = false;

		if (wasClick) {
			this.isScrolling = false;
			this.autoScrollSpeed = 0;
			this.targetPosition = this.currentPosition; // ✅ FIX: Ensure no drift after click.
		} else {
			if (Math.abs(this.lastDeltaX) > 0.01) {
				this.autoScrollSpeed = this.lastDeltaX * this.settings.momentumMultiplier * 1.2;
				this.isScrolling = true;
			} else {
				this.resumeAutoplay(1500);
			}
		}

		// Clear momentum variables regardless
		this.lastDeltaX = 0;
		this.dragVelocity = 0;
	}

	public handleSlideClick(logicalIndex: number) {
		const now = Date.now();
		if (now - this.lastPopupTime < this.popupDebounce) return;
		this.lastPopupTime = now; // Update timestamp
		
		// Find by the REAL stored logical index (works after any amount of scrolling/wrapping)
		const slideGroup = this.slideGroups.find(g => g.userData.index === logicalIndex);

		if (slideGroup && !slideGroup.userData.isGhost && slideGroup.userData.post) {
			this.props.onSlideClick(slideGroup.userData.post);
		} else {
			console.warn(`handleSlideClick: No valid slide for index ${logicalIndex}`);
		}
	}
	/* ---------------------------------------------------------- */
	/*                     VIDEO QUEUE                           */
	/* ---------------------------------------------------------- */
	private processQueue(): void {
		while (this.activeLoads < this.maxConcurrentLoads && this.loadingQueue.length) {
			const slideIndexToLoad = this.loadingQueue.shift()!;
			const slideGroup = this.slideGroups.find(g => g.userData.index === slideIndexToLoad);
			if (!slideGroup) continue;

			const poster = slideGroup.children[0] as THREE.Mesh;
			if (!poster || poster.userData.fullRes) {
				continue; // Already loaded or doesn't exist
			}

			this.activeLoads++;
			const { video, videoUrl, index } = poster.userData;

			// ✅ FIX: The crossOrigin attribute MUST be set immediately before setting the src.
			video.crossOrigin = 'anonymous';

			if (import.meta.env.DEV) {
				video.src = `/video-proxy${new URL(videoUrl).pathname}`;
			} else {
				video.src = videoUrl;
			}
			video.load();

			const onCanPlay = () => {
				if (poster.userData.fullRes) return; // Already handled
				poster.userData.fullRes = true;

				const tex = new THREE.VideoTexture(video);
				tex.colorSpace = THREE.SRGBColorSpace;
				tex.wrapS = THREE.ClampToEdgeWrapping;
				tex.wrapT = THREE.ClampToEdgeWrapping;
			// ✅ FIX: Use LinearFilter for better performance on mobile GPUs.
			tex.minFilter = THREE.LinearFilter;
			tex.magFilter = THREE.LinearFilter;

				(poster.material as THREE.ShaderMaterial).uniforms.tDiffuse.value = tex;
				(poster.material as THREE.ShaderMaterial).needsUpdate = true;

				// 🔥 FIX: Start playback immediately. Muted videos are not blocked by autoplay policies.
				video.currentTime = 0; // Reset to start frame, but don't play yet—handle in update()
				video.muted = true; // Reaffirm muted after src load

				const t = this.titleElements.find(o => o.index === index);
				if (t) t.loaded = true;

				this.activeLoads--;
				this.processQueue();
				video.removeEventListener('canplay', onCanPlay);
			};

			const onError = (err: Event) => {
				console.warn('[Filmstrip] Video load failed for slide', index, videoUrl, err);
				this.activeLoads--;
				this.processQueue();
				video.removeEventListener('error', onError);
			};

			video.addEventListener('canplay', onCanPlay);
			video.addEventListener('error', onError);
		}
	}

	/** ✅ NEW: Unloads a high-res video texture to save memory. */
	private unloadFullRes(index: number): void {
		const slideGroup = this.slideGroups.find(g => g.userData.index === index);
		if (!slideGroup) return;

		const poster = slideGroup.children[0] as THREE.Mesh;
		if (!poster || !poster.userData.fullRes) return; // Not loaded or doesn't exist

		poster.userData.fullRes = false;
		const material = poster.material as THREE.ShaderMaterial;
		const currentTexture = material.uniforms.tDiffuse.value as THREE.VideoTexture;

		if (currentTexture && currentTexture.dispose) currentTexture.dispose();
		if (poster.userData.video) poster.userData.video.pause(); // Explicitly pause before changing src
		if (poster.userData.video) poster.userData.video.src = ''; // Stop video download/streaming

		material.uniforms.tDiffuse.value = this.placeholderTexture;
	}
	/* ---------------------------------------------------------- */
	/*                     HYBRID MEDIA HANDLERS                 */
	/* ---------------------------------------------------------- */
	/*                     TITLE PROJECTION                      */
	/* ---------------------------------------------------------- */
	public updateTitlePositions(hoveredSlideIndex: number | null): void {
		// This logic is now handled inside the main update() loop for better synchronization and performance.
	}

	/* ---------------------------------------------------------- */
	/*                     MAIN UPDATE LOOP                      */
	/* ---------------------------------------------------------- */
	public update() {
		// ✅ FIX: Add a guard clause to prevent updates until the filmstrip is fully initialized.
		if (this.totalWidth === 0 || this.slideUnit === 0) return;
		
		// --- FOCUS LOGIC ---
		// Determine which slide is "in focus". On mobile, it's always the closest to the center.
		// On desktop, it's the one being hovered, falling back to the closest.
		const closest = this.getClosestSlide();
		// ✅ FIX: Use the local hoveredSlideIndex state, not the camera userData
		const hoveredIndex = this.hoveredSlideIndex;
		const focusIndex = this.isMobile ? closest.index : (hoveredIndex ?? closest.index);

		// --- AUDIO LOGIC (STATE-DRIVEN) ---
		const isInteracting = this.isDragging || this.isScrolling;
		if (this.audioManager) {
			if (isInteracting && !this.wasInteracting) {
				// Interaction just started
				this.audioManager.duckMainTrack(true, 0.3);
				this.audioManager.triggerSoundEffect('filmstrip_sfx', 0.4);
			} else if (!isInteracting && this.wasInteracting) {
				// Interaction just ended
				this.audioManager.duckMainTrack(false, 0.5);
				this.audioManager.setTrackVolume('filmstrip_sfx', 0, 0.5);
			}
		}
		this.wasInteracting = isInteracting;


		// --- DIMMING & FOCUS ANIMATION ---
		// Only run expensive GSAP animations when the focused slide actually changes.
		if (focusIndex !== this.lastClosestIndex) {
			this.lastClosestIndex = focusIndex; // Set the new index

			// 1. Animate brightness for all slides.
			this.slideGroups.forEach(group => {
				const mesh = group.children[0] as THREE.Mesh;
				if (mesh?.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.u_brightness) {
					const isFocused = group.userData.index === focusIndex;
					gsap.to(mesh.material.uniforms.u_brightness, {
						value: isFocused ? 0.4 : 1.0,
						duration: 0.6,
						ease: 'power2.out',
						overwrite: 'auto' // 🔥 Kills previous conflicting tweens.
					});
				}
			});

			// ⛔️ Title visibility logic has been MOVED OUT of this block.
		}

		// --- VIDEO PLAYBACK & PAUSING (RUNS EVERY FRAME) ---
		this.videos.forEach((v, index) => {
			if (v) {
				// On desktop, play the video when it's in focus.
				if (!this.isMobile && index === focusIndex && v.paused) {
					v.play().catch(e => { /* Ignore errors */ });
				}
				// On ALL devices, if a video is NOT in focus and is currently playing, pause it.
				// This is the key fix for mobile, preventing videos from getting "stuck" in a playing state.
				else if (index !== focusIndex && !v.paused) {
					v.pause();
					v.currentTime = 0; // Optional: Reset video to the beginning when it goes out of focus.
				}
			}
		});
		// --- TITLE VISIBILITY (RUNS EVERY FRAME) ---
		// ✅ FIX: This logic MUST run every frame, outside of the "if" block.
		// This ensures that when `t.loaded` becomes true from the async callback,
		// the title's visibility is updated on the very next frame.
		if (this.isRevealed) {
			// ✅ FIX: Prioritize loading the video for the slide that is currently in focus.
			const focusedPoster = this.slideGroups.find(g => g.userData.index === focusIndex)?.children[0] as THREE.Mesh;
			if (focusedPoster && !focusedPoster.userData.fullRes && !this.loadingQueue.includes(focusIndex)) {
				this.loadingQueue.unshift(focusIndex); // Prioritize by adding to the front of the queue.
			}
			this.titleElements.forEach(t => {
				// A title is visible IF it is the focused index AND its assets are loaded.
				const isVisible = (t.index === focusIndex) && t.loaded; // 👈 THE CRITICAL FIX
				t.element.classList.toggle('visible', isVisible);
			});
		}

		// --- TITLE POSITIONING (RUNS EVERY FRAME) ---
		// ✅ FIX: Update the position of the VISIBLE title on EVERY frame to prevent drift.
		// Find the *focused* title (which may or may not be visible yet)
		const visibleTitle = this.titleElements.find(t => t.index === this.lastClosestIndex);
		
		// Only update its position if its classList is now 'visible'
		if (visibleTitle && visibleTitle.element.classList.contains('visible')) {
			const vec = new THREE.Vector3();
			visibleTitle.mesh.getWorldPosition(vec).project(this.props.camera);
			const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
			const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
			visibleTitle.element.style.setProperty('--x', `${x}px`);
			visibleTitle.element.style.setProperty('--y', `${y}px`);
		}

		// FIX: Only load videos within VISIBLE_RANGE of focus to prevent queue contention
		const VISIBLE_RANGE = 3;
		this.slideGroups.forEach(group => {
			const index = group.userData.index;
			const poster = group.children[0] as THREE.Mesh;
			if (!poster || !poster.userData.videoUrl || poster.userData.fullRes || this.loadingQueue.includes(index)) return;
			const rawDistance = Math.abs(index - focusIndex);
			const wrappedDistance = Math.min(rawDistance, this.totalSlides - rawDistance);
			if (wrappedDistance <= VISIBLE_RANGE) {
				this.loadingQueue.push(index);
			}
		});

		// ✅ FIX: Process the queue after the main state has been updated to resolve race conditions.
		this.processQueue();
		/* ---- momentum & settling ---- */
		if (this.isScrolling) {
			this.targetPosition += this.autoScrollSpeed;
			this.autoScrollSpeed *= 0.92;
			if (Math.abs(this.autoScrollSpeed) < 0.001) {
				this.isScrolling = false;
				this.autoScrollSpeed = 0;
				this.resumeAutoplay(2000); // Resume autoplay after a delay

			}
		} else if (this.isAutoplaying && !this.isDragging) { // Autoplay only when idle
			const speed = 0.010 * (this.responsiveScale < 1 ? 0.5 : 1);
			this.targetPosition -= speed;

		}
		

		/* ---- smoothing & velocity calculation ---- */
		// ✅ TWEAK: Make dragging even more responsive, especially on mobile.
		const smoothingFactor = this.isDragging ? 0.8 : this.settings.smoothing; // ✅ TWEAK: High lerp during drag for smooth but responsive feel
		this.currentPosition += (this.targetPosition - this.currentPosition) * smoothingFactor;
		this.velocity = this.targetPosition - this.currentPosition;

		if (this.isDragging) {
			this.velocity = this.dragVelocity; // Override for shader
		}

		if (Math.abs(this.velocity) < 0.00001 && !this.isDragging) {
			this.velocity = 0;
			this.currentPosition = this.targetPosition; // Snap to final position
		}

		/* ---- move slides & feed shader ---- */
		const half = this.totalWidth / 2;
		this.slideGroups.forEach(g => {
			const vid = g.children[0] as THREE.Mesh;
			if ((vid.material as THREE.ShaderMaterial).uniforms?.u_velocity) {
				// 🔥 FIX: Only apply motion blur on user interaction (drag/scroll), not during autoplay.
				let shaderVelocity = 0;
				if (this.isDragging) {
					// Use raw drag velocity for instant feedback during a drag.
					shaderVelocity = this.dragVelocity;
				} else if (this.isScrolling) {
					// Use smoothed velocity for wheel scroll momentum.
					shaderVelocity = this.velocity * 50;
				}
				(vid.material as THREE.ShaderMaterial).uniforms.u_velocity.value = shaderVelocity;

				// ✅ ADD: Update time uniform for film grain animation
				if ((vid.material as THREE.ShaderMaterial).uniforms.u_time) {
					(vid.material as THREE.ShaderMaterial).uniforms.u_time.value += 0.01;
				}
			}
		});

		// ✅ INSTANCING: Update instanced mesh matrices
		if (this.borderInstancedMesh && this.holeInstancedMesh && this.whiteBorderInstancedMesh && this.slideGroups.length > 0) {
			let borderInstanceIdx = 0;
			let whiteBorderInstanceIdx = 0;
			let holeInstanceIdx = 0;
			const tempMatrix = new THREE.Matrix4();
			const pos = new THREE.Vector3();
			const quat = new THREE.Quaternion();
			const scale = new THREE.Vector3();

			const w = SLIDE_WIDTH * this.responsiveScale;
			const h = SLIDE_HEIGHT * this.responsiveScale;
			const whiteBorderThickness = 0.01 * this.responsiveScale * this.mobileFilmstripScale;
			const filmstripHeight = FILMSTRIP_HEIGHT * this.responsiveScale * this.mobileFilmstripScale;
			const holeWidth = FILMSTRIP_HOLE_WIDTH * this.responsiveScale;
			const holeHeight = FILMSTRIP_HOLE_HEIGHT * this.responsiveScale * this.mobileFilmstripScale;
			const holeGap = (w - holeWidth * FILMSTRIP_HOLE_COUNT) / (FILMSTRIP_HOLE_COUNT + 1);
			const startX = -w / 2 + holeGap + holeWidth / 2;

			this.slideGroups.forEach(group => {
				// ✅ FIX: Calculate and apply the wrapped position for each group inside the update loop.
				const initialX = (-this.totalWidth / 2 + group.userData.index * this.slideUnit + this.slideUnit / 2);
				let x = initialX - this.currentPosition;
				x = ((x + half) % this.totalWidth + this.totalWidth) % this.totalWidth - half;
				group.position.x = x;

				// ✅ FIX: Force an update of the group's world matrix before using it.
				group.updateMatrixWorld(true);

				// Top border
				pos.set(0, h / 2 + filmstripHeight / 2, 0);
				scale.set(w, filmstripHeight, 1);
				tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
				this.borderInstancedMesh!.setMatrixAt(borderInstanceIdx++, tempMatrix);

				// Bottom border
				pos.y = -h / 2 - filmstripHeight / 2;
				tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
				this.borderInstancedMesh!.setMatrixAt(borderInstanceIdx++, tempMatrix);

				// Top white border
				pos.set(0, h / 2 + filmstripHeight, 0.01);
				scale.set(w, whiteBorderThickness, 1);
				tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
				this.whiteBorderInstancedMesh!.setMatrixAt(whiteBorderInstanceIdx++, tempMatrix);

				// Bottom white border
				pos.y = -h / 2 - filmstripHeight;
				tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
				this.whiteBorderInstancedMesh!.setMatrixAt(whiteBorderInstanceIdx++, tempMatrix);

				// Holes
				scale.set(holeWidth, holeHeight, 1);
				for (let i = 0; i < FILMSTRIP_HOLE_COUNT; i++) {
					const x = startX + i * (holeWidth + holeGap);
					// Top hole
					pos.set(x, h / 2 + filmstripHeight / 2, 0.02);
					tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
					this.holeInstancedMesh!.setMatrixAt(holeInstanceIdx++, tempMatrix);
					// Bottom hole
					pos.y = -h / 2 - filmstripHeight / 2;
					tempMatrix.compose(pos, quat, scale).premultiply(group.matrixWorld);
					this.holeInstancedMesh!.setMatrixAt(holeInstanceIdx++, tempMatrix);
				}
			});

			this.borderInstancedMesh.instanceMatrix.needsUpdate = true;
			this.holeInstancedMesh.instanceMatrix.needsUpdate = true;
			this.whiteBorderInstancedMesh.instanceMatrix.needsUpdate = true;
		}
	}

	/* ---------------------------------------------------------- */
	/*                     CLEANUP                               */
	/* ---------------------------------------------------------- */
	public async dispose() {
		// ✅ INSTANCING: Dispose instanced meshes
		if (this.borderInstancedMesh) {
			this.props.scene.remove(this.borderInstancedMesh);
			this.borderInstancedMesh.geometry.dispose();
			this.borderMaterial?.dispose(); // ✅ FIX: Dispose material
		}
		if (this.whiteBorderInstancedMesh) {
			this.props.scene.remove(this.whiteBorderInstancedMesh);
			this.whiteBorderInstancedMesh.geometry.dispose();
			this.whiteBorderMaterial?.dispose();
		}
		if (this.holeInstancedMesh) {
			this.props.scene.remove(this.holeInstancedMesh);
			this.holeInstancedMesh.geometry.dispose();
			this.holeMaterial?.dispose(); // ✅ FIX: Dispose material
		}
		this.videos.forEach(v => {
			if (v) {
				v.pause(); v.src = ''; v.muted = true; // Ensure muted on cleanup
			}
		});
		if (this.videoContainer && this.videoContainer.parentNode) this.videoContainer.parentNode.removeChild(this.videoContainer);
		this.titleElements.forEach(t => t.element.remove());
		await this.audioManager?.pause('filmstrip_sfx'); // Ensure filmstrip audio is paused
	}

	public getFilmstripDimensions(): { height: number } {
		return {
			height: (SLIDE_HEIGHT + FILMSTRIP_HEIGHT * 2) * this.responsiveScale * this.mobileFilmstripScale
		};
	}

	public getClosestSlide(): { index: number, distance: number } {
		let closest = { index: -1, distance: Infinity };
		if (!this.props.camera) return closest;

		const vec = new THREE.Vector3();
		this.slideGroups.forEach(group => {
			group.getWorldPosition(vec).project(this.props.camera);
			const dist = Math.abs(vec.x);
			if (dist < closest.distance) {
				closest = { index: group.userData.index, distance: dist };
			}
		});
		return closest;
	}
}
