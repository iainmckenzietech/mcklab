<!-- src/lib/Intro.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';


	import { curtainState, isSignHovered } from '$lib/stores';

	// Feature Components
	import MarqueeSign from '$components/ui/MarqueeSign.svelte';
	import UsherPair from '$components/ui/UsherPair.svelte';
	import CinemaSeats from '$components/ui/CinemaSeats.svelte';

	import PopcornAnimation from '$components/ui/PopcornAnimation.svelte';

	// Utilities
	import { createEntranceTimeline, createExitTimeline, setInitialStates, manageMarqueeAnimation, createPopcornTimeline, createForceBattleTimeline } from '$lib/utils/Choreographer.ts';
	import { initCustomParallax, handleParallaxState } from '$lib/utils/ParallaxManager.ts';
	import { MOBILE_PATH, DESKTOP_PATH, IS_MOBILE_QUERY, BASE_IMAGE_WIDTH } from '$lib/config/paths.ts';

	const dispatch = createEventDispatcher();

	// This prop receives the master start function from +page.svelte
	export let startExperience: () => void;

	// --- LOCAL STATE & DOM ELEMENTS ---
	let mobileQuery: MediaQueryList | undefined;
	let parallaxContainer: HTMLElement;
	let cleanupParallax: (() => void) | undefined;
	let cleanupMarquee: (() => void) | undefined;

	// --- ANIMATION TIMELINES ---
	let entranceTl: gsap.core.Timeline;
	// ✅ ADD: Variables to hold our continuous animation timelines
	let popcornTl: gsap.core.Timeline | null;
	let forceBattleTl: gsap.core.Timeline | null;

	// This local variable controls the closing animation for this component only.
	let isClosing = false;

	// ✅ FIX: This function "unlocks" videos for mobile browsers by playing and
	// immediately pausing them on the first user gesture. This does not cause
	// them all to play at once.
	function unlockAllVideos() {
		const videos = document.querySelectorAll('video');
		videos.forEach(v => {
			if (v.paused) {
				v.play().then(() => v.pause()).catch(e => { /* Best-effort, ignore errors */ });
			}
		});
	}

	// This local variable controls the closing animation for this component only.

	// --- STORE SYNCS ---
	// We read from the store for responsiveness, but no longer write to `isOpen`.
	$: isMobile = $curtainState.isMobile;

	// --- DYNAMICALLY CALCULATED VALUES ---
	let imageHeight = 0;
	let imageLoaded = get(curtainState).imageLoaded;

	$: logoSrc = isMobile ? MOBILE_PATH : DESKTOP_PATH;
	$: if (imageLoaded && imageHeight === 0 && browser) {
		imageHeight = (window.innerHeight * 0.8) / 2 || 350;
	}

	// --- DEBOUNCE UTILITY ---
	function debounce(func: Function, timeout = 200) {
		let timer: number;
		return (...args: any) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				func.apply(this, args);
			}, timeout) as unknown as number;
		};
	}

	// --- RESIZE HANDLER ---
	const handleResize = debounce(() => {
		if (!isMobile && parallaxContainer) {
			if (cleanupParallax) {
				cleanupParallax();
				cleanupParallax = undefined;
			}
			cleanupParallax = initCustomParallax(parallaxContainer, isMobile);
		}
	}, 200);

	// --- RESPONSIVENESS ---
	$: if (isMobile !== undefined && parallaxContainer) {
		tick().then(() => {
			if (browser) {
				handleParallaxState(parallaxContainer, isMobile);
				if (!isMobile && !cleanupParallax) {
					cleanupParallax = initCustomParallax(parallaxContainer, isMobile);
				}
			}
		});
	}

	// --- PRELOADING ---
	function preloadImage() {
		if (!browser) return;
		const logoToLoad = isMobile ? MOBILE_PATH : DESKTOP_PATH;
		const img = new Image();
		img.src = logoToLoad;
		img.onload = () => {
			imageHeight = (img.naturalHeight / img.naturalWidth) * BASE_IMAGE_WIDTH;
			curtainState.update((s) => ({ ...s, imageLoaded: true }));
		};
		img.onerror = () => {
			curtainState.update((s) => ({ ...s, imageLoaded: true }));
		};
	}

	// --- INTERACTION ---
	// This function is passed down to MarqueeSign's 'handleEnter' prop.
	function handleEnter(event: MouseEvent | KeyboardEvent) {
		if (event.type === 'keydown' && event.key !== 'Enter') return;
		if (isClosing) return; // Prevent double-clicks using the local state.

		// 1. Immediately call the master function from +page.svelte.
		// This is the CRITICAL audio unlock step.
		startExperience();

		// ✅ NEW: Unlock videos on the first user gesture
		unlockAllVideos();

		// 2. Set our LOCAL state to start the closing animation for this component.
		isClosing = true;

		// 3. Start the GSAP exit timeline.
		const exitTl = createExitTimeline(dispatch);

		// Listen for the custom 'startWarp' event from the timeline and forward it
		exitTl.eventCallback('onStart', () => {
			dispatch('startWarp');
		});

		// 4. When the animation is done, tell the parent to transition scenes.
		exitTl.eventCallback('onComplete', () => dispatch('introAnimationsComplete'));
	}

	// ✅ ADD: Functions to handle the hover events from MarqueeSign
	function handleSignHoverStart() {
		console.log('[DEBUG] Sign Hover START');
		parallaxContainer?.classList.add('sign-hovered');
		document.getElementById('stage')?.classList.add('chromatic-aberration');
		isSignHovered.set(true);
	}

	function handleSignHoverEnd() {
		console.log('[DEBUG] Sign Hover END');
		parallaxContainer?.classList.remove('sign-hovered');
		document.getElementById('stage')?.classList.remove('chromatic-aberration');
		isSignHovered.set(false);
	}

	function onEntranceStart() {
		// Callback used by Choreographer.js on timeline start
	}

	// ✅ ADD: Reactive block to pause/play animations based on the hover store
	// ✅ FIX: Make the reactive block ONLY dependent on the hover state.
	// This ensures it runs every time the hover changes, regardless of whether
	// the timelines have been created yet. Optional chaining `?.` safely handles it.
	$: if (browser) {
		console.log(`[DEBUG] Hover state changed: isSignHovered = ${$isSignHovered}`);
		if ($isSignHovered) {
			console.log('[DEBUG] Pausing animations...');
			popcornTl?.pause();
			forceBattleTl?.pause();
		} else {
			console.log('[DEBUG] Playing animations...');
			popcornTl?.play();
			forceBattleTl?.play();
		}
	}

	onMount(async () => {
		if (!browser) return;

		setInitialStates();

		mobileQuery = window.matchMedia(IS_MOBILE_QUERY);
		curtainState.update((s) => ({ ...s, isMobile: mobileQuery.matches }));
		preloadImage();

		await tick();

		if (!isMobile) {
			cleanupParallax = initCustomParallax(parallaxContainer, isMobile);
		}

		// ✅ FIX: Call the function to manage the marquee light animation on hover.
		cleanupMarquee = manageMarqueeAnimation();

		entranceTl = createEntranceTimeline(isMobile, onEntranceStart);
		document.getElementById('stage')!.classList.add('visible');

		window.addEventListener('resize', handleResize);
		mobileQuery.addEventListener('change', (e) => {
			curtainState.update((s) => ({ ...s, isMobile: e.matches }));
			preloadImage();
		});

		return () => {
			if (mobileQuery)
				mobileQuery.removeEventListener('change', (e) => {
					curtainState.update((s) => ({ ...s, isMobile: e.matches }));
					handleParallaxState(parallaxContainer, isMobile);
				});
			if (cleanupParallax) cleanupParallax();
			if (cleanupMarquee) cleanupMarquee();
			window.removeEventListener('resize', handleResize);
			if (popcornTl) popcornTl.kill();
			if (forceBattleTl) forceBattleTl.kill();
			if (entranceTl) entranceTl.kill();
		};
	});
