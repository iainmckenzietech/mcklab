// src/utils/three/math.ts

import * as THREE from 'three';

/**
 * Calculates the visible width and height of the viewport at a specific depth from the camera.
 * This is essential for positioning objects so they appear at the edges of the screen.
 * @param camera The perspective camera used in the scene.
 * @param depth The 'z' distance from the camera where the bounds should be calculated.
 * @returns An object with the half-width (x) and half-height (y) of the viewport at that depth.
 */
export function getBoundsAtDepth(camera: THREE.PerspectiveCamera | undefined, depth: number): { x: number; y: number } {
	// Guard against the camera not being initialized yet.
	if (!camera) {
		console.warn('getBoundsAtDepth was called before the camera was initialized. Returning zero bounds.');
		return { x: 0, y: 0 };
	}

	const distance = Math.abs(camera.position.z - depth);
	const vFOV = THREE.MathUtils.degToRad(camera.fov); // Vertical Field of View in radians
	const height = 2 * Math.tan(vFOV / 2) * distance;
	const width = height * camera.aspect;

	// We return half the width/height because we typically calculate from the center (0,0)
	return { x: width / 2, y: height / 2 };
}

/**
 * A classic easing function that overshoots its target and then bounces back.
 * Useful for creating springy, organic animations.
 * @param x The progress of the animation, from 0.0 to 1.0.
 * @returns The eased value.
 */
export function easeOutBack(x: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;

	return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}