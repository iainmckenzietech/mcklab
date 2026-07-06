// FloatingObjectsManager.ts (updated)
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { AudioManager } from '../AudioManager';
import { createDissolveMaterial, setPerlinTexture } from './materials';
import { getBoundsAtDepth } from './maths';

const teleportColors = [
	0x00ffff, 
	0xff00ff, 
	0xffff00, 
	0xffaa00, 
	0x00ff00,
];

const objectConfigs = [
    // The astronaut is the primary brand object. Set to 1.0x the base size.
    { name: 'Astronaut', path: '/monkeyhal.webp', glow: 0x00ffff, mobileReduction: 0.90, baseScaleFactor: 6.6 },
    // ✅ FIX: Re-ordered objects for better initial placement and to avoid overlaps.
    { name: 'Enterprise', path: '/enterprise.webp', glow: 0x00ffff, mobileReduction: 0.70, baseScaleFactor: 0.75 },
    { name: 'Optimus', path: '/optimus.webp', glow: 0x00aaff, mobileReduction: 0.60, baseScaleFactor: 1.08 }, // 20% bigger
    { name: 'Roadster', path: '/roadster.webp', glow: 0xffaa00, mobileReduction: 0.60, baseScaleFactor: 0.5 },
    { name: 'Tars', path: '/tsars.webp', glow: 0xffffff, mobileReduction: 0.75, baseScaleFactor: 0.8 },
    { name: 'Predator', path: '/predator.webp', glow: 0x00ff00, mobileReduction: 0.70, baseScaleFactor: 1.2 }, // Made bigger
    { name: 'MillenniumFalcon', path: '/millenniumfalcon.webp', glow: 0xaaaaaa, mobileReduction: 0.50, baseScaleFactor: 0.9 },
];

const LOD_DISTANCE_THRESHOLD = 25; // Objects farther than this will be updated less frequently
const LOD_FRAME_SKIP = 8;          // Update far objects only every 8th frame

// ✅ NEW: Tunable constants for object movement speeds
const ASTRONAUT_VELOCITY_MULTIPLIER = 0.03;
const OTHER_OBJECT_VELOCITY_MULTIPLIER = 0.015; // Increased speed for other objects
const OTHER_OBJECT_SPIN_SPEED_MULTIPLIER = 0.001;   // Increased spin for other objects
export interface FloatingObject {
    matrix: THREE.Matrix4;
    velocity: THREE.Vector3;
    spinSpeed: number;
    hasFadedIn: boolean;
    justFadedIn?: boolean; // ✅ ADD: To handle the physics handover smoothly.
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    bobOffset: number; // For unique bobbing motion
    scale: THREE.Vector3;
    fullScale: THREE.Vector3; // The final, full scale for the object
    parallaxInfluence: number; // ✅ NEW: To smoothly introduce parallax
}

type FilmstripManagerInstance = import('./FilmstripManager').FilmstripManager;

