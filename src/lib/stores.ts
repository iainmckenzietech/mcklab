// src/lib/stores.ts

import { writable, type Writable } from 'svelte/store';

// ==================================================================
// NEW: PHASE MANAGEMENT (The core of the new modular flow)
// ==================================================================

/**
 * Defines the distinct phases of the cinematic experience.
 * The entire application flow will be driven by changes to this state.
 */
export enum ExperiencePhase {
	INITIAL_SCREEN,      // The initial static screen with the curtain, ushers, etc.
	WARP_SEQUENCE,       // The "Enter Site" warp effect is active.
	COSMIC_INTRO,        // Post-warp: starfield, nebula, and objects are animating in.
	FILMSTRIP_GALLERY,   // The interactive filmstrip is visible and ready for interaction.
	DESCENT,             // User is scrolling down to the grounded "below the fold" content.
}

/** Manages the current phase of the application. This is the new primary store for flow control. */
export const phase: Writable<ExperiencePhase> = writable(ExperiencePhase.INITIAL_SCREEN);

/** Tracks if the main Three.js cosmic assets (nebula, stars, objects) are loaded. */
export const cosmicReady: Writable<boolean> = writable(false);

/** Tracks if the main CinemaGallery instance has completed its async init() method. */
export const sceneReady: Writable<boolean> = writable(false);


// ==================================================================
// NEW: AUDIO SYNCHRONIZATION STORES
// ==================================================================

/**
 * Defines the audio cues for different tracks.
 * The `action` string is dispatched as an event for the Three.js scene to handle.
 */
export const audioCues = writable({
    zarathustra: [
        { time: 28.5, action: 'NEBULA_PULSE_1', triggered: false }, // Original: 11.5s + 17s
        { time: 42.0, action: 'OBJECTS_JITTER', triggered: false }, // Original: 25.0s + 17s
        { time: 52.0, action: 'NEBULA_PULSE_2', triggered: false }, // Original: 35.0s + 17s
        { time: 79.0, action: 'FINAL_CLIMAX', triggered: false }    // Original: 62.0s + 17s
    ],
});

/** Stores the name of the currently playing primary audio track for global reference or debugging. */
export const currentTrack: Writable<string | null> = writable(null);

/**
 * Stores the currently active audio element for global access (e.g., for visualizers).
 * ✅ FIX: Lazily initialize and update the activeAudio store to be SSR-safe.
 * The `get()` function cannot be used at the top level of a module.
 */
export const activeAudio: Writable<HTMLAudioElement | null> = writable(null);

/** A global, client-side-only map of all audio elements, keyed by their track name. */
export const audioElements: Writable<{ [key: string]: HTMLAudioElement }> = writable({});








// ==================================================================
// EXISTING STORES (Kept for compatibility and current functionality)
// ==================================================================

/** Controls the visibility of the header and footer (used in the page component). */
export const uiVisible: Writable<boolean> = writable(false);

/**
 * Controls if the gallery/universe scene is currently active/visible.
 * NOTE: This will eventually be replaced by checking `phase >= ExperiencePhase.COSMIC_INTRO`.
 * We are keeping it for a smooth transition during the refactor.
 */
export const galleryVisible: Writable<boolean> = writable(false);



/** Controls if initial site-wide loading/preloading is complete. */
export const loadingComplete: Writable<boolean> = writable(false);

/**
 * State for the curtain/intro scene. This manages the state *within* the INITIAL_SCREEN phase.
 * It remains the source of truth for the very first part of the experience.
 */
export const curtainState = writable({
  isOpen: false,
  isMobile: false,
  imageLoaded: false,
});

/** Tracks if the user is hovering over the main "Enter Site" sign. */
export const isSignHovered: Writable<boolean> = writable(false);
