// src/utils/CinemaAnimations.ts (Applied latest fix for Force Battle)

import { gsap } from 'gsap';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
// NOTE: Assume gsap.registerPlugin(Physics2DPlugin) is done in entry file

/**
 * Helper function extracted from original component.
 */
function random(min: number, max: number): number { 
    return min + (Math.random() * (max - min)); 
}

/**
 * Creates the Popcorn Toss and Wiggle timeline.
 * @param {HTMLElement} popcornBucketEl
 * @param {HTMLElement[]} popcornCorns
 * @param {number} [maxKernels=20] - Limit the number of kernels animated per cycle.
 * @returns {gsap.core.Timeline | null} The continuous popcorn animation timeline.
 */
export function createPopcornTimeline(
	popcornBucketEl: HTMLElement,
	popcornCorns: HTMLElement[],
	maxKernels: number = 20
): gsap.core.Timeline | null {
    
    // Safety check: ensure kernels exist before creating timeline
    if (popcornCorns.length === 0) {
        return null;
    }
    
    // Function to run a single physics toss sequence
	function popCorn(): gsap.core.Tween {
        
        // --- FIX: Create a shallow clone of the array to ensure it has all Array methods for shuffle ---
        // This resolves the 'a.sort is not a function' error by ensuring GSAP operates on a clean Array object.
		const cornsForShuffle = [...popcornCorns];
        
        // Use the maxKernels limit passed in
        const cornsToAnimate = gsap.utils.shuffle(cornsForShuffle).slice(0, maxKernels);

        // Safety check to prevent GSAP targets not found error if shuffle results in an empty array (which shouldn't happen here)
        if (cornsToAnimate.length === 0) {
            return gsap.to({}, { duration: 0 }); // Return a no-op tween
        }

        // --- Explicitly reset corns to zero transform BEFORE the physics animation ---
		gsap.set(cornsToAnimate, {
			x: 0,
			y: 0,
			rotation: 0,
			transformOrigin: '50% 50%',
			clearProps: 'x,y,rotation,scale'
		});

		return gsap.fromTo(
			cornsToAnimate,
            {
				// Starting position
                x: 0,
                y: 0,
                scale: 1,
            },
            {
                // The physics calculation
                duration: () => random(0.8, 1.2),
                scale: () => random(1.1, 1.5),
                physics2D: {
                    velocity: () => random(180, 380),
					angle: () => random(230, 290),
                    gravity: () => random(1000, 1200),
                    steps: 3
                },
				force3D: true,
                stagger: {
                    each: random(0.02, 0.08),
                    from: "random"
                }
            }
        );
    }
    
    // Function for the bucket wiggle animation
    function wiggle(): gsap.core.Tween {
        return gsap.to(popcornBucketEl, {
			transformOrigin: '50% 100%',
			scaleX: 1.02,
			scaleY: 0.98,
			y: 1,
            rotation: 0.5,
			duration: 1,
			yoyo: true,
            repeat: 12,
			ease: 'power2.inOut',
			force3D: true
        });
    }

    // Main timeline orchestration
	const popcornTl = gsap.timeline({
		repeat: -1,
        delay: 0.2, // Final Tweak: Setting delay between cycles to 0.2s for high-energy loop
		defaults: { clearProps: 'physics2D' }
	})
    .add(popCorn(), 0)
    .add(wiggle(), 0)
    .add(popCorn(), 0.3); // Second burst starts at 0.3s

    return popcornTl;
}

/**
 * Creates the Force Battle timeline (Hotdog/Coke tug-of-war).
 * @param {HTMLElement} hotdogEl - The hotdog image element.
 * @param {HTMLElement} cokeEl - The coke image element.
 * @returns {gsap.core.Timeline | null} The continuous force battle timeline.
 */
export function createForceBattleTimeline(hotdogEl: HTMLElement, cokeEl: HTMLElement): gsap.core.Timeline | null {
	if (!hotdogEl || !cokeEl) {
		console.warn('Force battle elements not found, skipping timeline creation.');
		return null;
	}

	// ✅ FIX: Create a seamless tug-of-war by animating from right-to-left,
	// and then using `yoyo: true` to automatically play the animation in reverse,
	// creating a smooth left-to-right return.
	const forceBattleTl = gsap.timeline({
		repeat: -1,
		yoyo: true, // This is key for the seamless back-and-forth
		repeatDelay: 0.3,
		defaults: { ease: 'power2.inOut', duration: 1.5 }
	});

	// --- PHASE 1: YODA PULLS (RIGHT) ---
	forceBattleTl.to(hotdogEl, { x: 40, rotation: -15 });
	forceBattleTl.to(cokeEl, { x: 25, rotation: 20 }, '<');

	// --- PHASE 2: VADER PULLS (LEFT) ---
	forceBattleTl.to(hotdogEl, { x: -40, rotation: 20 }, '>0.2');
	forceBattleTl.to(cokeEl, { x: -30, rotation: -15 }, '<');

	return forceBattleTl;
}