</script>

<div id="stage" class:closing={isClosing} class:visible={true}>
	<div id="mother_container">
		<div id="lines_container"></div>
	</div>

	<div class="parallax-container" bind:this={parallaxContainer}>

		<div class="balance parallax-layer" data-depth="0.50"></div>

		<!-- Feature Components -->
		<CinemaSeats />
		<UsherPair 
			on:forceBattleElementsReady={(e) => { forceBattleTl = createForceBattleTimeline(e.detail.hotdogEl, e.detail.cokeEl); }} 
			on:popcornElementsReady={(e) => { popcornTl = createPopcornTimeline(e.detail.bucketEl, e.detail.corns); }}
		/>

		<!-- ✅ FIX: Wrap the sign and rope in a single container for synchronized animation. -->
		<div class="sign-assembly">
			<MarqueeSign 
				{logoSrc} 
				{imageHeight} 
				marqueeText="ENTER SITE"
				{handleEnter}
				on:signHoverStart={handleSignHoverStart}
				on:signHoverEnd={handleSignHoverEnd}
			/>
			<!-- The rope is now positioned relative to this container. -->
			<div class="rope-frame"></div>
		</div>
	</div>

	<!-- Curtains and Spotlight -->
	<div id="curtain-left" class="curtain"></div>
	<div id="curtain-right" class="curtain"></div>
	<div class="spotlight"></div>
