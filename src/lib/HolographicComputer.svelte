<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { gsap } from 'gsap';
    import { browser } from '$app/environment'; // CRITICAL IMPORT

	// Define types for the dynamically imported modules
    type SplitTypeModule = typeof import('split-type');
    type PizzicatoModule = typeof import('pizzicato');

	// Local variables to hold the loaded module constructors
    let SplitType: SplitTypeModule;
    let Pizzicato: PizzicatoModule;

	// Global reference for audio library (Pizzicato)
	let windowPz: any = null; // Use any since we are assigning to window

	export let isOpen = false;

	// Props from +layout.svelte
	export let title = 'Data Stream';
	export let style = 'Unknown Style';
	export let description = 'System awaiting data input...';

	const dispatch = createEventDispatcher();
	let isClosing = false;
	let linesContainer: HTMLElement; // Bind the container here

	// --- LOGIC EXTRACTED FROM YOUR ORIGINAL FILE ---

	// Simplified Line class for text animation using SplitType
	class Line {
		// ... (Original Line class implementation remains the same, but uses local SplitType) ...
        // Ensure constructor uses the local SplitType variable: new SplitType(this.copy_elm, { types: 'chars' });
        
        // --- NOTE: Only the ANIME function is provided here for brevity ---
        animate() {
            let tl = gsap
                .timeline({ paused: false, delay: this.delay })
                .set(this.line_elm, { display: "grid" })
                .set(this.split.chars, { visibility: "visible" })
                // ... rest of timeline logic using local SplitType ...
            
            // ... (rest of animate function) ...
            return tl;
        }
	}

	// Simplified Mother for single line
	class SimpleMother {
        // ... (Original SimpleMother class implementation) ...
        
        load() {
            // Use the locally available windowPz (Pizzicato)
            if (windowPz && windowPz.Sound) {
                return new Promise(resolve => {
                    this.key_sound = new windowPz.Sound(
                        {
                            source: "file",
                            options: { path: this.type_src, loop: true, volume: 0.1 }
                        },
                        resolve
                    );
                });
            } else {
                this.key_sound = null;
                return Promise.resolve();
            }
        }
        
        // ... (rest of class) ...
	}

	function handleClose() {
		if (isClosing) return;
		isClosing = true;
	}

	function onAnimationComplete() {
		if (isClosing) {
			isClosing = false;
			dispatch('close');
		}
	}
	
	function initTextAnimation() {
		if (!browser) return; // Should not happen, but safe guard

        // Check if libraries are loaded
		if (!gsap || !SplitType || !Pizzicato) {
			console.error("Libraries not fully loaded.");
			return;
		}

		// Initialize with "HELLO WORLD!"
		let simpleMother = new SimpleMother({
            // Ensure SimpleMother constructor logic is passed here
            lines_container: linesContainer,
			cmd_seq: [
				{ type: "line", copy: "SYSTEM READY: ACCESS GRANTED", has_underline: true }
			]
		});
		console.log("Text animation initialized!");
	}

	onMount(async () => {
        // --- 1. Dynamic Imports (Only runs on client) ---
        if (browser) {
            console.log("Loading client-side libraries...");
            
            const [splitTypeModule, pizzicatoModule] = await Promise.all([
                import('split-type'),
                import('pizzicato')
            ]);
            
            SplitType = splitTypeModule.default;
            Pizzicato = pizzicatoModule.default;
            
            // Expose globally only after successful import
            (window as any).Pz = Pizzicato;
            windowPz = Pizzicato; // Store reference locally
            
            // --- 2. Initialize Animation ---
            if (isOpen) {
                initTextAnimation();
            }
        }
	});
	
	// --- Reactive block to re-run initialization if modal opens later ---
	$: if (isOpen && browser && SplitType && linesContainer) {
        // Check if libraries are ready and linesContainer is bound
        initTextAnimation();
	}
</script>

