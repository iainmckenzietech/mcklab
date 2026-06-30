// src/lib/utils/three/layers.ts

// Defines the rendering layers used for selective post-processing.
export const BASE_LAYER = 0; // Default layer for most objects
export const BLOOM_LAYER = 1; // For the nebula's atmospheric bloom
export const SPROCKET_BLOOM_LAYER = 2; // For the filmstrip sprockets' bloom
export const OBJECTS_BLOOM_LAYER = 3; // For the floating objects' bloom