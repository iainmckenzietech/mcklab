import * as THREE from 'three';

/**
 * Creates a procedural star texture as a fallback when an image can't be loaded.
 * This version is server-side-rendering (SSR) safe as it uses a DataTexture.
 * @param width The width of the texture.
 * @param height The height of the texture.
 * @param isGlow If true, creates a soft glow texture; otherwise, creates a sharp cross texture.
 * @returns A THREE.DataTexture.
 */
export function createSafeProceduralStarTexture(width = 64, height = 64, isGlow = false): THREE.DataTexture {
    const size = width * height;
    const data = new Uint8Array(size * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let brightness = 0;

            if (isGlow) {
                const cx = width / 2, cy = height / 2;
                const dist = Math.hypot(x - cx, y - cy) / (Math.min(cx, cy));
                brightness = Math.max(0, 255 * (1 - dist));
            } else {
                const centerX = width / 2, centerY = height / 2;
                const inCross = Math.abs(x - centerX) < 8 || Math.abs(y - centerY) < 8;
                brightness = inCross ? 255 : 0;
            }

            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = brightness;
        }
    }

    const texture = new THREE.DataTexture(data, width, height);
    texture.needsUpdate = true;
    return texture;
}

export function createSafePerlinNoiseTexture(width = 256, height = 256): THREE.DataTexture {
	const size = width * height;
	const data = new Uint8Array(size * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const noise = (Math.sin(x * 0.1) * Math.cos(y * 0.1) + 1) * 128;
			data[idx] = noise; data[idx + 1] = noise; data[idx + 2] = noise; data[idx + 3] = 255;
		}
	}
	const texture = new THREE.DataTexture(data, width, height);
	texture.generateMipmaps = false;
	texture.needsUpdate = true;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	return texture;
}