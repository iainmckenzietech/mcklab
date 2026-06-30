// $utils/Choreographer.ts

import { gsap } from 'gsap';
import type { DotMatrixDisplay } from './three/DotMatrixDisplay'; // ✅ NEW: Import the type
import { get } from 'svelte/store';
import { isSignHovered } from '$lib/stores';

// --- ClearScreen Class (Retained for integrity) ---
class ClearScreen {
    // ... (content of ClearScreen class remains the same) ...
    mother_container_elm: HTMLElement;
    root_elm: HTMLDivElement | undefined;
    top_elm: HTMLDivElement | undefined;
    bottom_elm: HTMLDivElement | undefined;

    constructor(opts: { mother_container_elm: HTMLElement }) {
        this.mother_container_elm = opts.mother_container_elm;
        this.build();
    }

    build() {
        if (typeof document === 'undefined') return;
        this.root_elm = document.createElement("div");
        this.root_elm.classList.add("clear_screen_container");
        document.body.appendChild(this.root_elm);

        this.top_elm = document.createElement("div");
        this.bottom_elm = document.createElement("div");

        this.root_elm.appendChild(this.top_elm);
        this.root_elm.appendChild(this.bottom_elm);

        gsap.set(this.root_elm, {
            display: "grid",
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            gridTemplateColumns: "1fr",
            gridTemplateRows: "1fr 1fr",
            opacity: 0,
            zIndex: 9999
        });
        gsap.set([this.top_elm, this.bottom_elm], {
            backgroundColor: "#80ff10",
            width: "100%",
            height: "100%",
            opacity: 0
        });
    }

    animate(): gsap.core.Timeline {
        let tl = gsap
            .timeline({
                onComplete: () => {
                    if (this.root_elm && this.root_elm.parentNode) {
                        this.root_elm.parentNode.removeChild(this.root_elm);
                    }
                }
            })
            .set(this.root_elm, { opacity: 1 })
            .set([this.top_elm, this.bottom_elm], { opacity: 1, stagger: 0.05 })
            .set([this.top_elm, this.bottom_elm], {
                opacity: 0,
                stagger: 0.05,
                delay: 0.1
            });
        return tl;
    }
}


/**
 * Sets the initial, off-screen GSAP states for all animated elements
 * BEFORE the entrance timeline begins. This prevents elements from popping in place.
 */
export function setInitialStates() {
    // ✅ FIX: Target the new .sign-assembly container for the initial off-screen position.
    gsap.set('.sign-assembly', { y: '-110vh' }); // Opacity is now handled by CSS initially
    
    // Seat Wrappers Initial Position (Hidden/Scaled)
    gsap.set('.seat-layer-wrapper', {
        position: 'absolute',
        left: '50%',
        xPercent: -50,
        bottom: 0,
        top: 'auto',
        opacity: 0,
        width: '100%',
        height: '550px'
    });
    
    // Usher Initial Position (Hidden)
    gsap.set('.usher-left', { autoAlpha: 0 });
    gsap.set('.usher-right', { autoAlpha: 0 });
}


/**
 * Creates and runs the main entrance sequence timeline.
 * @param {boolean} isMobile - True if the view is mobile.
 * @param {() => void} onStartCallback - Callback to run on timeline start.
 * @returns {gsap.core.Timeline}
 */