</div>
<style>

:root {
	--curtain-color: #2c1a1a;
	--gradient-dark: #4d4d4d;
	--spotlight-opacity: 0.4;
	--anim-duration: 0.6s;
}

/* ---------------------------------- GLOBAL RESET & STAGE ---------------------------------- */

:global(body) {
	background: black;
	margin: 0;
	padding: 0;
	outline: 0 !important;
	overflow: hidden;
}

#stage {
	position: fixed;
	inset: 0;
	background: black;
	z-index: 1000;
	opacity: 0;
	transition: opacity 0.3s ease-in;
	pointer-events: none;
}

#stage.visible {
	opacity: 1;
	pointer-events: auto;
}

.parallax-container {
	position: fixed;
	inset: 0;
	z-index: 70;
	pointer-events: none;
	overflow: hidden;
	perspective: 1px;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-moz-user-drag: none;
	cursor: grab;
}

.parallax-layer {
	position: absolute;
	width: 100%;
	height: 100%;
	transform-style: preserve-3d;
	transform: none;
	transform-origin: center bottom;
	backface-visibility: hidden;
	pointer-events: none;
	visibility: hidden;
	will-change: transform;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-moz-user-drag: none;
	cursor: grab;
}

/* ---------------------------------- BALANCE BAR & ROPE FRAME ---------------------------------- */
.balance {
	height: 8%;
	top: 0;
	background-image: linear-gradient(
		to left,
		transparent,
		var(--gradient-dark),
		rgba(0, 0, 0, 0.95),
		var(--gradient-dark)
	),
	linear-gradient(to left, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.9));
	background-size: 79px 79px, 61px 61px;
	box-shadow: 0px 8px 25px rgba(0, 0, 0, 0.7), 0px 2px 10px rgba(0, 0, 0, 0.9) inset;
	z-index: 5000;
	width: 150%;
	left: -25% !important;
	transform: translateY(-50%) translateZ(0);
}

/* ✅ ADD: New container for the sign assembly. */
.sign-assembly {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: flex-start; /* Align to the top */
	z-index: 100; /* Ensure it's above other parallax layers */
	pointer-events: none; /* Pass clicks through */
	/* ✅ FIX: Hide the assembly by default to prevent a flash before GSAP takes over. */
	opacity: 0; 
	will-change: transform; /* ✅ FIX: Performance boost for the animation. */
}

.rope-frame {
	position: absolute; /* Positioned relative to .sign-assembly */
	top: 11.5%; /* Fine-tune vertical position */
	width: 150vw;
	height: 10vw;
	background-image: url('/ropey.webp');
	background-size: contain;
	background-position: center bottom;
	background-repeat: no-repeat;
}

/* ✅ FIX: Apply dimming effect ONLY to the right usher (Jabba). */
:global(.parallax-container.sign-hovered .usher-right) {
	transition: filter 0.4s cubic-bezier(0.23, 1, 0.32, 1); /* Smooth transition */
	filter: grayscale(80%) brightness(0.5) drop-shadow(0 0 15px rgba(0, 0, 0, 0.7));
}

