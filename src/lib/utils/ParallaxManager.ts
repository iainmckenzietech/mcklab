// src/utils/ParallaxManager.ts (Full Optimized Version)

// src/utils/ParallaxManager.ts

import { gsap } from 'gsap';

// --- GLOBAL GSAP OPTIMIZATION (Must be done once per module) ---
// This ensures performance stability for the quickTo setters
gsap.ticker.lagSmoothing(1000, 16); 

// Configuration extracted from your component
const parallaxConfig = {
	limitX: 60,
	limitY: 15,
	originX: 0.5,
	originY: 0.5,
	seatXMultiplier: 2.0,
	usherXMultiplier: 0.7
};

// --- TYPESCRIPT COORDS STRUCTURE ---
interface BoundingRect { width: number; height: number; left: number; top: number; }
interface Coords {
    centerX: number;
    centerY: number;
    rect: BoundingRect;
}

// --- EXTERNALIZED, MUTABLE COORDINATE STATE ---
let coords: Coords = {
    centerX: 0,
    centerY: 0,
    rect: { width: 0, height: 0, left: 0, top: 0 },
};

// Global variables to manage the listener and the RAF loop state
let removeListeners: (() => void) | undefined;
let rafId: number | null = null; 
let resizeRaf: number | null = null;
let observer: IntersectionObserver | null = null;


// Utility function to update the coordinates based on the current window size
function updateCoordinates(parallaxContainer: HTMLElement) {
    const newRect = parallaxContainer.getBoundingClientRect();
    coords.rect = { 
        width: newRect.width, 
        height: newRect.height, 
        left: newRect.left, 
        top: newRect.top 
    };
    coords.centerX = coords.rect.left + coords.rect.width * parallaxConfig.originX;
    coords.centerY = coords.rect.top + coords.rect.height * parallaxConfig.originY;
}

// Handle Resize Event (Debounced to RAF)
const handleResize = (parallaxContainer: HTMLElement) => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
        updateCoordinates(parallaxContainer);
        resizeRaf = null;
    });
};


/**
 * Initializes the custom parallax mouse tracking on the provided container.
 * @param {HTMLElement} parallaxContainer The root element containing the parallax layers.
 * @param {boolean} isMobile Flag indicating mobile environment.
 * @returns {() => void} Cleanup function to remove listeners and reset layers.
 */
export function initCustomParallax(parallaxContainer: HTMLElement, isMobile: boolean): () => void {
    if (isMobile || !parallaxContainer) {
        if (removeListeners) removeListeners();
        removeListeners = undefined;
        return () => {}; 
    }

    if (removeListeners) { removeListeners(); }

    // --- INITIAL COORDINATE CACHING ---
    updateCoordinates(parallaxContainer); 

    // Cache layers ONCE
    // ✅ FIX: Exclude the logo and rope frame from the parallax effect to prevent animation conflicts.
    // This stops the jumpy behavior when the user hovers over the "Enter Site" sign.
    const layers = Array.from(parallaxContainer.querySelectorAll('.parallax-layer[data-depth]:not(.logo-container):not(.rope-frame):not(.balance)')) as HTMLElement[];

    // Pre-build quickTo functions for each layer
    const quickSetters = Array.from(layers).map(layer => {
        return {
            x: gsap.quickTo(layer, "x", { duration: 0.3, ease: "power2.out" }), // Tighter duration for snappier feel
            y: gsap.quickTo(layer, "y", { duration: 0.3, ease: "power2.out" }),
            z: gsap.quickTo(layer, "z", { duration: 0.3, ease: "power2.out" })
        };
    });

    let lastMousePosition = { x: coords.centerX, y: coords.centerY };

    // Define the core mouse movement logic (runs directly on mousemove event)
    const queueMouseMove = (e: MouseEvent) => {
        // Record position and queue RAF
        lastMousePosition = { x: e.clientX, y: e.clientY };

        if (rafId) return; 

        rafId = requestAnimationFrame(animateLayers);
    };

    const animateLayers = () => {
        // --- EDGE-CASE GUARD (NaN Prevention) ---
        if (coords.rect.width <= 0 || coords.rect.height <= 0) {
            rafId = null;
            return; 
        }

        const mouseX = lastMousePosition.x;
        const mouseY = lastMousePosition.y;

        // Use MUTABLE coords for calculation
        const offsetX = (mouseX - coords.centerX) / (coords.rect.width / 2);
        const offsetY = (mouseY - coords.centerY) / (coords.rect.height / 2);

        const clampedX = Math.max(-1, Math.min(1, offsetX)) * parallaxConfig.limitX;
        const clampedY = Math.max(-1, Math.min(1, offsetY)) * parallaxConfig.limitY;

        layers.forEach((layer, i) => {
            const depth = parseFloat(layer.dataset.depth || '0');
            const group = layer.dataset.group;
            let layerX = clampedX * depth;
            let layerY = clampedY * depth;

            // Apply Group-Specific Multipliers
            if (group === 'seats') {
                layerX *= parallaxConfig.seatXMultiplier;
                layerY *= 1.2;
                const layerZ = Math.abs(clampedX) * depth * 0.3; 
                quickSetters[i].z(layerZ); 
            } else if (group === 'ushers') {
                layerX *= parallaxConfig.usherXMultiplier;
            }
            // Execute the quickTo setters
            quickSetters[i].x(layerX);
            quickSetters[i].y(layerY);
        });
        
        rafId = null;
    };
    
    // --- ATTACH LISTENERS ---
    parallaxContainer.addEventListener('mousemove', queueMouseMove as (e: Event) => void);
    
    const boundHandleResize = () => handleResize(parallaxContainer);
    window.addEventListener('resize', boundHandleResize); 


    // --- IntersectionObserver Setup (Culling) ---
    observer = new IntersectionObserver((entries) => {
        const isVisible = entries[0]?.isIntersecting ?? true;
        
        if (!isVisible) {
            if (removeListeners) removeListeners(); // Pause listeners
        } else if (isVisible && !removeListeners) {
            // Resume listeners when scrolling back
            initCustomParallax(parallaxContainer, false); 
        }
    }, { threshold: 0.5 }); // High threshold for earlier pause
    observer.observe(parallaxContainer);


    // Create the cleanup function
    removeListeners = () => {
        parallaxContainer.removeEventListener('mousemove', queueMouseMove as (e: Event) => void);
        window.removeEventListener('resize', boundHandleResize);
        
        if (observer) observer.disconnect(); // Disconnect and reset
        observer = null;

        if (rafId) cancelAnimationFrame(rafId);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        
        // Reset layers immediately on cleanup
        quickSetters.forEach(setter => {
            setter.x(0); setter.y(0); setter.z(0);
        });
        removeListeners = undefined;
    };
    
    return removeListeners;
}

/**
 * Handles the reactive state change (e.g., switching to mobile view)
 * @param {HTMLElement} parallaxContainer The root element.
 * @param {boolean} isMobile Mobile flag for state toggle.
 */
export function handleParallaxState(parallaxContainer: HTMLElement, isMobile: boolean) {
    if (!parallaxContainer) return;
    
    if (isMobile) {
        parallaxContainer.style.pointerEvents = 'none';
        if (removeListeners) {
            removeListeners();
            removeListeners = undefined;
        }
        // Immediately reset layers
        gsap.set(parallaxContainer.querySelectorAll('.parallax-layer'), { x: 0, y: 0, z: 0 });
        
    } else {
        parallaxContainer.style.pointerEvents = 'auto';
        // When switching back to desktop, re-initialize
        if (!removeListeners) {
            initCustomParallax(parallaxContainer, isMobile);
        }
    }
}