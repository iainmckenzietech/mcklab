<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Intro from '$lib/Intro.svelte';
  import { createExitTimeline } from '$lib/utils/Choreographer.ts';
  import UniverseScene from '$components/three/UniverseScene.svelte';
  
  import { AudioManager } from '$lib/utils/AudioManager.js';
  import { galleryVisible, phase, ExperiencePhase, uiVisible, audioElements, sceneReady, curtainState } from '$lib/stores.js'; // ✅ FIX: Import curtainState
  import { get } from 'svelte/store';
  import posts from '$lib/posts.json';

  // --- DOM ELEMENTS & ENGINE INSTANCES ---
  let universeScene: UniverseScene;
  let audioManager: AudioManager | null = null;
  let externalTitlesContainer: HTMLDivElement;

  // --- STATE ---
  let showIntro = true;
  let dependenciesReady = false;

  // ✅ FIX: Subscribe to the global audioElements store.
  // When the store is populated by the layout, we are ready.
  const unsubscribe = audioElements.subscribe(elements => {
    if (Object.keys(elements).length > 0 && !audioManager) {
      audioManager = new AudioManager(elements);
      dependenciesReady = true; // All dependencies are now ready.
    }
  })

  onDestroy(() => {
    unsubscribe();
    audioManager = null;
  });

  // THE MASTER SEQUENCE
  function startExperience() {
    if (!audioManager || !dependenciesReady) return;
    audioManager.initAudioContext();
    audioManager.play('ambient_intro', { volume: 1.0 });
  }

  async function transitionToScene() {
    if (!get(sceneReady)) return; // ✅ FIX: Guard against premature call
    
    // ✅ FIX: Manually create and run the exit timeline here, passing the isMobile flag.
    const isMobile = get(curtainState).isMobile;
    const exitTl = createExitTimeline(
      () => {}, // onStart callback is now empty.
      isMobile,
      () => {
        // ✅ FIX: onComplete callback now handles everything.
        // Hide the intro component AND start the next phase.
        showIntro = false;
        handleStartWarp();
      }
    );
    exitTl.play();
  }
  function handleWarpPeak() {
    if (!audioManager) return;
    audioManager.crossfade('ambient_intro', 'epic_theme', 3.0);
  }

  function handleStartWarp() {
    if (get(sceneReady) && universeScene) {
      universeScene.startExperience();
    }
  }

  
</script>

<main>
  <!-- Intro -->
  <div class="fixed-stage" class:hidden={!showIntro}>
    <Intro
      {startExperience}
      on:introAnimationsComplete={transitionToScene}
      on:startWarp={handleStartWarp}
    />
  </div>


  <!-- ✅ FIX: Wrap UniverseScene in a full-screen container -->
  <div class="scene-wrapper">
    {#if dependenciesReady}
      <UniverseScene
        bind:this={universeScene}
        {posts}
        {audioManager}
        titlesContainer={externalTitlesContainer}
        on:ready={() => {}}
        on:warpPeak={handleWarpPeak}
        
      />
    {/if}
  </div>

  <!-- TITLES CONTAINER -->
  <div id="titles-container" bind:this={externalTitlesContainer}></div>

  <!-- Overlay -->
  {#if $galleryVisible}
    <div class="gallery-overlay"></div>
  {/if}

  
</main>

<style>
  /* ========================================
     0. GLOBAL VIEWPORT RESET (CRITICAL)
     ======================================== */
  html, body, #svelte {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* ========================================
     1. MAIN (Full viewport)
     ======================================== */
  main {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* ========================================
     2. SCENE WRAPPER
     ======================================== */
  .scene-wrapper {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    outline: none;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-wrapper:active {
    cursor: grabbing;
  }

  /* ========================================
     3. CANVAS
     ======================================== */
  :global(.webgl-canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* ========================================
     4. TITLES CONTAINER
     ======================================== */
  :global(#titles-container) {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    contain: layout style;
    will-change: opacity;
  }

  /* ========================================
     5. OVERLAY
     ======================================== */
  .gallery-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 5;
    background: transparent;
    contain: paint;
  }

  /* ========================================
     6. HIDDEN
     ======================================== */
  .hidden {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.5s ease;
  }

  /* ========================================
     7. SLIDE TITLES
     ======================================== */
  :global(.slide-title) {
    position: absolute;
    top: 0;
    left: 0;
    transform: translate3d(var(--x,0), var(--y,0), 0) translate(-50%,-50%) scale(0.9);
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none; 
    /* ✅ FIX: Remove the transform transition to prevent the "sliding" effect. GSAP now handles this. */
    transition: opacity .3s ease;
    text-align: center;
    white-space: nowrap;
    font-family: 'Zen Dots', sans-serif; /* ✅ FIX: Reduce font size */
    font-size: clamp(1rem, 2vw, 1.6rem);
    color: white;
    text-shadow: 0 0 8px rgba(255,255,255,.7);
    will-change: transform, opacity;
    contain: layout style paint;
    backface-visibility: hidden;
  }

  :global(.slide-title.visible) {
    opacity: 1 !important;
    visibility: visible !important;
    transform: translate3d(var(--x,0), var(--y,0), 0) translate(-50%,-50%) scale(1) !important;
    cursor: pointer;
  }

  :global(.title-text) {
    display: block;
    /* ✅ FIX: Reduce padding to prevent mouse event interference */
    padding: 0.25rem 0.5rem;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(255,255,255,.7);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    :global(.title-text) {
      white-space: normal;
      letter-spacing: 0.05em;
      font-size: clamp(1.5rem, 5vw, 2rem);
      padding: 0.75rem 1.25rem;
    }
  }

  :global(.slide-title.visible:hover) {
    filter: drop-shadow(0 0 20px #00ffff);
    transform: translate3d(var(--x,0), var(--y,0), 0) translate(-50%,-50%) scale(1.05) !important;
  }
</style>
