// src/utils/three/Starfield.ts
import * as THREE from 'three';
import { StarfieldShader } from './shaders';
import { createSafeProceduralStarTexture } from './helpers';
import { gsap } from 'gsap';
import type { QualityLevel } from './PerformanceMonitor';

interface LayerConfig {
  speed: number;
  count: number;
}

const QUALITY_CONFIG: Record<QualityLevel, LayerConfig[]> = {
  low: [
    { speed: 0.2, count: 1500 }, // Total: 3,000
    { speed: 0.5, count: 1000 },
    { speed: 1.0, count: 500 }
  ],
  medium: [
    { speed: 0.2, count: 8000 }, // Total: 14,000
    { speed: 0.5, count: 4000 },
    { speed: 1.0, count: 2000 }
  ],
  high: [
    { speed: 0.2, count: 30000 }, // Total: 28,000
    { speed: 0.5, count: 8000 },
    { speed: 1.0, count: 5000 }
  ]
};

export class Starfield {
  public mesh!: THREE.Points;
  public material!: THREE.ShaderMaterial;
  private mouseTarget = new THREE.Vector2();
  private mouseCurrent = new THREE.Vector2();
  private isActive = false;
  private lastUpdate = 0;
  private updateInterval = 1 / 30; // 30 FPS when idle

  // --- Constructor is now private to enforce creation via the async `create` method ---
  private constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private quality: QualityLevel = 'high'
  ) {
    // Initialization is now handled by the `create` method
  }

  // --- A static async factory method to ensure the instance is fully loaded before use ---
  public static async create(scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: QualityLevel = 'high', crossTex: THREE.Texture, glowTex: THREE.Texture): Promise<Starfield> {
    const starfield = new Starfield(scene, renderer, quality);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    crossTex.anisotropy = maxAnisotropy;
    glowTex.generateMipmaps = true;
    glowTex.minFilter = THREE.LinearMipmapLinearFilter;
    glowTex.magFilter = THREE.LinearFilter;
    glowTex.anisotropy = maxAnisotropy;

    starfield.initStarfield(starfield.scene, starfield.renderer, starfield.quality, crossTex, glowTex);

    // Force texture read + shader use
    starfield.material.uniforms.u_time.value = 0.001;
    starfield.material.needsUpdate = true;

    return starfield;
  }

  private initStarfield(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    quality: QualityLevel,
    crossTex: THREE.Texture,
    glowTex: THREE.Texture
  ) {
    const layers = QUALITY_CONFIG[quality];
    const totalPoints = layers.reduce((s, l) => s + l.count, 0);

    const positions = new Float32Array(totalPoints * 3);
    const randoms = new Float32Array(totalPoints);
    const speeds = new Float32Array(totalPoints);
    const types = new Float32Array(totalPoints);

    let offset = 0;
    for (const { speed, count } of layers) {
      for (let i = 0; i < count; i++) {
        const spread = 2000;
        positions[offset * 3]     = (Math.random() - 0.5) * spread;
        positions[offset * 3 + 1] = (Math.random() - 0.5) * spread;
        positions[offset * 3 + 2] = (Math.random() - 0.5) * spread;

        randoms[offset] = Math.random();
        speeds[offset] = speed;
        types[offset] = Math.random() > 0.5 ? 1 : 0;
        offset++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aLayerSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aSpriteType', new THREE.BufferAttribute(types, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(StarfieldShader.uniforms),
      vertexShader: StarfieldShader.vertexShader,
      fragmentShader: StarfieldShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    // Cinematic defaults
    // ✅ FIX: Start with brightness at 0 so they can be faded in.
    this.material.uniforms.tStarCross.value = crossTex;
    this.material.uniforms.tStarGlow.value = glowTex;
    this.material.uniforms.u_starBrightness.value = 0.0;
    this.material.uniforms.u_twinkleSpeed.value = 1.2;
    this.material.uniforms.u_colorVariety.value = 0.8;
    this.material.uniforms.u_pixelRatio.value = renderer.getPixelRatio();

    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  public update(
    elapsedTime: number,
    currentWarp: number,
    masterWarp: number,
    mouse: { x: number; y: number },
    forceActive: boolean = false
  ) {
    if (!this.material) return;

    const delta = elapsedTime - this.lastUpdate;
    const isActive = forceActive || this.isActive;
    if (delta < (isActive ? 0 : this.updateInterval)) return;

    this.lastUpdate = elapsedTime;

    // Smooth mouse
    this.mouseTarget.set(mouse.x, mouse.y);
    this.mouseCurrent.lerp(this.mouseTarget, 0.1);
    this.material.uniforms.u_mouse.value.copy(this.mouseCurrent);

    // Warp
    this.material.uniforms.u_time.value = elapsedTime;
    this.material.uniforms.u_warp.value = currentWarp;
    this.material.uniforms.u_masterWarp.value = masterWarp;

    // Auto-deactivate
    if (!forceActive) this.isActive = false;
  }

  public setActive(active: boolean) {
    this.isActive = active;
  }

  // === CINEMATIC CONTROLS ===
  public setBrightness(value: number, duration = 1, ease = 'power2.out') {
    if (this.material) {
      gsap.to(this.material.uniforms.u_starBrightness, { value, duration, ease });
    }
  }

  public setWarpGlow(intensity: number, duration = 1.3, ease = 'power2.out') {
    if (this.material) {
      gsap.to(this.material.uniforms.u_warpGlow, {
        value: intensity,
        duration,
        ease
      });
    }
  }

  public setTemperature(shift: number, duration = 1) {
    if (this.material) {
      gsap.to(this.material.uniforms.u_colorShift, { value: shift, duration });
    }
  }

  public triggerSupernova() {
    if (!this.material) return;
    const intensity = 15 + Math.random() * 10;
    gsap.to(this.material.uniforms.u_starBrightness, {
      value: intensity,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }

  public pulse(intensity: number) {
    if (!this.material) return;

    // A very subtle brightness flash, less intense than the nebula's bloom
    const currentBrightness = this.material.uniforms.u_starBrightness.value;
    gsap.to(this.material.uniforms.u_starBrightness, {
      value: currentBrightness + (intensity * 0.5), // Much smaller impact than bloom
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }

  public setVisible(visible: boolean) {
    if (this.mesh) this.mesh.visible = visible;
  }

  public dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.ShaderMaterial).uniforms.tStarCross.value?.dispose();
      (this.mesh.material as THREE.ShaderMaterial).uniforms.tStarGlow.value?.dispose();
      (this.mesh.material as THREE.ShaderMaterial).dispose();
      this.mesh.removeFromParent();
    }
  }
}
