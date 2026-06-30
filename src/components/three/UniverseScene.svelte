<script lang="ts">
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { CinemaGallery } from '$lib/utils/three/CinemaGallery';
  import { galleryVisible, phase, ExperiencePhase, sceneReady } from '$lib/stores';

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement; // This will be bound to the canvas element
  export let titlesContainer: HTMLElement; // REQUIRED FROM PARENT

  export async function startExperience() {
    if (!get(sceneReady)) {
      console.log('UniverseScene: Waiting for sceneReady...');
      await new Promise(resolve => {
        const unsubscribe = sceneReady.subscribe(ready => {
          if (ready) {
            unsubscribe();
            resolve(true);
          }
        });
      });
    }
    console.log('UniverseScene: Activating warp...');
    gallery?.activateWarpEffect();
  }

  // --- Component Props ---
  export let posts: any[] = [];
  export let audioManager: any; // Using `any` to avoid circular dependency issues with type imports

  // --- Internal State ---
  let gallery: CinemaGallery | null = null;

  onMount(async () => {
    // ✅ FIX: Wait for the next DOM update cycle to ensure `bind:this` and props are ready.
    await tick();

    if (!canvas || !titlesContainer) {
      console.error('UniverseScene: Canvas or titlesContainer not ready on mount.');
      return;
    }

    const props = {
      posts,
      audioManager,
      onWarpPeak: () => dispatch('warpPeak'),
      titlesContainer,
      // ✅ FIX: Add missing properties required by the CinemaGalleryProps interface.
      settings: {},
      teleportAudio: new Audio(),
      filmstripAudio: new Audio(),
      onTeleportsComplete: () => {},
      onFilmstripReady: () => {},
      onMusicComplete: () => {},
      onSlideClick: (post: any) => dispatch('slideClick', post),
      dispatch: dispatch
    };

    try {
      // ✅ FIX: Pass the correct props directly without overwriting them.
      gallery = new CinemaGallery({ ...props, canvas });
      await gallery.init();
      console.log('UniverseScene: CinemaGallery ready.');
      sceneReady.set(true);
      dispatch('ready');
    } catch (error) {
      console.error('UniverseScene init error:', error);
    }

    return () => {
      gallery?.dispose();
    };
  });
</script>

<!-- ✅ FIX: Listen for the custom slideClick event -->
<canvas bind:this={canvas} class="webgl-canvas"></canvas>

<style>
	

</style>