export function createEntranceTimeline(isMobile: boolean, onStartCallback: () => void): gsap.core.Timeline {
    if (isMobile) {
        // NEW: Explicitly hide elements on mobile that are part of the assembly
        gsap.set('.rope-frame', { autoAlpha: 0 }); // Keep rope hidden on mobile
        gsap.set('.balance', { autoAlpha: 0 });
    }

    const entranceTl = gsap.timeline({
        delay: 0.1,
        onStart: onStartCallback,
        defaults: { force3D: true }
    });
    
    if (!isMobile) {
        // COMMON PHASE 1: Balance Bar (Desktop Only)
        entranceTl.from('.balance', { y: '-50%', opacity: 0, duration: 0.5, ease: 'back.out(1.2)' }, 0.2);
    }

    // COMMON PHASE 2: Spotlight Sweep
    entranceTl.to('.spotlight', {
        backgroundPosition: '0% 50%',
        duration: .0,
        ease: 'power2.inOut',
        repeat: 1,
        yoyo: true
    }, 1.2);

    // COMMON PHASE 3: Ensure parallax layers are visible after initial positions are set
    entranceTl.set('.parallax-layer', { visibility: 'visible' }, 0);


    if (isMobile) {
        // MOBILE-SPECIFIC CHOREOGRAPHY (Uses less resource-heavy animations)
        entranceTl.to('.seat-layer-wrapper', { 
            y: 0, 
            opacity: 1, 
            scale: 1, 
            duration: 1.1,
            stagger: 0.1, 
            ease: 'back.out(1.7)'
        }, 0.5); 
        
        entranceTl.to('.usher-left', { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.8);
        entranceTl.fromTo('.usher-left', { y: 200 }, { y: 0, duration: 0.8, ease: 'power3.out' }, 0.8);
        
        entranceTl.fromTo(
            '.sign-assembly', // ✅ FIX: Animate the assembly on mobile
            { 
                y: '-120vh', 
                // No need for left/xPercent as the container is flex-centered
                opacity: 0, 
                scale: 1.1 
            },
            { y: 0, autoAlpha: 1, scale: 1, duration: 1.2, ease: 'back.out(1.7)' },
            1.0
        );

        entranceTl.to('#wrapper li', { duration: 0.1, "animation-duration": "150ms, initial", ease: 'power1.in' }, 2.2);

    } else {
        // DESKTOP CHOREOGRAPHY (More dramatic elastic effects)
        entranceTl.to(['.usher-left', '.usher-right'], { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.6);
        entranceTl.from('.usher-left', { x: -800, duration: 1.2, ease: 'elastic.out(1, 0.7)' }, 0.6);
        entranceTl.from('.usher-right', { x: 800, duration: 1.2, ease: 'elastic.out(1, 0.7)' }, 0.6);
        
        entranceTl.fromTo('.seat-layer-wrapper', { y: 50, opacity: 0, scale: 0.8 },  
          { y: 0, opacity: 1, scale: 1, duration: 1.1, stagger: 0.15, ease: 'back.out(1.7)' }, 0.6);

        entranceTl.fromTo(
            '.sign-assembly', // ✅ FIX: Animate the new .sign-assembly container.
            { 
                y: '-120vh',
                opacity: 0,
                scale: 0.8 
            },
            { y: 0, autoAlpha: 1, scale: 1, duration: 1, ease: 'elastic.out(1.2, 0.5)' },
            1.2
        );
    }
    
    return entranceTl;
}

/**
 * Creates and runs the main exit sequence timeline (Dolly Zoom / Warp Effect).
 * @param dispatch - Svelte event dispatcher instance ({ dispatch: (type: string, detail?: any) => void })
 * @returns {gsap.core.Timeline}
 */
export function createExitTimeline(dispatch: (type: string, detail?: any) => void, isMobile: boolean, onComplete: () => void): gsap.core.Timeline {
    const targetWarpElements = ['.seat-layer-wrapper', '.usher-left', '.usher-right'];

    const exitTl = gsap.timeline({
        onStart: () => {
            // ✅ FIX: The phase change must happen here to prevent the intro from being hidden prematurely.
            dispatch('startWarp');
        },
        onComplete: onComplete, // ✅ ADD: Call the onComplete callback when the timeline finishes.
        clearProps: 'all',
        defaults: { force3D: true }
    });

    // 1. Curtains / lights
    exitTl.call(() => document.getElementById('stage')?.classList.add('closing'), null, 0);

    // 3. UI exit (fast)
    if (isMobile) {
        // ✅ NEW: Mobile-specific "warp into nothing" animation for the sign.
        exitTl.to('.logo-container', {
            scale: 5,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in'
        }, 0);
    } else {
        // Original desktop animation
        // ✅ FIX: Target the entire sign assembly for the exit animation.
        exitTl.to('.sign-assembly', { scale: 1.2, y: '-120vh', opacity: 0, duration: 0.6, ease: 'power3.in' }, 0);
    }

    exitTl.to('.usher-left',  { autoAlpha: 0, x: -800, duration: 0.55, ease: 'power2.in' }, 0);
    exitTl.to('.usher-right', { autoAlpha: 0, x:  800, duration: 0.55, ease: 'power2.in' }, 0);

    exitTl.to('.seat-layer-wrapper', {
        scale: 30, y: '300vh',
        duration: 0.6, stagger: 0.03, ease: 'power4.in'
    }, 0);

    // 4. Filter bridge
   

    // 5. **Very short stage fade** (no black)
    exitTl.to('#stage', { opacity: 0, duration: 0.10, ease: 'power2.in' }, 0.25);

    return exitTl;
}

/**
 * Injects a dynamic stylesheet for mobile-specific animations, like the red glow.
 */
export function injectMobileStyles() {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.id = 'mobile-glow-styles';
    style.innerHTML = `
        @media (max-width: 768px) {
            .enter-image-button.loaded {
                animation: red-glow 2.5s infinite alternate, flicker-image 1.8s infinite alternate;
            }

            @keyframes red-glow {
                from { filter: brightness(1) contrast(1) drop-shadow(0 0 5px #ff0000); }
                to   { filter: brightness(1.5) contrast(1.2) drop-shadow(0 0 15px #ff0000); }
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Subscribes to the isSignHovered store to control the marquee light animation.
 * @returns A function to unsubscribe from the store.
 */
export function manageMarqueeAnimation() {
	const unsubscribe = isSignHovered.subscribe(hovered => {
		const marqueeLights = document.querySelectorAll('#wrapper li');
		marqueeLights.forEach(light => {
			const htmlLight = light as HTMLElement;
			// This logic is now handled by CSS rules in Intro.svelte
		});
	});
	return unsubscribe;
}

/**
 * ✅ NEW: Manages the DotMatrixDisplay, switching between scrolling and static text on hover.
 * @param {DotMatrixDisplay} display - The DotMatrixDisplay instance.
 * @returns A function to stop the animation and unsubscribe.
 */
export function manageDotMatrixAnimation(display: DotMatrixDisplay) {
	let isHovering = false;
	let rafId: number;

	const scrollLoop = () => {
		if (!isHovering && display) {
			display.scrollPos += 0.5; // Scrolling speed
			display.redraw();
		}
		rafId = requestAnimationFrame(scrollLoop);
	};

	// Start the continuous scroll loop
	scrollLoop();

	const unsubscribe = isSignHovered.subscribe(hovered => {
		isHovering = hovered;
		if (display) {
			if (isHovering) {
				// On hover, stop the scroll and show static "START" text.
				display.writeStaticText('START');
			} else {
				// On mouse out, the scrollLoop will automatically take over.
				// We just need to clear the static text from the canvas once.
				display.clear();
			}
		}
	});

	// Return a cleanup function
	return () => {
		unsubscribe();
		cancelAnimationFrame(rafId);
	};
}
/**
 * Creates a GSAP timeline for the continuous popcorn popping animation.
 * @param {HTMLElement} bucketEl - The SVG element for the popcorn bucket.
 * @param {SVGElement[]} corns - An array of the corn <use> elements.
 * @returns {gsap.core.Timeline}
 */
export function createPopcornTimeline(bucketEl: HTMLElement, corns: SVGElement[]): gsap.core.Timeline {
	const random = (min: number, max: number) => min + Math.random() * (max - min);

	const showUp = gsap.timeline().set(bucketEl, {
		transformOrigin: '50% 50%', autoAlpha: 1, scale: 1, rotation: 0
	});

	const wiggle = gsap.timeline().to(bucketEl, {
		transformOrigin: '50% 100%', scaleX: 1.02, scaleY: 0.98, y: 1, rotation: 0.5,
		duration: 1, yoyo: true, repeat: 12, ease: 'power2.inOut'
	}); // ✅ FIX: Wrap the repeating tween in its own timeline.

	const popCorn = (startTime: number) => {
		const tl = gsap.timeline({ delay: startTime });
		corns.forEach((corn, i) => {
			tl.to(corn, {
				duration: random(1, 1.5),
				scale: random(1.1, 1.5),
				physics2D: {
					velocity: random(100, 300),
					angle: random(230, 290),
					gravity: random(1000, 1200)
				},
				delay: i * random(0.05, 0.15),
				force3D: true
			}, 0);
		});
		return tl;
	};

	const popcornTl = gsap.timeline({ repeat: -1, delay: 0 });
	// ✅ FIX: Add the child timelines directly to the parent at specific time labels.
	// This ensures the parent timeline has full control over them.
	popcornTl.add(showUp, 'start');
	popcornTl.add(wiggle, 0);
	popcornTl.add(popCorn(0), 0); // First burst at the beginning
	popcornTl.add(popCorn(2.0), 0); // Second burst starts 2s in, relative to the parent
	return popcornTl;
}

/**
 * Creates a GSAP timeline for the hotdog/coke "force battle" animation.
 * @param {HTMLElement} hotdogEl - The hotdog image element.
 * @param {HTMLElement} cokeEl - The coke image element.
 * @returns {gsap.core.Timeline}
 */
export function createForceBattleTimeline(hotdogEl: HTMLElement, cokeEl: HTMLElement): gsap.core.Timeline {
	const forceBattleTl = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 0.5 });

	forceBattleTl.to(hotdogEl, {
		duration: 1.5, x: 10, y: -5, rotation: -5, ease: "power2.inOut",
	}, "start")
	.to(hotdogEl, {
		duration: 1.5, x: -10, y: 5, rotation: 5, ease: "power2.inOut",
	}, ">");

	forceBattleTl.to(cokeEl, {
		duration: 1.2, x: -8, y: -15, rotation: 10, ease: "power1.inOut",
	}, "start+=0.3")
	.to(cokeEl, {
		duration: 1.2, x: 8, y: -10, rotation: -10, ease: "power1.inOut",
	}, ">");

	return forceBattleTl;
}
export { ClearScreen };