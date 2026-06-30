import * as THREE from 'three';
import { gsap } from 'gsap';
import { getBoundsAtDepth } from './maths';
import { NebulaShader } from './shaders';

const BASE_SIZE = 300.0;
const BLOOM_LAYER = 1; // The layer for objects that should bloom

/**
 * Manages the creation, animation, and audio-synchronization of the nebula effect.
 */
export class Nebula {
	public mesh: THREE.Mesh | null = null;
	private baseScale: number = 1.0; // Add and initialize baseScale

	constructor(scene: THREE.Scene, noiseTexture: THREE.Texture, nebulaTexture: THREE.Texture) {
		this.mesh = this.createUniverseOverlay(noiseTexture, nebulaTexture);
		if (this.mesh) {
			scene.add(this.mesh);
		}
	}

	private createUniverseOverlay(noiseTexture: THREE.Texture, texture: THREE.Texture): THREE.Mesh | null {
		// ✅ ROBUSTNESS: Guard against un-loaded textures.
		if (!texture?.image) {
			console.warn('Nebula texture not ready, skipping creation.');
			return null;
		}

		const aspect = texture.image.width / texture.image.height;
		const geometry = new THREE.PlaneGeometry(BASE_SIZE * aspect, BASE_SIZE);
		
		const material = new THREE.ShaderMaterial({
			uniforms: {
				...THREE.UniformsUtils.clone(NebulaShader.uniforms),
				t_diffuse: { value: texture },
				t_noise: { value: noiseTexture },
				u_colorShift: { value: 0.0 },
				u_mouse: { value: new THREE.Vector2() }
			},
			vertexShader: NebulaShader.vertexShader,
			fragmentShader: NebulaShader.fragmentShader,
			blending: THREE.AdditiveBlending,
			transparent: true,
			premultipliedAlpha: true,
			depthWrite: false
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.renderOrder = -3;
		mesh.layers.enable(BLOOM_LAYER);
		mesh.visible = false;
		return mesh;
	}

	public startIntroAnimation(camera: THREE.PerspectiveCamera) {
    if (!this.mesh) return;

    const isMobile = window.innerWidth < 768;
    const nebulaZ = isMobile ? -10 : -80; // ✅ FIX: Closer Z-depth for mobile to ensure centering.
    const bounds = getBoundsAtDepth(camera, nebulaZ);
    const scaleMultiplier = isMobile ? 3.5 : 3.5;

    const aspect = this.mesh.geometry.parameters.width / this.mesh.geometry.parameters.height;
    const targetScale = Math.min(bounds.x / aspect, bounds.y) * scaleMultiplier / BASE_SIZE;
	this.baseScale = targetScale;
	this.mesh.scale.set(targetScale, targetScale, 1);
    const nebulaFinalY = isMobile ? 0 : bounds.y * 0.15;
		
		// Set initial state (very small and far away)
		this.mesh.scale.set(targetScale * 0.2, targetScale * 0.2, 1); // ✅ FIX: Start at 20% of the final scale.
		this.mesh.position.set(0, nebulaFinalY - 15, nebulaZ - 150); // ✅ FIX: Start closer to the camera.
		this.mesh.rotation.set(0, 0, 0);
		(this.mesh.material as THREE.ShaderMaterial).uniforms.u_opacity.value = 0.0;
		(this.mesh.material as THREE.ShaderMaterial).uniforms.u_emissiveIntensity.value = 0.0;
		
		this.mesh.visible = true;
		
		// Animate to final state
		gsap.timeline()
			.to(this.mesh.scale, {
				x: targetScale, y: targetScale,
				duration: 1.8, ease: "elastic.out(1, 0.4)"
			}, 0)
			.to(this.mesh.position, {
				y: nebulaFinalY, z: nebulaZ,
				duration: 1.8, ease: "elastic.out(1, 0.4)"
			}, 0)
			.to((this.mesh.material as THREE.ShaderMaterial).uniforms.u_opacity, {
				value: 0.6, duration: 1.0, ease: "power2.out"
			}, 0.4);
}

	public pulse(intensity: number = 1) {
		if (!this.mesh || !(this.mesh.material instanceof THREE.ShaderMaterial)) return;
		const u = this.mesh.material.uniforms;
	
		// Kill any running pulse
		gsap.killTweensOf([u.u_emissiveIntensity, this.mesh.scale]);
	
		const glowTarget = 1.2 + intensity * 4.5; // Increased from 2.0
		const bounceAmount = 1.8 * intensity;   // Increased from 0.08
		const targetScale = this.baseScale * (1.0 + bounceAmount);
	
		// ---- GLOW ----
		gsap.to(u.u_emissiveIntensity, {
			value: glowTarget,
			duration: 0.18,
			ease: 'power2.out',
			yoyo: true,
			repeat: 1
		});
	
		// ---- BOUNCE (absolute, safe) ----
		gsap.to(this.mesh.scale, {
			x: targetScale,
			y: targetScale,
			duration: 0.5,
			ease: 'back.out(2.2)',
			yoyo: true,
			repeat: 1,
		});
	}
	public handleAudioCue(action: string, camera: THREE.PerspectiveCamera) {
		// This method can be expanded to handle specific, timed animations
		// that are more complex than a simple pulse.
	}

	public resize(camera: THREE.PerspectiveCamera) {
		if (!this.mesh || !this.mesh.geometry.parameters.width) return;

		const isMobile = window.innerWidth < 768;
		const nebulaZ = isMobile ? -40 : -80; // ✅ FIX: Closer Z-depth for mobile.
		const bounds = getBoundsAtDepth(camera, nebulaZ);
		const scaleMultiplier = isMobile ? 2.8 : 4.0;

		const aspect = this.mesh.geometry.parameters.width / this.mesh.geometry.parameters.height;

		const targetScale = Math.min(bounds.x / aspect, bounds.y) * scaleMultiplier / BASE_SIZE;
		this.baseScale = targetScale;   // ADD THIS
this.mesh.scale.set(targetScale, targetScale, 1);
		const nebulaFinalY = isMobile ? 0 : bounds.y * 0.18;
		this.mesh.scale.set(targetScale, targetScale, 1);
		this.mesh.position.y = nebulaFinalY;
		this.mesh.position.z = nebulaZ;
	}

	public update() {
		if (this.mesh) {
			if (this.mesh.material instanceof THREE.ShaderMaterial) {
				const uniforms = this.mesh.material.uniforms;
				uniforms.u_time.value += 0.01;
			}
			this.mesh.rotation.z += 0.0001;
		}
	}

	/**
	 * Toggles the visibility of the nebula.
	 * Note: This overrides the intro animation's visibility control.
	 * @param visible - True to show, false to hide.
	 */
	public setVisible(visible: boolean) {
		if (this.mesh) {
			this.mesh.visible = visible;
		}
	}
}