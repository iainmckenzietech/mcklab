// src/utils/actions/forceBattle.ts (Corrected)
import { gsap } from 'gsap'; // <-- ADD THIS ESSENTIAL IMPORT
import { createForceBattleTimeline } from '../CinemaAnimations.js'; 

/**
 * Svelte Action to initialize and manage the Force Battle animation.
 */
export function forceBattle(node: HTMLElement): { destroy: () => void } {
    let timeline: gsap.core.Timeline | null = null;
    let ctx: gsap.Context;

    // Use querySelector on the bound node to find the children
    const hotdogEl = node.querySelector('.floating-item.hotdog') as HTMLElement;
    const cokeEl = node.querySelector('.floating-item.coke') as HTMLElement;

    if (hotdogEl && cokeEl) {
        ctx = gsap.context(() => {
            // GSAP is used here, so it must be imported at the top!
            timeline = createForceBattleTimeline(hotdogEl, cokeEl);
        }, node);
    } else {
        console.warn("Force Battle Action failed: Could not find hotdog or coke elements within the container.");
    }

    return {
        destroy() {
            if (ctx) {
                ctx.revert();
            }
        }
    };
}