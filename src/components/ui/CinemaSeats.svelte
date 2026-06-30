<!-- src/components/ui/CinemaSeats.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { curtainState } from "$lib/stores";
    import { SEAT_IMAGE_OPTIONS, HOTDOG_PATH, COKE_PATH, BACKROW_PATH } from "$lib/config/paths"; 
    
    // Import the action that handles the GSAP lifecycle
import { forceBattle } from '$lib/utils/actions/forceBattle.ts';

    // --- Helper Function ---
    function shuffle(array: string[]): string[] { 
        // ... (implementation remains the same) ...
        const shuffled = [...array];
		let currentIndex = shuffled.length;
		while (0 !== currentIndex) {
			const randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
			[shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
		}
		return shuffled;
    }

    // --- Image Initialization ---
    const shuffledImages = shuffle(SEAT_IMAGE_OPTIONS);
    let backImage: string = shuffledImages[0];
    let midImage: string = shuffledImages[1];
    let frontImage: string = shuffledImages[2];
    
    // --- State & Reactivity ---
    $: isDesktop = !$curtainState.isMobile;

    // The Layers array is now reactive based on the images
    $: layers = [
        { image: backImage, depth: 0.15, isBackrow: backImage === BACKROW_PATH, name: 'back' },
        { image: midImage, depth: 0.25, isBackrow: midImage === BACKROW_PATH, name: 'mid' },
        { image: frontImage, depth: 0.35, isBackrow: frontImage === BACKROW_PATH, name: 'front' }
    ];
onMount(() => {
  // Preload seat images
  shuffledImages.forEach(imgPath => { new Image().src = imgPath; });
  // Preload force assets (only if backrow, but preload anyway for ~1/3 hit)
  [HOTDOG_PATH, COKE_PATH].forEach(path => { new Image().src = path; });
});
</script>

{#each layers as layer}
    <div class="seat-layer-wrapper" data-group="seats">
        <div class="seat-layer {layer.name} parallax-layer" 
             data-depth="{layer.depth}" 
             data-group="seats" 
             style="background-image: url('{layer.image}');"
        >
            {#if layer.isBackrow && isDesktop}
                <!-- Apply the action to the container div -->
                <div class="force-battle-container" use:forceBattle>
                    <img src={HOTDOG_PATH} alt="Floating Hotdog" class="floating-item hotdog" />
                    <img src={COKE_PATH} alt="Floating Can of Coke" class="floating-item coke" />
                    <div class="force-glow yoda-force"></div>
                    <div class="force-glow vader-force"></div>
                </div>
            {/if}
        </div>
    </div>
{/each}
<style lang="css">
/* --- FORCE BATTLE STYLES --- */
.force-battle-container {
    position: absolute;
    top: 10.5vw;
    left: 12%;
    width: 12vw;
    height: 12vw;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 6000;
    border: none;
}
.floating-item {
    position: absolute;
    will-change: transform, box-shadow, filter;
}
.hotdog {
    width: 5vw;
    height: auto;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
}
.coke {
    width: 5vw;
    height: auto;
    top: 60%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* --- SEAT LAYERS --- */
.seat-layer-wrapper {
	position: absolute;
    left: 50%;
    bottom: 0;
    top: auto;
    width: 100%;
    height: 550px; 
    
    /* GSAP Equivalent Start Position: y: 50, opacity: 0, scale: 0.8 (Moved to CSS) */
    transform: translateX(-50%) translateY(50px) scale(0.8);
    opacity: 0;
    visibility: hidden; 

	will-change: transform, opacity;
	z-index: 4000;
	box-shadow: 0 0 40px rgba(0,0,0,0.8);
}

.seat-layer {
	position: relative; 
	width: 100%;
	height: 100%;
	background-repeat: no-repeat;
	background-size: contain;
	background-position: bottom center;
	transform-origin: center bottom;
	opacity: 1;
	will-change: filter;
	/* ✅ FIX: Ensure a smooth, gradual transition for the filter effect. */
	transition: filter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
     transform: translateZ(0);
}

.seat-layer.back {
	filter: drop-shadow(0 0 10px rgba(139, 0, 0, 0.4));
	background-position: bottom center;
}
.seat-layer.mid {
	filter: grayscale(30%) sepia(15%) brightness(1) drop-shadow(0 0 25px rgba(0, 0, 0, 0.6));
	background-position: bottom center;
}
.seat-layer.front {
	filter: grayscale(30%) sepia(15%) brightness(1) drop-shadow(0 0 40px rgba(0, 0, 0, 0.8));
	background-position: bottom center;
}

/* --- MOBILE OVERRIDES --- */
@media (max-width: 768px) {
    .seat-layer-wrapper {
		display: none !important;
		visibility: hidden !important;
	}
}
</style>