<!-- src/lib/components/three/CosmicIntro.svelte -->

<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import { phase, cosmicReady, ExperiencePhase } from '$lib/stores';
	import { CinemaGallery } from '$utils/CinemaGallery';
	import type { AudioManager } from '$utils/AudioManager';

	/** The AudioManager instance is passed down from the root component. */
	export let audioManager: AudioManager;
	export let onWarpPeak: () => void;

	let canvas: HTMLCanvasElement;
	let titlesContainer: HTMLElement; // Dummy, not used by this instance
	let gallery: CinemaGallery | null = null;
	let isInitialized = false;
	let sceneDependencies: any;

	// This function initializes the Three.js scene.
	// It's called once the canvas is mounted.
	const initializeScene = async () => {
		// Get the full context to pass down other audio elements
		sceneDependencies = getContext('scene-dependencies');
		if (isInitialized || !sceneDependencies) return;
		isInitialized = true;

		// The props object passes dependencies down to the gallery class.
		const galleryProps = {
			audioManager,
			onWarpPeak, // <-- Pass the callback down
			onCosmicReady: () => {
				// This callback is triggered by CinemaGallery once all floating objects are loaded.
				console.log('CosmicIntro.svelte received onCosmicReady signal.');
				cosmicReady.set(true); // Signal that assets are ready
			},
			// Pass other audio elements from context
			teleportAudio: sceneDependencies.teleportAudio,
			epicAudio: sceneDependencies.epicAudio
		};
		// Pass a dummy titlesContainer as it's not used here
		gallery = new CinemaGallery(canvas, document.createElement('div'), galleryProps);
		await gallery.init();

		// After initialization, check the current phase.
		// If we are already in the warp phase, trigger the effect immediately.
		if ($phase === ExperiencePhase.WARP_SEQUENCE) {
			gallery.activateWarpEffect();
		}
	};

	onMount(() => {
		// Initialize the scene as soon as the component mounts.
		initializeScene();

		// Subscribe to phase changes. If the phase changes to WARP_SEQUENCE *after*
		// the component has mounted, we need to trigger the effect.
		const unsubscribe = phase.subscribe(currentPhase => {
			if (currentPhase === ExperiencePhase.WARP_SEQUENCE && gallery) {
				gallery.activateWarpEffect();
			}
		});

		// Clean up the subscription when the component is destroyed.
		return () => unsubscribe();
	});

	onDestroy(() => {
		if (gallery) {
			gallery.dispose();
			gallery = null;
		}
	});
</script>

<!-- 
  The canvas is the container for our Three.js scene.
  It's styled to be a fixed background layer. The `fade-in` class
  ensures a smooth transition as it's mounted.
-->
<canvas bind:this={canvas} class="cosmic-canvas fade-in"></canvas>

<style>
	.cosmic-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0; /* Positioned behind the main UI layers. */
		touch-action: none; /* Disables browser touch gestures like pull-to-refresh. */
		-webkit-tap-highlight-color: transparent;
	}

	.fade-in {
		animation: fadeInAnimation 1s ease-in forwards;
		opacity: 0;
	}

	@keyframes fadeInAnimation {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>