<!-- src/components/ui/StaticOverlay.svelte -->
<script lang="ts">
    import { fade } from 'svelte/transition';
    import { onMount, createEventDispatcher } from 'svelte';
    
    // Prop to manage the transition (Fade out when content loads)
    export let isLoaded: boolean = false;
    
    let container: HTMLElement;

    // Optional: Add a simple sound effect here if you have a static noise audio file
    onMount(() => {
        // Example: Play static sound
        // if (isLoaded) { playStaticSound(); }
    });
</script>

<!-- The actual noise overlay -->
<div 
    class="static-overlay-container" 
    transition:fade={{ duration: 500, delay: isLoaded ? 0 : 500 }}
>
    <!-- The noise image/pattern layer -->
    <div class="noise-layer"></div>
    
    <!-- The faint scanline effect -->
    <div class="scanline-layer"></div>
</div>

<style lang="css">
/* --- CSS Variables for Easy Tuning --- */
:root {
    --static-duration: 0.15s;
    --scanline-speed: 6s;
}

.static-overlay-container {
    position: fixed;
    inset: 0;
    z-index: 10000; /* Ensure it sits above everything, even curtains */
    pointer-events: none;
    background-color: black; /* Base black background */
    opacity: 1;
}

.noise-layer {
    position: absolute;
    inset: 0;
    /* Use a repeating static image or generated pattern */
    background-image: url('/noise-pattern.webp'); /* Assumes you place a small noise image in static/ */
    background-repeat: repeat;
    background-size: 150px; /* Size controls granularity of static */
    opacity: 0.3; /* Low opacity noise */
    
    /* Keyframe animation for subtle static flicker */
    animation: static-flicker var(--static-duration) steps(1, end) infinite;
}

.scanline-layer {
    position: absolute;
    inset: 0;
    /* Simulate CRT scanlines */
    background: linear-gradient(
        rgba(18, 16, 16, 0) 50%, 
        rgba(0, 0, 0, 0.25) 50%
    );
    background-size: 100% 4px; /* Line width */
    
    /* Subtle vertical movement for visual interest */
    animation: scanline-move var(--scanline-speed) linear infinite;
    opacity: 0.5;
    mix-blend-mode: overlay;
}

@keyframes static-flicker {
    0%, 100% { background-position: 0 0; }
    10% { background-position: -5% 10%; }
    20% { background-position: -15% 5%; }
    30% { background-position: 7% -25%; }
    /* ... add more steps for random static ... */
    100% { background-position: -20% -10%; }
}

@keyframes scanline-move {
    0% { background-position: 0 0; }
    100% { background-position: 0 100%; }
}
</style>