export class FloatingObjectsManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private objects: (FloatingObject & { name: string })[] = [];
    private instancedMesh: THREE.InstancedMesh | null = null;
	private audioManager: AudioManager | null = null;
	private ready: Promise<void>;
	private resolveReady!: () => void;
    private isMobile: boolean; // 🔥 ADD: isMobile property
	private mouseCurrent = new THREE.Vector2(); // ✅ ADD: For smoothed mouse parallax
	private filmstripManager: FilmstripManagerInstance | null = null;

	private laserMesh: THREE.Mesh | null = null; // For Optimus's laser
	private optimusLastLaserTime: number = 0;
	private optimusLaserCooldown: number = 6.0 + Math.random(); // Initial cooldown

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, perlinTexture: THREE.Texture, audioManager: AudioManager, isMobile: boolean, filmstripManager: FilmstripManagerInstance | null = null) {
        this.scene = scene;
        this.camera = camera;
        this.isMobile = isMobile; // 🔥 FIX: Receive isMobile from CinemaGallery
		this.audioManager = audioManager;
        this.load(perlinTexture);
		this.ready = new Promise(resolve => this.resolveReady = resolve);
		this.filmstripManager = filmstripManager;
    }

    private async load(perlinTexture: THREE.Texture) {
        
        const objectsToLoad = this.isMobile // 🔥 FIX: Use the passed isMobile state
            ? objectConfigs.filter(c => c.name === 'Astronaut')
            : objectConfigs;

        // --- 1. Create Texture Atlas ---
        const { atlasTexture, uvOffsets } = await this._createTextureAtlas(objectsToLoad.map(c => c.path));

        // --- 2. Create Instanced Mesh ---
        const baseGeometry = new THREE.PlaneGeometry(1, 1); // Simple 1x1 plane, will be scaled by matrix
        const instancedGeometry = new THREE.InstancedBufferGeometry();
		instancedGeometry.index = baseGeometry.index;
		instancedGeometry.setAttribute('position', baseGeometry.getAttribute('position'));
		instancedGeometry.setAttribute('uv', baseGeometry.getAttribute('uv'));

        const uvOffsetData = new Float32Array(objectsToLoad.length * 4); // x, y, width, height for each instance
        const glowColorData = new Float32Array(objectsToLoad.length * 3); // r, g, b for each instance
        const dissolveData = new Float32Array(objectsToLoad.length); // Per-instance dissolve progress
        const randomData = new Float32Array(objectsToLoad.length); // ✅ ADD: For unique glitch effects
        const effectTypeData = new Float32Array(objectsToLoad.length); // ✅ ADD: For special effects
        const flipData = new Float32Array(objectsToLoad.length); // NEW: Per-instance flip attribute

        // ✅ FIX: Define more teleport-in positions to avoid overlaps with new objects.
        const positions = [
            { x: -1, y: 1 },  // Top-left
            { x: 1, y: 1 },   // Top-right
            { x: -1, y: -1 }, // Bottom-left
            { x: 1, y: -1 },  // Bottom-right
            { x: -1, y: 0 },  // Middle-left
            { x: 1, y: 0 },   // Middle-right
        ];
        let positionIndex = 0;

        for (let i = 0; i < objectsToLoad.length; i++) {
            const config = objectsToLoad[i];
            // --- FIX: Fixed zDepth for consistent perceived size and removed randomness ---
            let zDepth: number;
            if (config.name === 'Astronaut') {
                // Astronaut is placed further back to appear larger and more central
                zDepth = -8; 
            } else { // Roadster
                zDepth = -4; // Other objects are closer
            }
            const bounds = getBoundsAtDepth(this.camera, zDepth);

            let position: THREE.Vector3;
            if (config.name === 'Astronaut') {
                // The astronaut always starts in the center.
                position = new THREE.Vector3(0, 0, zDepth);
            } else {
                // ✅ FIX: Assign other objects to one of the defined positions.
                const pos = positions[positionIndex % positions.length];
                // Use a multiplier to place them just inside the initial view
                position = new THREE.Vector3(
                    pos.x * bounds.x * 0.8,
                    pos.y * bounds.y * 0.8,
                    zDepth
                );
                positionIndex++;
            }

            const mobileReduction = this.isMobile ? config.mobileReduction : 1.0;

            // --- FIX: Use the image's true aspect ratio, not the UV space aspect ratio ---
            // The UV space can be distorted by the atlas packing, but the image's intrinsic aspect is what matters.
            const aspect = uvOffsets[i].imageWidth / uvOffsets[i].imageHeight;
            
            // --- REFACTORED SCALING LOGIC ---
            // TWEAK: Reduced BASE_OBJECT_SIZE for more intuitive control with baseScaleFactor.
            const BASE_OBJECT_SIZE = this.isMobile ? 2.25 : 3.0; 
            const fullScale = new THREE.Vector3(
                BASE_OBJECT_SIZE * aspect * mobileReduction * config.baseScaleFactor,
                BASE_OBJECT_SIZE * mobileReduction * config.baseScaleFactor,
                1.0
            );

            const initialScale = fullScale.clone().multiplyScalar(0.01);
            const quaternion = new THREE.Quaternion();
            const matrix = new THREE.Matrix4().compose(position, quaternion, initialScale);

            const depthVelocityScale = Math.max(0.3, (Math.abs(zDepth) / 12));
            const mobileVelocityScale = this.isMobile ? 0.6 : 1.0;

			const xVelocity = (Math.random() - 0.5) * 0.008 * depthVelocityScale * mobileVelocityScale;
            const yVelocity = (Math.random() - 0.5) * 0.008 * depthVelocityScale * mobileVelocityScale;


            this.objects.push({
                name: config.name,
                matrix,
                velocity: new THREE.Vector3(
                    config.name === 'Astronaut' 
                        ? (Math.random() - 0.5) * 0.01 * depthVelocityScale * mobileVelocityScale // Slower astronaut
                        : xVelocity,
                    config.name === 'Astronaut'
                        ? (Math.random() - 0.5) * 0.01 * depthVelocityScale * mobileVelocityScale // Slower astronaut
                        : yVelocity,
                    0
                ),
				spinSpeed: (Math.random() * 0.002 - 0.001), // Even slower spin
                hasFadedIn: false,
                justFadedIn: false, // ✅ ADD: Initialize the new state property.
                bobOffset: Math.random() * Math.PI * 2, // For unique bobbing motion
                position: position.clone(),
                quaternion: new THREE.Quaternion(),
                scale: initialScale.clone(), // Start with the tiny scale
                fullScale: fullScale.clone(), // Store the final target scale
                parallaxInfluence: 0.0 // ✅ NEW: Start with no parallax
            });

            // Store UV offset and size for this instance
            uvOffsetData[i * 4 + 0] = uvOffsets[i].x;
            uvOffsetData[i * 4 + 1] = uvOffsets[i].y;
            uvOffsetData[i * 4 + 2] = uvOffsets[i].width;
            uvOffsetData[i * 4 + 3] = uvOffsets[i].height;

            // Store glow color for this instance
            const randomTeleportColor = teleportColors[Math.floor(Math.random() * teleportColors.length)];
			const color = new THREE.Color(randomTeleportColor);
            glowColorData[i * 3 + 0] = color.r;
            glowColorData[i * 3 + 1] = color.g;
            glowColorData[i * 3 + 2] = color.b;

            // ✅ FIX: Ensure the Enterprise and Astronaut start right-side up.
            if (config.name === 'Enterprise' || config.name === 'Astronaut' || config.name === 'Optimus') {
                flipData[i] = -1.0; // Force upright
            } else {
                // Randomly decide if other objects should be flipped
                flipData[i] = Math.random() > 0.5 ? 1.0 : -1.0;
            }

            // ✅ ADD: Set the effect type attribute. 1.0 for astronaut, 0.0 for others.
            if (config.name === 'Astronaut') {
                effectTypeData[i] = 1.0;
            } else if (config.name === 'Optimus') {
                effectTypeData[i] = 2.0;
            } else if (config.name === 'Predator') {
                effectTypeData[i] = 3.0;
            } else {
                effectTypeData[i] = 0.0;
            }

            // ✅ ADD: Assign a random value for the glitch effect.
            randomData[i] = Math.random();
        }

        instancedGeometry.setAttribute('aUvOffset', new THREE.InstancedBufferAttribute(uvOffsetData, 4));
        instancedGeometry.setAttribute('aGlowColor', new THREE.InstancedBufferAttribute(glowColorData, 3));
        // Add the new per-instance dissolve attribute
        instancedGeometry.setAttribute('aDissolveProgress', new THREE.InstancedBufferAttribute(dissolveData, 1));
        instancedGeometry.setAttribute('aEffectType', new THREE.InstancedBufferAttribute(effectTypeData, 1)); // ✅ ADD
        instancedGeometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randomData, 1)); // ✅ ADD
        instancedGeometry.setAttribute('aFlip', new THREE.InstancedBufferAttribute(flipData, 1));

        setPerlinTexture(perlinTexture);
        const material = createDissolveMaterial(atlasTexture);

        this.instancedMesh = new THREE.InstancedMesh(instancedGeometry, material, objectsToLoad.length);
        this.instancedMesh.renderOrder = 0;
		this.instancedMesh.layers.enable(0); // Render on base layer
		this.instancedMesh.layers.enable(1); // Also render on bloom layer for the dissolve glow

        // Set initial matrices
        for (let i = 0; i < this.objects.length; i++) {
            this.instancedMesh.setMatrixAt(i, this.objects[i].matrix);
        }

        this.scene.add(this.instancedMesh);
		// --- 3. Create Laser Mesh for Optimus ---
		const laserGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
		laserGeo.rotateX(Math.PI / 2); // Align with Z-axis
		const laserMat = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			blending: THREE.AdditiveBlending,
			transparent: true,
			opacity: 0,
			depthWrite: false,
		});
		this.laserMesh = new THREE.Mesh(laserGeo, laserMat);
		this.laserMesh.layers.enable(1); // BLOOM_LAYER
		this.laserMesh.visible = false;
		this.scene.add(this.laserMesh);

		// Signal that the instanced mesh is ready for animations.
		this.resolveReady();
    }

	/** ✅ NEW: Controls the brightness of all floating objects. */
	public setBrightness(brightness: number, duration: number, ease: string) {
		if (this.instancedMesh) {
			gsap.to((this.instancedMesh.material as THREE.ShaderMaterial).uniforms.u_brightness, { value: brightness, duration, ease });
		}
	}

    private async _createTextureAtlas(urls: string[]): Promise<{ atlasTexture: THREE.CanvasTexture, uvOffsets: { x: number, y: number, width: number, height: number, imageWidth: number, imageHeight: number }[] }> {
        const loader = new THREE.ImageLoader(); // ✅ FIX: Use the imported ImageLoader
        const images = await Promise.all(urls.map(url => loader.loadAsync(url)));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context from canvas');


        // Simple packing algorithm: find max width and sum of heights
        const maxWidth = Math.max(...images.map(img => img.width));
        const totalHeight = images.reduce((sum, img) => sum + img.height, 0);

        canvas.width = maxWidth;
        canvas.height = totalHeight;

        // ✅ FIX: Ensure the canvas starts fully transparent, not black.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const uvOffsets: { x: number, y: number, width: number, height: number, imageWidth: number, imageHeight: number }[] = [];
        let currentY = 0;

        images.forEach(img => {
            ctx.drawImage(img, 0, currentY);
            uvOffsets.push({
                x: 0 / maxWidth,
                y: currentY / totalHeight,
                width: img.width / maxWidth,
                height: img.height / totalHeight,
                imageWidth: img.width, // Store original dimensions
                imageHeight: img.height
            });
            currentY += img.height;
        });

        const atlasTexture = new THREE.CanvasTexture(canvas);
        atlasTexture.colorSpace = THREE.SRGBColorSpace;
        atlasTexture.flipY = false; // Important for g;
        atlasTexture.generateMipmaps = false;
        atlasTexture.minFilter = THREE.LinearFilter; // Linear is fine for minification.
        atlasTexture.magFilter = THREE.NearestFilter; // ✅ CRITICAL: Prevents color bleeding on magnification.
        atlasTexture.premultiplyAlpha = false; // Correct for straight alpha workflow.

        return { atlasTexture, uvOffsets };
    }

    /**
     * Begins the intro animation for all objects EXCEPT the astronaut. This version
     * is faster and calls a callback when the sequence is complete.
     */
    public animateInOtherObjects(onComplete?: () => void) {
		const masterTimeline = gsap.timeline({ onComplete });
		const otherObjects = this.objects.filter(obj => obj.name !== 'Astronaut');
		const shuffledOthers = gsap.utils.shuffle(otherObjects);

		// Use a faster animation for the "other" objects so they are all visible
		// before the main astronaut reveal.
		shuffledOthers.forEach((obj, index) => {
			const subTimeline = this.startIntroAnimation(obj, index, 1.5); // ✅ TWEAK: Shortened duration to compensate for more objects
			if (subTimeline) {
				masterTimeline.add(subTimeline, `>${0.05 + Math.random() * 0.03}`); // Tighter stagger
			}
		});
    }

	/**
	 * Begins the intro animation specifically for the astronaut, to be synced with other events.
	 * This is called AT the main warp peak, along with the nebula.
	 */
	public animateInAstronaut() {
		const astronaut = this.objects.find(obj => obj.name === 'Astronaut');
		if (astronaut) {
			const astronautTimeline = this.startIntroAnimation(astronaut, 99); // Use a high index for a unique sound cue if needed
			if (astronautTimeline) {
				astronautTimeline.play(0);
			}
		}
    }

	private fireLaser(optimusObject: FloatingObject) {
		if (!this.laserMesh) return;
	
		// The laser should fire "forward" from Optimus, which is away from the camera (negative Z).
		const startPosition = optimusObject.position.clone();
		// Offset to roughly where his gun is. This is an approximation.
		startPosition.x += optimusObject.scale.x * -0.2;
		startPosition.y += optimusObject.scale.y * 0.5; // ✅ TWEAK: Further increased Y offset to align with his gun.
		startPosition.z -= optimusObject.scale.z / 2;
	
		this.laserMesh.position.copy(startPosition);
		this.laserMesh.scale.set(1, 1, 0.01); // Start as a dot

		// ✅ NEW: Add rotation to aim the laser up and to the left.
		const aimAngleX = 1.1;  // ✅ FIX: Negative X rotation to aim UP.
		const aimAngleY = 0.2;  // Leftward angle
		this.laserMesh.rotation.set(aimAngleX, aimAngleY, 0);

		this.laserMesh.visible = true;
		(this.laserMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
	
		const laserLength = 40; // How far the laser travels
		const laserSpeed = 0.25; // How fast it travels
	
		// ✅ NEW: Calculate the direction vector based on the laser's new rotation
		const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.laserMesh.quaternion);
	
		// Animate the laser
		gsap.timeline({
			onComplete: () => {
				if (this.laserMesh) {
					this.laserMesh.visible = false;
				}
			}
		})
		.to(this.laserMesh.scale, { z: laserLength, duration: laserSpeed, ease: 'linear' })
		// ✅ FIX: Animate position along the new direction vector to match the aim.
		.to(this.laserMesh.position, {
			x: `+=${direction.x * (laserLength / 2)}`,
			y: `+=${direction.y * (laserLength / 2)}`,
			z: `+=${direction.z * (laserLength / 2)}`,
			duration: laserSpeed,
			ease: 'linear'
		}, '<')
		.to(this.laserMesh.material, { opacity: 0, duration: 0.1 }, '>-0.1');
	
		// To add sound, you would uncomment this and ensure 'laser_sfx' is loaded in AudioManager
		// this.audioManager?.triggerSoundEffect('laser_sfx', 0.5, true);
	}

   private startIntroAnimation(obj: FloatingObject & { name: string }, index: number, duration: number = 1.8): gsap.core.Timeline | null {
    if (!this.instancedMesh) return null;    

    const tl = gsap.timeline({
        onComplete: () => {
            obj.hasFadedIn = true; // Mark as complete for physics updates
            obj.justFadedIn = true; // ✅ ADD: Flag that it *just* completed on this frame.
            // ✅ FIX: Smoothly animate the parallax influence from 0 to 1 after the main animation.
            // This prevents the object from "jumping" due to the mouse position.
            gsap.to(obj, {
                parallaxInfluence: 1.0,
                duration: 1.0, // A 1-second blend-in for the parallax effect
                ease: 'power2.out'
            });
        }
    });

    tl.call(() => this._triggerTeleportSound(obj.name, index), [], 0);

    const scaleProxy = { value: 0.01 };

    tl.to(scaleProxy, {
        value: 1.0,
        duration: duration,
        ease: 'back.out(2)',
        onUpdate: () => {
            if (!this.instancedMesh || !obj.fullScale) return;

            // Animate the scale property directly based on the proxy's value.
            const currentScale = obj.fullScale.clone().multiplyScalar(scaleProxy.value);
            obj.scale.copy(currentScale);

            // Recompose the matrix using the object's internal state, which is now the single source of truth.
            obj.matrix.compose(obj.position, obj.quaternion, currentScale);
            this.instancedMesh.setMatrixAt(this.objects.indexOf(obj), obj.matrix);
			this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }, 0);

    // Dissolve
    const dissolveProxy = { value: 0.0 };
    tl.to(dissolveProxy, {
        value: 1.0,
        duration: duration * 0.66, // Keep dissolve proportional to scale animation
        ease: 'power2.inOut',
        onUpdate: () => {
            const attr = this.instancedMesh!.geometry.getAttribute('aDissolveProgress') as THREE.InstancedBufferAttribute;
            attr.setX(this.objects.indexOf(obj), dissolveProxy.value);
            attr.needsUpdate = true;
        }
    }, 0);

	return tl;
   }

    private _triggerTeleportSound(objectName: string, index: number) {
		console.log(`[DEBUG] Triggering teleport sound for ${objectName} at index ${index}`);
        // The third parameter `true` tells the AudioManager to allow this sound to overlap with itself,
        // ensuring we hear a distinct sound for each teleporting object.
        this.audioManager?.triggerSoundEffect('teleport_sfx', 0.15, true);
    }

	/**
	 * Handles incoming audio cues to trigger object-specific animations.
	 * @param action The action string from the audio cue.
	 */
	public handleAudioCue(action: string) {
		if (action === 'OBJECTS_JITTER') {
			this.objects.forEach(obj => {
				// A quick, sharp "jitter" or "pop" effect on the objects
				gsap.to(obj.scale, {
					x: `*=${1.1}`, // Scale up by 10%
					y: `*=${1.1}`,
					duration: 0.1,
					ease: 'power2.out',
					yoyo: true,
					repeat: 1,
					overwrite: true // ✅ Add to prevent overlapping tweens
				});
			});
		}
	}

	public update(elapsedTime: number, frameCounter: number, mouse: THREE.Vector2): void {
		if (!this.instancedMesh || !this.camera) return;

		(this.instancedMesh.material as THREE.ShaderMaterial).uniforms.u_time.value = elapsedTime;

		// ✅ ADD: Smoothly interpolate mouse position for parallax effect
		this.mouseCurrent.lerp(mouse, 0.1);

		// ✅ NEW: Optimus Prime laser firing logic
		const optimus = this.objects.find(obj => obj.name === 'Optimus');
		if (optimus && optimus.hasFadedIn && this.laserMesh) {
			if (elapsedTime - this.optimusLastLaserTime > this.optimusLaserCooldown) {
				this.fireLaser(optimus);
				this.optimusLastLaserTime = elapsedTime;
				this.optimusLaserCooldown = 6.0 + Math.random(); // Next shot in 6-7 seconds
			}
		}

		// ✅ OPTIMIZATION: Add a dirty flag to only update the matrix buffer when needed.
        let needsMatrixUpdate = false;

        this.objects.forEach((obj, i) => {
            // Let GSAP control until the intro is fully complete.
            if (!obj.hasFadedIn) {
                // The GSAP timeline will call `setMatrixAt` directly. We just need to flag that an update is needed.
                needsMatrixUpdate = true;
                return;
            }

            // ✅ FIX: On the very first frame after fading in, skip the physics update.
            // This prevents the "jump" by allowing one frame for the state to sync.
            if (obj.justFadedIn) {
                obj.justFadedIn = false; // Clear the flag for the next frame.
                return;
            }

            // --- CPU LOD Optimization ---
            // TWEAK: Use a simpler and faster z-depth check for LOD.
            const distance = this.camera.position.distanceTo(obj.position);
            if (distance > LOD_DISTANCE_THRESHOLD && frameCounter % LOD_FRAME_SKIP !== 0) return;

			// --- Parallax Calculation ---
			let parallaxOffset = new THREE.Vector3();
			// ✅ FIX: Restore the if condition to separate astronaut logic.
			if (this.objects[i]?.name !== 'Astronaut') {
				// The amount of parallax is based on the object's depth (z-position).
				// Closer objects (smaller negative z) will move more.
				const parallaxFactor = (Math.abs(obj.position.z) / 20.0) * 0.5; // Tweak the multipliers for desired effect
				parallaxOffset.x = -this.mouseCurrent.x * parallaxFactor * obj.parallaxInfluence;
				parallaxOffset.y = -this.mouseCurrent.y * parallaxFactor * obj.parallaxInfluence;
			} else {
				// ✅ ADD: Give the astronaut a gentle "wobble" to make it feel less static.
				const wobbleTime = elapsedTime * 0.3; // Slower wobble speed
				parallaxOffset.x += Math.sin(wobbleTime * 1.2) * 0.03;
				parallaxOffset.y += Math.cos(wobbleTime * 0.8) * 0.03;
			}

			// --- Full Physics Update (for close objects or on an LOD update frame) ---
            obj.position.add(obj.velocity);

            const noiseTime = elapsedTime * 0.1 + obj.bobOffset;
            obj.position.y += (Math.sin(noiseTime * 2.1) + Math.cos(noiseTime * 3.4)) * 0.0005;

            const rotation = new THREE.Euler().setFromQuaternion(obj.quaternion, 'XYZ');
            if (obj.name !== 'Optimus') {
                rotation.z += obj.spinSpeed;
            }
            obj.quaternion.setFromEuler(rotation);

            // ===============================================
            //  NEW: Gentle Collision Response (Circle-to-Circle)
            // ===============================================
            for (let j = i + 1; j < this.objects.length; j++) {
                const other = this.objects[j];
                if (!other.hasFadedIn) continue;

                const dx = other.position.x - obj.position.x;
                const dy = other.position.y - obj.position.y;
                const distSq = dx * dx + dy * dy;

                const r1 = Math.max(obj.scale.x, obj.scale.y) * 0.5;
                const r2 = Math.max(other.scale.x, other.scale.y) * 0.5;
                const minDist = r1 + r2;

                if (distSq < minDist * minDist && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const overlap = minDist - dist;
                    const correction = overlap * 0.5;
                    obj.position.x -= nx * correction;
                    obj.position.y -= ny * correction;
                    other.position.x += nx * correction;
                    other.position.y += ny * correction;

                    const vx = obj.velocity.x - other.velocity.x;
                    const vy = obj.velocity.y - other.velocity.y;
                    const impulse = (vx * nx + vy * ny) * 0.6;

                    if (impulse > 0) {
                        obj.velocity.x -= impulse * nx;
                        obj.velocity.y -= impulse * ny;
                        other.velocity.x += impulse * nx;
                        other.velocity.y += impulse * ny;
                    }
                }
            }

            // --- Boundary Bouncing (Full Screen for ALL objects) ---
            const bounds = getBoundsAtDepth(this.camera, obj.position.z);
            const halfWidth = obj.scale.x / 2;
            const halfHeight = obj.scale.y / 2;

            if (obj.position.x + halfWidth > bounds.x) {
                obj.velocity.x = -Math.abs(obj.velocity.x);
            } else if (obj.position.x - halfWidth < -bounds.x) {
                obj.velocity.x = Math.abs(obj.velocity.x);
            }
            if (obj.position.y + halfHeight > bounds.y) {
                obj.velocity.y = -Math.abs(obj.velocity.y);
            } else if (obj.position.y - halfHeight < -bounds.y) {
                obj.velocity.y = Math.abs(obj.velocity.y);
            }

			obj.matrix.compose(obj.position.clone().add(parallaxOffset), obj.quaternion, obj.scale);
            this.instancedMesh.setMatrixAt(i, obj.matrix);
            needsMatrixUpdate = true;
        });

        // ✅ OPTIMIZATION: Only flag for a GPU update if something actually changed.
        if (needsMatrixUpdate) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

	public dispose() {
		if (this.instancedMesh) {
			this.instancedMesh.removeFromParent();
			this.instancedMesh.geometry.dispose();
			(this.instancedMesh.material as THREE.Material).dispose();
		}

		// ✅ NEW: Dispose of the laser mesh
		if (this.laserMesh) {
			this.laserMesh.geometry.dispose();
			(this.laserMesh.material as THREE.Material).dispose();
			this.laserMesh.removeFromParent();
		}
	}

    public setVisible(visible: boolean) {
        if (this.instancedMesh) {
            this.instancedMesh.visible = visible;
        }
    }

	/**
	 * ✅ NEW: Efficiently handles window resizing.
	 * Updates the camera reference used for calculating viewport bounds.
	 */
	public resize(camera: THREE.PerspectiveCamera) {
		this.camera = camera;
	}

	public triggerGlitchPulse(): void {
		if (
			!this.instancedMesh ||
			!(this.instancedMesh.material as THREE.ShaderMaterial).uniforms.u_glitchIntensity
		)
			return;

		gsap.to((this.instancedMesh.material as THREE.ShaderMaterial).uniforms.u_glitchIntensity, {
			value: 1.0,
			duration: 0.5,
			ease: 'power2.inOut',
			yoyo: true,
			repeat: 1
		});
	}
}
