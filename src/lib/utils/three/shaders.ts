// src/utils/three/shaders.ts
import * as THREE from 'three';

export const FloatingObjectShader = {
    uniforms: {
        t_map: { value: null },
        t_noise: { value: null },
        u_time: { value: 0.0 },
        u_introTime: { value: 0.0 },
        u_bounds: { value: new THREE.Vector2(10, 10) },
        u_screenSize: { value: new THREE.Vector2() }
    },
    vertexShader: `
        attribute vec3 aStartPosition;
        attribute vec3 aVelocity;
        attribute vec3 aTargetScale;
        attribute vec3 aRandom;
        attribute float aDissolveStart;
        attribute vec4 aUvOffset;
        attribute vec3 aGlowColor;
        attribute float aDepth;

        uniform float u_time;
        uniform float u_introTime;
        uniform vec2 u_screenSize;

        varying vec2 vUv;
        varying vec4 vUvOffset;
        varying vec3 vGlowColor;
        varying float vDissolveProgress;

        vec2 getBoundsAtDepth(float z) {
            float ndcZ = (z - cameraPosition.z) / -cameraPosition.z;
            return u_screenSize * (1.0 - abs(ndcZ));
        }

        void main() {
          vUvOffset = aUvOffset;
          vGlowColor = aGlowColor;

          vec3 pos = aStartPosition + aVelocity * u_time;

          float bob = u_time * 0.1 + aRandom.x;
          pos.y += (sin(bob * 2.1) + cos(bob * 3.4)) * 0.05;

          float spin = u_time * aRandom.y;
          mat2 rot = mat2(cos(spin), -sin(spin), sin(spin), cos(spin));
          pos.xy = rot * pos.xy;

          vec2 bounds = u_bounds;
          pos.x = mod(pos.x + bounds.x, bounds.x * 2.0) - bounds.x;
          pos.y = mod(pos.y + bounds.y, bounds.y * 2.0) - bounds.y;

            float t = clamp((u_introTime - aDissolveStart) / 4.0, 0.0, 1.0);
            t = pow(t, 0.3);
            vec3 currentScale = mix(vec3(0.01, 0.01, 1.0), aTargetScale, t);
            vDissolveProgress = t;

            vec4 mvPos = viewMatrix * vec4(pos, 1.0);
            vec4 projPos = projectionMatrix * mvPos;
            vec2 scale2D = currentScale.xy / projPos.w;
            gl_Position = projPos;
            gl_Position.xy += (uv - 0.5) * scale2D * 2.0;
        }
    `,
    fragmentShader: `
        uniform sampler2D t_map;
        uniform sampler2D t_noise;
        uniform float u_time;
        varying vec2 vUv;
        varying vec4 vUvOffset;
        varying vec3 vGlowColor;
        varying float vDissolveProgress;

        void main() {
            vec2 atlasUv = vUvOffset.xy + (vUv * vUvOffset.zw);
            vec4 texel = texture2D(t_map, atlasUv);
            if (texel.a < 0.1) discard;
            
            vec2 noiseUv = vUv * 4.0 + u_time * 0.05;
            float noise = texture2D(t_noise, noiseUv).r;
            float threshold = noise * 0.2 + vUv.y * 0.8;
            
            if (threshold < vDissolveProgress) {
                float edge = vDissolveProgress - threshold;
                if (edge < 0.05) {
                    float mixAmt = smoothstep(0.0, 0.05, edge);
                    vec3 col = mix(vGlowColor * 2.5, texel.rgb, mixAmt);
                    gl_FragColor = vec4(col, texel.a);
                } else {
                    gl_FragColor = vec4(texel.rgb, texel.a);
                }
            } else {
                discard;
            }
        }
    `
};