{#if isOpen}
	<div class="hologram-container" class:closing={isClosing} on:click={handleClose} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
		<div class="hologram-content" on:click|stopPropagation on:animationend={onAnimationComplete}>
			<button class="close-button" on:click={handleClose}>&times;</button>
			
			<!-- Re-added for text animation -->
			<div id="mother_container">
				<div id="lines_container"></div>
			</div>
			
			<div class="grid-overlay"></div>
			<div class="scanlines"></div>
			<div class="static-overlay"></div>
			<div class="block-glitch">
				<div></div><div></div><div></div><div></div><div></div>
			</div>
			<div class="zigzag-distortion"></div>
			<div class="melt-glitch"></div>
			<div class="particle-sparks"></div>
			<div class="corner-bracket top-left"></div>
			<div class="corner-bracket top-right"></div>
			<div class="corner-bracket bottom-left"></div>
			<div class="corner-bracket bottom-right"></div>
		</div>
		<div class="projector-beam"></div>
	</div>
{/if}
<style>
	/* --- ORIGINAL HOLOGRAM STYLES (Cleaned up) --- */
	:root {
		--holo-primary-rgb: 50, 255, 50;
		--holo-glitch-1: rgba(150, 255, 50, 0.7);
		--holo-glitch-2: rgba(50, 255, 150, 0.7);
		--holo-melt: rgba(50, 255, 50, 0.2);
	}

	.hologram-container {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(10, 20, 40, 0.5); backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px); z-index: 2000;
		display: flex; justify-content: center; align-items: center;
		animation: fade-in 0.5s ease-out; cursor: pointer; overflow: hidden;
		font-family: 'Share Tech Mono', monospace;
	}

	.hologram-content {
		position: relative; width: 80vw; max-width: 1200px; aspect-ratio: 16 / 9;
		transform: perspective(1500px) rotateX(15deg);
		border: 2px solid rgba(var(--holo-primary-rgb), 0.3);
		background: radial-gradient(ellipse at center, rgba(0, 50, 30, 0.2) 0%, transparent 70%);
		box-shadow: 0 0 15px rgba(var(--holo-primary-rgb), 0.2), 0 0 30px rgba(var(--holo-primary-rgb), 0.2),
			inset 0 0 10px rgba(var(--holo-primary-rgb), 0.2);
		cursor: default;
		animation: power-on-effect 0.7s ease-out, projector-wobble 15s 0.7s infinite ease-in-out;
	}

	.closing .hologram-container { animation: fade-out 0.5s ease-in forwards; }
	.closing .hologram-content { animation: shutdown-effect 0.7s ease-out forwards; }
	.closing .corner-bracket, .closing .projector-beam, .closing .close-button {
		animation: none; opacity: 0; transition: opacity 0.2s ease;
	}

	.close-button {
		position: absolute; top: -45px; right: -15px; width: 35px; height: 35px;
		background: transparent; border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 50%; color: white; font-size: 24px;
		font-family: monospace; line-height: 31px; text-align: center;
		cursor: pointer; transition: all 0.2s ease; z-index: 20;
		animation: flash-button 1.5s infinite steps(1, end);
	}

	.close-button:hover {
		background: rgba(var(--holo-primary-rgb), 0.2);
		border-color: rgba(var(--holo-primary-rgb), 1);
		transform: scale(1.1) rotate(90deg);
		animation: none;
	}

	.scanlines, .static-overlay, .block-glitch, .zigzag-distortion, .melt-glitch, .particle-sparks, .grid-overlay {
		position: absolute; top: 0; left: 0;
		width: 100%; height: 100%; pointer-events: none;
	}

	.scanlines {
		background: linear-gradient( to bottom, rgba(var(--holo-primary-rgb), 0.1) 0%, rgba(var(--holo-primary-rgb), 0.1) 50%, transparent 50.1% );
		background-size: 100% 4px; animation: scan 0.5s linear infinite; z-index: 2;
	}

	.grid-overlay {
		background-image:
			linear-gradient(to right, rgba(var(--holo-primary-rgb), 0.15) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(var(--holo-primary-rgb), 0.15) 1px, transparent 1px);
		background-size: 30px 30px; animation: grid-pan 5s linear infinite; opacity: 0.4; z-index: 1;
	}

	.static-overlay {
		/* FIXED: Removed quotes around data URL to prevent Vite treating it as relative path */
		background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiGAAAARVBMVEUAAAC7u7uqqqrExMSbm5uZmZmjo6OysrKUlpSkpKSgoKCHh4eAgIB/f395eXl0dHRtbW1paWlpaWlVVVVRUVFNTU1OTk5ISEhJSUlK8uN9AAAAXElEQVR42tXWWQ6AIAwE0F2B+9/2P6w00Y2eGnKzT+GkY80I4AIAT09BvCgYIIA/FQjwc8ID/Cn4gU8Kn/BH0A//C+YRFIT+4T/BEii/+E/gCbqfxGcwC4U/jA/4L8g/gTv4Q/gC3f5u8hdgr5C/BA4g4y+QfwQ+4w8g/xES/gES/kECPpB/BJ5fAEg/gOMA/gAfgL/AEXwB+SX8C/gh/Av4IX8I/gV/CAhg588C+Cv4C/gI/gB/Av4A/gL+BH8E/gJ/AP8B/gD/Ab8B/wG/Af8B3wG/Ab8BvwG3AbcAtyu/A2g1gAAAABJRU5ErkJggg==);
		animation: static-flicker 0.15s steps(2, end) infinite;
		opacity: 0; z-index: 3;
	}

	.block-glitch div {
		position: absolute; width: 100%; height: 5%;
		background: var(--holo-glitch-1); opacity: 0.2;
		animation: block-glitch-anim 3s infinite alternate;
	}

	.block-glitch div:nth-child(2) { animation-delay: -1.5s; background: var(--holo-glitch-2); }
	.block-glitch div:nth-child(3) { animation-delay: -0.8s; }
	.block-glitch div:nth-child(4) { animation-delay: -2.2s; background: var(--holo-glitch-2); }
	.block-glitch div:nth-child(5) { animation-delay: -2.9s; }

	.zigzag-distortion {
		background: linear-gradient(135deg, rgba(var(--holo-primary-rgb), 1) 25%, transparent 25%) -50px 0,
			linear-gradient(225deg, rgba(var(--holo-primary-rgb), 1) 25%, transparent 25%) -50px 0,
			linear-gradient(315deg, rgba(var(--holo-primary-rgb), 1) 25%, transparent 25%),
			linear-gradient(45deg, rgba(var(--holo-primary-rgb), 1) 25%, transparent 25%);
		background-size: 20px 20px; background-repeat: repeat-x;
		height: 3px; opacity: 0; animation: zigzag-scan 4s infinite linear;
	}

	.melt-glitch {
		background: linear-gradient(to bottom, transparent 0%, var(--holo-melt) 50%, transparent 100%);
		opacity: 0.3; animation: melt-anim 5s infinite ease-in-out; mix-blend-mode: overlay;
	}

	.particle-sparks {
		background: radial-gradient(circle, rgba(255,255,255,0.5) 1%, transparent 2%);
		background-size: 10px 10px; animation: spark-flicker 0.5s infinite steps(1); opacity: 0.1;
	}

	.projector-beam {
		position: absolute; bottom: 0; left: 50%; width: 200%; height: 200%;
		background: linear-gradient( to top, rgba(var(--holo-primary-rgb), 0.2) 0%, transparent 50% );
		transform-origin: bottom center;
		transform: translateX(-50%) perspective(1000px) rotateX(60deg);
		pointer-events: none;
	}

	.corner-bracket {
		position: absolute; width: 30px; height: 30px;
		border-style: solid; border-color: rgba(var(--holo-primary-rgb), 1);
		opacity: 0.7; animation: pulse 2s infinite ease-in-out; z-index: 5;
	}

	.top-left { top: -10px; left: -10px; border-width: 3px 0 0 3px; }
	.top-right { top: -10px; right: -10px; border-width: 3px 3px 0 0; }
	.bottom-left { bottom: -10px; left: -10px; border-width: 0 0 3px 3px; }
	.bottom-right { bottom: -10px; right: -10px; border-width: 0 3px 3px 0; }
	
	/* --- FIXED: ALIEN TERMINAL STYLES --- */
	#mother_container {
		display: grid;
		align-items: center;
		justify-items: center;
		overflow: hidden;
		width: 100%;
		height: 100%;
		color: #7df14a;
		text-shadow: 0 0 5px rgba(125, 241, 74, 0.6);
		font-size: 3rem; /* FIXED: Larger font for visibility */
		z-index: 4;
		position: relative;
		background-color: rgba(0, 0, 0, 0.2);
	}

	#mother_container > div {
		grid-row: 1;
		grid-column: 1;
	}

	#mother_container #lines_container {
		width: 70%;
		height: 70%;
		box-sizing: border-box;
		padding: 15px;
	}

	#mother_container #lines_container .line {
		--grad-offset-scale: 1;
		background: rgba(255, 255, 255, 0);
		display: grid !important; /* FIXED: Force display for fallback */
		margin-bottom: 2px;
	}

	#mother_container #lines_container .line > div {
		grid-row: 1;
		grid-column: 1;
	}

	#mother_container #lines_container .line > div > div > div {
		opacity: 0;
		visibility: hidden;
	}

	#mother_container #lines_container .line .copy {
		justify-self: start;
		position: relative;
		font-kerning: none;
		letter-spacing: 0.05em; /* FIXED: Slight spacing for better char separation */
		opacity: 1; /* FIXED: Fallback visibility */
		color: #7df14a; /* FIXED: Fallback color */
	}

	#mother_container #lines_container .line .copy span.char {
		display: inline-block; /* FIXED: Essential for SplitType chars */
	}

	#mother_container #lines_container .line .grad {
		filter: blur(4px);
		background-image: linear-gradient(90deg,
				rgba(69, 86, 60, 0) calc(0% + (100% * var(--grad-offset-scale))),
				#7df14a calc(25% + (100% * var(--grad-offset-scale))),
				#fff calc(45% + (100% * var(--grad-offset-scale))),
				#fff calc(55% + (100% * var(--grad-offset-scale))),
				#7df14a calc(75% + (100% * var(--grad-offset-scale))),
				rgba(69, 86, 60, 0) calc(100% + (100% * var(--grad-offset-scale))));
		background-repeat: none;
		transform: scaleY(0.45);
	}
	
	/* Animations */
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; }}
	@keyframes fade-out { from { opacity: 1; } to { opacity: 0; }}
	@keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
	@keyframes projector-wobble { 0%, 100% { transform: perspective(1500px) rotateX(15deg) translateY(0px); } 50% { transform: perspective(1500px) rotateX(15.5deg) translateY(-5px); } }
	@keyframes grid-pan { 0% { background-position: 0 0; } 100% { background-position: 30px 30px; } }
	@keyframes pulse { 0%, 100% { opacity: 0.7; border-color: rgba(var(--holo-primary-rgb), 1); } 50% { opacity: 1; border-color: #fff; } }
	@keyframes static-flicker { 0%, 100% { opacity: 0; } 10% { opacity: 0.05; } 15% { opacity: 0; } 25% { opacity: 0.1; } 30% { opacity: 0; } 50% { opacity: 0.1; } 55% { opacity: 0; } 90% { opacity: 0.05; } }
	@keyframes block-glitch-anim { 0% { top: 0%; height: 5%; } 100% { top: 95%; height: 2%; } }
	@keyframes zigzag-scan {
		0% { transform: translateY(-20%); opacity: 0; }
		10% { transform: translateY(10%); opacity: 1; }
		90% { transform: translateY(90%); opacity: 1; }
		100% { transform: translateY(120%); opacity: 0; }
	}
	@keyframes shutdown-effect {
		0% { transform: perspective(1500px) rotateX(15deg) scale(1); filter: brightness(1); opacity: 1; }
		50% { transform: perspective(1500px) rotateX(15deg) scale(1.2, 0.01); filter: brightness(20); opacity: 1; }
		90% { transform: perspective(1500px) rotateX(15deg) scale(0, 0.01); filter: brightness(20); opacity: 1; }
		100% { transform: perspective(1500px) rotateX(15deg) scale(0); filter: brightness(0); opacity: 0; }
	}
	@keyframes melt-anim {
		0% { transform: skewY(0deg); opacity: 0.3; }
		50% { transform: skewY(5deg); opacity: 0.5; }
		100% { transform: skewY(0deg); opacity: 0.3; }
	}
	@keyframes spark-flicker {
		0% { background-position: 0 0; opacity: 0.1; }
		50% { background-position: 5px 5px; opacity: 0.15; }
		100% { background-position: 10px 10px; opacity: 0.1; }
	}
	@keyframes power-on-effect {
		0% {
			transform: perspective(1500px) rotateX(15deg) scale(0);
			filter: brightness(20); opacity: 1;
		}
		50% {
			transform: perspective(1500px) rotateX(15deg) scale(1.2, 0.01);
			filter: brightness(20); opacity: 1;
		}
		100% {
			transform: perspective(1500px) rotateX(15deg) scale(1);
			filter: brightness(1); opacity: 1;
		}
	}

	@keyframes flash-button {
		0%, 100% { border-color: white; color: white; }
		50% { border-color: rgba(var(--holo-primary-rgb), 1); color: rgba(var(--holo-primary-rgb), 1); }
	}

	/* Media Queries for Responsiveness */
	@media (max-width: 768px) {
		.hologram-content {
			width: 95vw; aspect-ratio: unset; height: 60vh; max-height: 70vh;
			transform: perspective(800px) rotateX(5deg);
		}
		#mother_container #lines_container {
			width: 90%;
			height: 80%;
		}
		.close-button { top: -55px; right: -10px; width: 40px; height: 40px; line-height: 36px; }
		.projector-beam { height: 150%; }
		#mother_container {
			font-size: 2rem; /* Smaller on mobile */
		}
	}  
</style>