/* ✅ ADD: New rule to pause and fade out the E.T. glow on hover. */
:global(.sign-hovered .usher-left .usher-img-wrapper)::after {
	animation-play-state: paused;
	opacity: 0 !important; /* Use !important to override the keyframe opacity */
}

/* ✅ ADD: New rule to dim the seats on hover. */
:global(.parallax-container.sign-hovered .seat-layer) {
	transition: filter 0.4s cubic-bezier(0.23, 1, 0.32, 1); /* Smooth transition */
	filter: grayscale(60%) brightness(0.6) drop-shadow(0 0 12px rgba(0, 0, 0, 0.6));
}

/* ✅ FIX: Add back the rule to activate the HAL glow on hover. */
/* This targets the pseudo-element defined in MarqueeSign.svelte. */
:global(.sign-hovered #sign-content)::before {
	opacity: 1;
	animation-play-state: running;
}

/* ✅ ADD: New rule to make marquee lights go dark on hover. */
:global(.sign-hovered .logo-container ul li) {
	animation-play-state: paused !important; /* Keep the pause */
	background-color: #3a3a3a !important; /* Dark, "off bulb" color */
	box-shadow: none !important; /* Remove the glow */
	transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
}

/* ✅ FIX: Re-add the chromatic aberration effect on hover. */
.chromatic-aberration {
	position: relative;
	animation: chromatic-shift 0.8s infinite linear;
}

@keyframes chromatic-shift {
	0%, 100% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #00ffff; }
	25% { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #00ffff; }
	50% { text-shadow: 2px 0 0 #00ff00, -2px 0 0 #ff00ff; }
	75% { text-shadow: -2px 0 0 #00ff00, 2px 0 0 #ff00ff; }
}


/* ---------------------------------- CURTAINS & SPOTLIGHT ---------------------------------- */

.curtain,
.balance {
	position: absolute !important;
	overflow: hidden;
	background-color: var(--curtain-color);
}

.curtain {
	width: 61%;
	height: 100%;
	top: 0;
	background-image: linear-gradient(
		to left,
		transparent,
		var(--gradient-dark),
		rgba(0, 0, 0, 0.3),
		var(--gradient-dark)
	),
	linear-gradient(to left, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.8));
	background-size: 67px 67px, 53px 53px;
}

#curtain-left {
	left: 0;
	margin-left: -10%;
}

#curtain-right {
	right: 0;
	margin-right: -10%;
}

.spotlight {
	position: fixed;
	inset: 0;
	z-index: 60;
	background: radial-gradient(
		circle at 50% 50%,
		transparent 0%,
		rgba(0, 0, 0, var(--spotlight-opacity)) 45%,
		rgba(0, 0, 0, 0.7) 65%,
		rgba(0, 0, 0, 0.9) 85%,
		black 100%
	),
	radial-gradient(
		circle at 50% 50%,
		transparent 0%,
		rgba(0, 0, 0, var(--spotlight-opacity)) 45%,
		rgba(0, 0, 0, 0.7) 65%,
		rgba(0, 0, 0, 0.9) 85%,
		black 100%
	);
	background-attachment: fixed;
	background-position: -120px 0, 120px 0;
	background-blend-mode: multiply;
	transition: background-position 0.5s ease;
}

/* ---------------------------------- CURTAIN ANIMATIONS ---------------------------------- */

#stage.closing {
	pointer-events: none;
}

#stage.closing #curtain-left {
	animation: curtain-left-open var(--anim-duration) ease forwards;
}

#stage.closing #curtain-right {
	animation: curtain-right-open var(--anim-duration) ease forwards;
}

#stage.closing .balance {
	animation: balance-open 0.4s ease forwards;
}

@keyframes curtain-left-open {
	to {
		width: 0;
		transform: translateX(-100%);
	}
}

@keyframes curtain-right-open {
	to {
		width: 0;
		transform: translateX(100%);
	}
}

@keyframes balance-open {
	to {
		height: 0;
	}
}
</style>