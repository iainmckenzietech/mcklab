// src/utils/three/materials.ts

import * as THREE from 'three';
import { TransporterDissolveShader } from './shaders';

// This variable will be set by the main CinemaGallery class after the texture is loaded.
let perlinNoiseTexture: THREE.Texture | null = null;

/**
 * Sets the global Perlin noise texture used by all dissolve materials.
 * This must be called once during the scene's initialization.
 * @param texture The loaded Perlin noise texture.
 */
export function setPerlinTexture(texture: THREE.Texture) {
	perlinNoiseTexture = texture;
}

/**
 * Creates and configures a `ShaderMaterial` for the transporter/dissolve effect.
 * This function acts as a factory, ensuring all dissolve materials are created consistently.
 * @param texture The base texture for the object (e.g., the astronaut image).
 * @param glowColor The color of the dissolve effect's leading edge.
 * @returns A configured `THREE.ShaderMaterial` ready to be applied to a mesh.
 */
export function createDissolveMaterial(texture: THREE.Texture, glowColor: number = 0x00ffff): THREE.ShaderMaterial {
	// --- Validation Guards ---
	if (!perlinNoiseTexture) {
		throw new Error('createDissolveMaterial Error: Perlin noise texture has not been set. Call setPerlinTexture() first.');
	}
	if (!texture) {
		throw new Error('createDissolveMaterial Error: A base texture (t_map) must be provided.');
	}

	// Create the material by merging the base shader uniforms with specific instance uniforms.
	const material = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			TransporterDissolveShader.uniforms,
			{
				t_map: { value: texture },
				t_noise: { value: perlinNoiseTexture },
				u_glow_color: { value: new THREE.Color(glowColor) },
				u_brightness: { value: 1.0 }, // ✅ NEW: Add brightness uniform.
				u_opacity: { value: 1.0 } // ✅ FIX: Set opacity to 1 by default to remove the fade-in.
			}
		]),
		vertexShader: TransporterDissolveShader.vertexShader,
		fragmentShader: TransporterDissolveShader.fragmentShader,
		transparent: true,
		side: THREE.DoubleSide,
	});

	return material;
}