export const TransporterDissolveShader = {
    uniforms: {
        t_map: { value: null },
		u_brightness: { value: 1.0 },
		u_opacity: { value: 0.0 },
        t_noise: { value: null },
        u_glitchIntensity: { value: 0.0 },
        u_glitchColor: { value: new THREE.Color(0x00ffff) },
        u_glow_color: { value: new THREE.Color(0x00ffff) },
        u_time: { value: 0.0 },
    },
    vertexShader: `
        attribute vec4 aUvOffset;
        attribute vec3 aGlowColor;
        attribute float aDissolveProgress;
        attribute float aRandom;
        attribute float aEffectType;
        attribute float aFlip;
        varying vec2 vUv;
        varying vec4 vUvOffset;
        varying vec3 vGlowColor;
        varying float vDissolveProgress;
        varying float vRandom;
        varying float vEffectType;
        void main() {
            vUv = vec2(uv.x, 0.5 + (uv.y - 0.5) * aFlip);
            vUvOffset = aUvOffset;
            vGlowColor = aGlowColor;
            vDissolveProgress = aDissolveProgress;
            vEffectType = aEffectType;
            vRandom = aRandom;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D t_map;
        uniform sampler2D t_noise;
        uniform float u_brightness;
        uniform float u_opacity;
        uniform float u_time;
        uniform float u_glitchIntensity;
        uniform vec3 u_glitchColor;
        varying vec2 vUv;
        varying float vDissolveProgress;
        varying float vRandom;
        varying vec3 vGlowColor;
        varying float vEffectType;
        varying vec4 vUvOffset;

        void main() {
            vec2 finalUv = vUv;

            // --- Astronaut Heat Haze ---
            if (vEffectType > 0.5 && vEffectType < 1.5) {
                vec2 noiseUv1 = vUv * 2.0 + vec2(u_time * 0.1, u_time * 0.15);
                vec2 noiseUv2 = vUv * 2.0 + vec2(u_time * -0.12, u_time * -0.08);
                // Tweak: Reduced the multiplier from 0.01 to 0.004 to make the heat haze less "liquidy" and more subtle.
                float distortion = (texture2D(t_noise, noiseUv1).r - 0.5) * 0.008 + (texture2D(t_noise, noiseUv2).g - 0.5) * 0.004;
                finalUv += distortion;
            }

            // --- Glitch Effect ---
            float glitchSpeed = 0.5 + vRandom * 1.5;
            float glitchPower = 10.0 + vRandom * 20.0;
            float glitchTime = u_time + vRandom * 6.28;
            float glitchStrength = pow(max(0.0, sin(glitchTime * glitchSpeed)), glitchPower);

            if (vEffectType > 0.5 && vEffectType < 1.5) { // Astronaut
                glitchStrength *= smoothstep(0.9, 1.0, sin(u_time * 0.7));
            } else if (vEffectType > 1.5 && vEffectType < 2.5) { // Optimus
                float optimusGlitchTime = u_time * 2.0 + vRandom * 3.14;
                float optimusGlitch = smoothstep(0.8, 1.0, sin(optimusGlitchTime)) * 0.5;
                glitchStrength += optimusGlitch;
            }

            glitchStrength += u_glitchIntensity;

            if (glitchStrength > 0.2) {
                float glitchLine = fract(vUv.y * 10.0 + u_time * 0.1);
                float displacement = (texture2D(t_noise, vec2(glitchLine, u_time * 0.05)).r - 0.5) * (0.2 + vRandom * 0.2) * glitchStrength * (0.8 + vRandom * 0.4);
                finalUv.x += displacement;
            }

            // --- Texture Sampling ---
            vec2 atlasUv = vUvOffset.xy + (finalUv * vUvOffset.zw);
            vec4 texel = texture2D(t_map, atlasUv);
            if (texel.a < 0.1) discard;

            // --- Materialization ---
            vec2 noiseUv = vUv * 4.0 + vec2(u_time * 0.05, u_time * 0.05);
            float noise_val = texture2D(t_noise, noiseUv).r;
            float materialization_threshold = noise_val * 0.2 + vUv.y * 0.8;
            
            if (materialization_threshold < vDissolveProgress) {
                float edge_factor = vDissolveProgress - materialization_threshold;
                
                vec3 final_color = texel.rgb;
                float final_alpha = texel.a * u_opacity;

                // --- Per-object effects ---
                if (vEffectType > 0.5 && vEffectType < 1.5) { // Astronaut
					final_color *= 1.25; // 25% brighter
                } else if (vEffectType > 2.5) { // Predator
					float cloakTime = u_time * 1.5 + vRandom * 10.0;
					float cloakNoise = texture2D(t_noise, vUv * 3.0 + cloakTime * 0.1).r;
					float cloakFactor = 0.6 + sin(cloakTime) * 0.5 + cloakNoise * 0.2; // Use a wider sin wave for a more dramatic fade
					final_alpha *= clamp(cloakFactor, 0.15, 1.0); // ✅ FIX: Lower the minimum alpha to make it almost invisible
                }

                // --- Materialization Glow ---
                if (edge_factor < 0.05) {
                    float glow_mix = smoothstep(0.0, 0.05, edge_factor); // 0 at edge, 1 inside
                    final_color = mix(vGlowColor * 2.5, final_color, glow_mix);
                }
                
                gl_FragColor = vec4(final_color * u_brightness, final_alpha);

            } else {
                discard;
            }
        }
    `
};

