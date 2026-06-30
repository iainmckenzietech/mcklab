<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Header from '$components/three/Header.svelte';
	import StickyFooter from '$components/ui/StickyFooter.svelte';
	import { uiVisible, isPopupActive, phase, ExperiencePhase, audioElements } from '$lib/stores';

	// --- ESSENTIAL GLOBAL IMPORTS ---
	import '$lib/config/gsap.config.ts';
	import '../app.css';

	// --- AUDIO ELEMENT MANAGEMENT ---
	// These are the actual DOM elements. They only exist on the client.
	let teleportEl: HTMLAudioElement | undefined;
	let backgroundEl: HTMLAudioElement | undefined;
	let epicEl: HTMLAudioElement | undefined;
	let filmstripEl: HTMLAudioElement | undefined;

	// Assign the bound DOM elements to our global store once the component has mounted.
	onMount(async () => {
		await tick(); // Ensure the <audio> tags are in the DOM
		audioElements.set({
			teleport_sfx: teleportEl!,
			ambient_intro: backgroundEl!,
			epic_theme: epicEl!,
			filmstrip_sfx: filmstripEl!
		});
	});

	// ✅ FIX: Control UI visibility from the layout, where the components live.
	// This ensures they react correctly when the application phase changes.
	$: if ($phase === ExperiencePhase.FILMSTRIP_GALLERY) {
		uiVisible.set(true);
	}
</script>

<!-- All audio elements are consolidated here in the root layout -->
<audio bind:this={teleportEl} src="/teleport.mp3" preload="auto" style="display: none;"></audio>
<audio
	bind:this={backgroundEl}
	src="/full_of_stars.mp3"
	preload="auto"
	style="display: none;"
></audio>
<audio bind:this={epicEl} src="/zarathustra.mp3" preload="auto" style="display: none;"></audio>
<audio
	bind:this={filmstripEl}
	src="/cinema-reel-16k.opus"
	loop
	preload="auto"
	style="display: none;"
></audio>

<div class="ui-container">
	<Header show={$uiVisible && !$isPopupActive} />
</div>

<div class="main-content">
	<slot />
</div>

<footer class="site-footer">
	<StickyFooter show={$uiVisible && !$isPopupActive} />
</footer>

<style>
    .ui-container {
        position: fixed;
        inset: 0;
        z-index: 10; /* High z-index to ensure it's on top of the canvas */
        pointer-events: none; /* Allow clicks to pass through to the canvas */
    }

    .ui-container > :global(*) {
        pointer-events: auto; /* Re-enable pointer events for children (Header/Footer) */
    }

    .main-content {
        position: fixed;
        inset: 0;
        z-index: 1; /* ✅ FIX: Place the main content (and canvas) behind the UI */
    }

    .site-footer {
        position: fixed;
        inset: 0;
        z-index: 10; /* Ensure it's on top of the canvas */
        pointer-events: none; /* Pass clicks through the footer container */
    }
</style>