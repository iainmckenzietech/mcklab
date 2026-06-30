// src/utils/actions/popcorn.ts (Final, Reactive, and Typed Version)

import { gsap } from 'gsap';
import { createPopcornTimeline } from '../CinemaAnimations.js'; 
import type { Timeline } from 'gsap';
import type { SVGUseElement } from 'svelte/elements'; // For precise SVG element typing

// Define the parameter structure for the Action
type PopcornParams = {
    speed?: number;
    maxKernels?: number;
};

/**
 * Svelte Action to initialize and manage the Popcorn physics animation timeline.
 * Supports dynamic speed updates.
 * 
 * @param node The SVG element to bind the action to.
 * @param params Optional parameters including speed (timeScale).
 */
export function popcorn(node: HTMLElement, params: PopcornParams = {}): { destroy: () => void; update: (newParams: PopcornParams) => void } {
    let timeline: Timeline | null = null;
    let ctx: gsap.Context;

    const initialSpeed = params.speed ?? 1.0;
    const initialKernels = params.maxKernels ?? 20;

    // --- INITIALIZATION ---
    ctx = gsap.context(() => {
        
        // Initial GSAP Set to make it visible and correctly sized
        gsap.set(node, { 
            autoAlpha: 1, 
            visibility: 'visible', 
            scale: 1,
            transformOrigin: '50% 100%',
            force3D: true // Ensure GPU acceleration from the start
        });

        // Cache Corn Elements using precise typing
        const popcornCorns = Array.from(node.querySelectorAll('use')) as SVGUseElement[];
        
        if (popcornCorns.length > 0) {
            // Create the timeline, passing the max kernel setting
            timeline = createPopcornTimeline(node, popcornCorns, initialKernels);
            
            // Apply initial speed
            if (timeline) {
                timeline.timeScale(initialSpeed);
            }
        }
    }, node); // Scope the context to the SVG element

    return {
        // --- REACTIVE UPDATE METHOD ---
        update(newParams: PopcornParams) {
            const newSpeed = newParams.speed ?? 1.0;
            if (newSpeed !== timeline?.timeScale() && timeline) {
                timeline.timeScale(newSpeed); // Reapply timeScale if speed changes
            }
            // Note: Kernel count cannot be changed dynamically without rebuilding the timeline, 
            // so we only update speed here.
        },
        
        // --- DESTROY METHOD ---
        destroy() {
            if (ctx) {
                ctx.revert();
            }
        }
    };
}