export const RadialBlurShader = {
	uniforms: {
		tDiffuse: { value: null },
		u_strength: { value: 0.0 },
		u_resolution: { value: new THREE.Vector2() },
		u_samples: { value: 32 }
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform float u_strength;
		uniform vec2 u_resolution;
		uniform int u_samples;
		varying vec2 vUv;

		void main() {
			vec2 center = vec2(0.5);
			vec2 dir = vUv - center;
			float dist = length(dir);
			vec4 col = vec4(0.0);

			int samples = int(clamp(float(u_samples) * u_strength * 2.0, 4.0, 32.0));

			for (int i = 0; i < 32; i++) {
				if (i >= samples) break;
				float t = float(i) / float(samples - 1);
				vec2 offset = dir * t * u_strength * 0.1;
				col += texture2D(tDiffuse, vUv - offset);
			}
			gl_FragColor = col / float(samples);
		}
	`
};

export const NebulaShader = {
	uniforms: {
		t_diffuse: { value: null },
		t_noise: { value: null },
		u_time: { value: 0.0 },
		u_opacity: { value: 0.0 },
		u_colorShift: { value: 0.5 },
		u_emissiveIntensity: { value: 0.0 },
		u_mouse: { value: new THREE.Vector2() }
	},
	vertexShader: `
		varying vec2 vUv;
		uniform vec2 u_mouse;
		void main() {
			vUv = uv;
			vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * mvPosition;
		}
	`,
	fragmentShader: `
		uniform sampler2D t_diffuse;
		uniform sampler2D t_noise;
		uniform float u_time;
		uniform float u_colorShift;
		uniform float u_opacity;
		uniform float u_emissiveIntensity;
		varying vec2 vUv;

		void main() {
			float dist = distance(vUv, vec2(0.5));
			if (dist > 0.5) discard;

			float edgeFade = smoothstep(0.5, 0.4, dist);

			vec2 noiseUv = vUv + u_time * 0.005;
			vec4 noiseSample = texture2D(t_noise, noiseUv);

			vec2 distortion = (noiseSample.rg - 0.5) * 0.03;

			vec4 texColor = texture2D(t_diffuse, vUv + distortion);

			vec2 toCenter = vec2(0.5) - vUv;
			float angle = atan(toCenter.y, toCenter.x);
			float distToCenter = length(toCenter) * 2.0;

			float rayNoise = texture2D(t_noise, vec2(angle * 2.0, u_time * 0.01)).r;

			float rays = rayNoise * rayNoise;
			rays *= rays;
			rays *= rays;
			rays *= 0.2;

			rays *= (1.0 - distToCenter) * (texColor.r + texColor.g + texColor.b);

			vec3 finalColor = texColor.rgb * u_emissiveIntensity;
			vec3 baseColor = finalColor;
			finalColor = mix(baseColor, baseColor * vec3(1.2, 0.8, 1.5), u_colorShift);

			finalColor += rays;
			float finalAlpha = texColor.a * u_opacity * edgeFade;

			if (finalAlpha < 0.01) discard;

			gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
		}
	`
};

export const ChromaticAberrationShader = {
    uniforms: {
        tDiffuse: { value: null },
        distortionAmount: { value: 1.5 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float distortionAmount;
        varying vec2 vUv;
        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 offset = vUv - center;
            float dist = length(offset);
            vec4 r = texture2D(tDiffuse, vUv - offset * dist * (distortionAmount / 1000.0));
            vec4 g = texture2D(tDiffuse, vUv);
            vec4 b = texture2D(tDiffuse, vUv + offset * dist * (distortionAmount / 1000.0));
            gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
        }
    `
};

export const BlurShader = {
    uniforms: {
        tDiffuse: { value: null },
        u_velocity: { value: 0 },
        u_opacity: { value: 1 },
        u_brightness: { value: 1.0 },
        resolution: { value: new THREE.Vector2() },
		u_time: { value: 0.0 },
		u_scanlineIntensity: { value: 0.15 },
		u_noiseIntensity: { value: 0.1 },
    },

    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float u_velocity;
        uniform float u_opacity;
        uniform float u_brightness;
        uniform vec2 resolution;
		uniform float u_time;
		uniform float u_scanlineIntensity;
		uniform float u_noiseIntensity;

        varying vec2 vUv;

		float random(vec2 st) {
			return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
		}

        void main() {
            vec2 uv = vUv;
            vec4 color = vec4(0.0);

            const int SAMPLES = 16;
            float strength = u_velocity * 0.008;

            for (int i = 0; i < SAMPLES; i++) {
                float t = (float(i) - float(SAMPLES) / 2.0) / float(SAMPLES);
                vec2 sampleUv = uv + vec2(t * strength, 0.0);
                color += texture2D(tDiffuse, sampleUv);
            }
            color /= float(SAMPLES);

			vec3 finalColor = color.rgb;
			float scanline = sin( uv.y * 500.0 ) * u_scanlineIntensity * 0.8;
			float noise = ( random( uv + u_time * 0.01 ) - 0.5 ) * u_noiseIntensity * 0.5;
			finalColor += scanline + noise;
            gl_FragColor = vec4( finalColor * u_brightness, u_opacity );
        }
    `,
};

export const StarfieldShader = {
	uniforms: {
		u_time: { value: 0.0 },
		u_warp: { value: 0.0 },
		u_masterWarp: { value: 0.0 },
		u_temp: { value: 0.0 },
		tStarCross: { value: null },
		tStarGlow:  { value: null },
		u_starBrightness: { value: 1.0 },
		u_twinkleSpeed: { value: 1.2 },
		u_warpGlow: { value: 1.0 },
		u_colorShift: { value: 0.5 },
		u_pixelRatio:     { value: 1.0 },
		u_colorVariety:   { value: 0.8 },
		u_mouse:          { value: new THREE.Vector2() }
	},
	vertexShader: `
		uniform float u_time;
		uniform float u_warp;
		attribute float aRandom;
		attribute float aSpriteType;
		attribute float aLayerSpeed; varying float vAlpha;
		varying float vLayerSpeed;
		varying float vRandom;
		uniform float u_pixelRatio;
		uniform vec2 u_mouse;
		varying float vSpriteType;

		void main() {
			vec4 mvPosition = modelMatrix * vec4(position, 1.0);

			float travel = u_time * 0.5 * (aLayerSpeed * aLayerSpeed * 2.0) * (aRandom + 0.1);
			float warp   = u_warp * (aRandom + 0.1) * 50.0;
			mvPosition.z += travel + warp;
			mvPosition.z = mod(mvPosition.z, 2000.0) - 1000.0;

			mvPosition.xy -= u_mouse * 20.0 * aLayerSpeed;

			vec4 viewPos = viewMatrix * mvPosition;
			gl_Position  = projectionMatrix * viewPos;

			float baseSize = 14000.0 + aLayerSpeed * 10000.0;
			float size = baseSize * (aRandom * aRandom * 0.8 + 0.2) / -viewPos.z;
			size *= (1.0 + pow(u_warp, 2.0) * 12.0);
			gl_PointSize = min(size * u_pixelRatio, 80.0);


			vRandom      = aRandom;
			vSpriteType  = aSpriteType;
			vLayerSpeed  = aLayerSpeed;
		}
	`,
	fragmentShader: `
		uniform sampler2D tStarCross;
		uniform sampler2D tStarGlow;
		uniform float u_warp;
		uniform float u_temp;
		uniform float u_time;
		uniform float u_starBrightness;
		uniform float u_twinkleSpeed;
		uniform float u_warpGlow;
		uniform float u_colorShift;
		uniform vec2 u_mouse;
		uniform float u_colorVariety;
		uniform float u_masterWarp;

		varying float vRandom;
		varying float vLayerSpeed;
		varying float vSpriteType;

		float pow20(float x) {
			x = max(0.0, x);
			float x2 = x * x;
			float x4 = x2 * x2;
			float x8 = x4 * x4;
			float x16 = x8 * x8;
			return x16 * x4;
		}

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
		}

		void main() {
			vec4 tex = (vSpriteType < 0.5)
				? texture2D(tStarCross, gl_PointCoord)
				: texture2D(tStarGlow,  gl_PointCoord);

			float d = distance(gl_PointCoord, vec2(0.5));
			float falloff = pow(1.0 - d, 4.0);



			float twinkle = 1.0;
			twinkle = sin(u_time * u_twinkleSpeed * (1.0 + vRandom * 2.0) + vRandom * 6.28) * 0.5 + 0.5;
			twinkle = 0.6 + twinkle * 0.4;
			float warpGlow = 1.0 + u_warp * 0.5;

			float alpha = tex.a * falloff * warpGlow;
			float edge = 1.0 - smoothstep(0.35, 0.5, d);
			alpha *= edge;
			if (alpha < 0.02) discard;

			vec3 cool = vec3(0.65, 0.75, 1.0);
			vec3 warm = vec3(1.0, 0.85, 0.6);
			vec3 tint = mix(cool, warm, u_colorShift);

			vec3 randTint = mix(vec3(0.9,0.9,1.0), vec3(1.0,1.0,0.9), vRandom);
			vec3 starColor = mix(tint, randTint, 0.25);

			if (vRandom > 0.95) {
				vec3 vibrantColor = (vRandom > 0.975)
					? vec3(1.0, 0.7, 0.4)
					: vec3(0.6, 0.8, 1.0);
				starColor = mix(starColor, vibrantColor, u_colorVariety);
			}

			vec3 finalRGB = tex.rgb * starColor * u_starBrightness * falloff * twinkle * 3.2;
			finalRGB *= u_warpGlow;

			float glint = 0.0;
			if (vRandom > 0.992) {
				float glintSignal = sin(u_time * 0.7 + vRandom * 62.83);
				glint = pow20(glintSignal);
			}
			finalRGB += vec3(1.0, 1.0, 1.2) * glint * 2.0;

			gl_FragColor = vec4(finalRGB, alpha);
		}
	`
};