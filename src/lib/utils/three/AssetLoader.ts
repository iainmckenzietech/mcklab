// src/lib/utils/three/AssetLoader.ts
import * as THREE from 'three';
import { createSafePerlinNoiseTexture, createSafeProceduralStarTexture } from './helpers';

export interface LoadedAssets {
    perlinTexture: THREE.Texture;
    placeholderTexture: THREE.Texture;
    starCrossTexture: THREE.Texture;
    starGlowTexture: THREE.Texture;
    nebulaTexture: THREE.Texture;
}

/**
 * A centralized utility for pre-loading all necessary textures for the scene.
 * This helps prevent redundant network requests and simplifies asset management.
 */
export class AssetLoader {
    public static async loadAll(): Promise<LoadedAssets> {
        const textureLoader = new THREE.TextureLoader();

        // Use Promise.all to load all assets in parallel for maximum efficiency.
        const [
            perlinTexture,
            placeholderTexture,
            starCrossTexture,
            starGlowTexture,
            nebulaTexture,
        ] = await Promise.all([
            // Perlin Noise
            textureLoader.loadAsync('/perlin.webp').then(tex => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                return tex;
            }).catch(() => createSafePerlinNoiseTexture()),

            // Placeholder
            textureLoader.loadAsync('/logo.png').then(tex => {
                tex.colorSpace = THREE.SRGBColorSpace;
                return tex;
            }).catch(() => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)),

            // Starfield Sprites
            textureLoader.loadAsync('/star-sprite.png').catch(() => createSafeProceduralStarTexture(256, 256, false)),
            textureLoader.loadAsync('/star-glow.png').catch(() => createSafeProceduralStarTexture(256, 256, true)),

            // Nebula Texture
            textureLoader.loadAsync('/universe3.webp').then(tex => {
                tex.colorSpace = THREE.SRGBColorSpace;
                return tex;
            })
        ]);

        return { perlinTexture, placeholderTexture, starCrossTexture, starGlowTexture, nebulaTexture };
    }
}