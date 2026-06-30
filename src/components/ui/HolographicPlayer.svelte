<!-- src/components/ui/HolographicPlayer.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { popupPlayer } from '$lib/stores';

	export let isOpen: boolean = false;
	export let url: string;
	export let title: string;
	export let style: string;
	export let description: string;

	let videoEl: HTMLVideoElement;
	let isClosing = false;
	let containerEl: HTMLDivElement;

	// State for the UI elements
	let currentTime = 0;
	let duration = 0;
	let signalStrength = 100;
	let canClose = false; // ✅ ADD: Flag to prevent immediate close on mobile tap.

	// ✅ FIX: Subscribe to the store's isClosing state to drive the animation class.
	$: isClosing = $popupPlayer.isClosing;
	$: isOpen = $popupPlayer.isOpen;

	function handleBackdropClose(event?: MouseEvent) {
		const targetEl = event?.target as HTMLElement;
		const isBackdropClick = targetEl === containerEl;
		if (event && !isBackdropClick) {
			return;
		}
		// ✅ FIX: Prevent closing immediately after opening on touch devices.
		if (isClosing || !isOpen || !canClose) return;

		if (videoEl) videoEl.pause();
		popupPlayer.update(p => ({ ...p, isClosing: true }));
		// ✅ FIX: Use a reliable timeout instead of on:animationend to reset the state.
		// This ensures the player closes correctly every time.
		setTimeout(() => {
			popupPlayer.update(p => ({ ...p, isOpen: false, isClosing: false }));
		}, 700); // Matches the 0.7s duration of the shutdown-effect animation.
	}

	// ✅ FIX: Create a dedicated, simpler handler for the close button.
	function handleButtonClose() {
		if (isClosing || !isOpen) return;
		if (videoEl) videoEl.pause();
		popupPlayer.update(p => ({ ...p, isClosing: true }));
		// ✅ FIX: Use a reliable timeout instead of on:animationend to reset the state.
		// This ensures the player closes correctly every time.
		setTimeout(() => {
			popupPlayer.update(p => ({ ...p, isOpen: false, isClosing: false }));
		}, 700); // Matches the 0.7s duration of the shutdown-effect animation.
	}

	// Update video info for the UI
	function updateVideoInfo() {
		if (videoEl) {
			currentTime = videoEl.currentTime;
			duration = videoEl.duration || 0;
			signalStrength = Math.floor((1 - currentTime / duration) * 100) || 100;
		}
	}
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleButtonClose(); // Use the more direct handler
		}
	}

	onMount(() => {
		console.log('[DEBUG] HolographicPlayer mounted');
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	$: if (isOpen && !isClosing && videoEl) {
		console.log('[DEBUG] Player isOpen changed to true - attempting play');
		// ✅ FIX: Set a timeout to enable closing, preventing the initial tap from closing it.
		canClose = false;
		setTimeout(() => {
			canClose = true;
		}, 500);
		videoEl.play().catch((e) => {
			console.error('Video play failed:', e);
		});
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		bind:this={containerEl}
		class="hologram-container"
		class:closing={isClosing}
		on:click={handleBackdropClose}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="hologram-content" on:click|stopPropagation>
			<button class="close-button" on:click={handleButtonClose}>&times;</button>
			<video
				bind:this={videoEl}
				src={url}
				autoplay
				loop
				muted
				playsinline
				crossOrigin="anonymous"
				on:timeupdate={updateVideoInfo}
			/>
			<div class="grid-overlay" />

			<div class="scanlines" />
			<div class="static-overlay" />
			<div class="block-glitch">
				<div /><div /><div /><div /><div />
			</div>
			<div class="zigzag-distortion" />
			<div class="melt-glitch" />
			<div class="particle-sparks" />
			<div class="corner-bracket top-left" />
			<div class="corner-bracket top-right" />
			<div class="corner-bracket bottom-left" />
			<div class="corner-bracket bottom-right" />

			<div class="info-panel-left">
				<div class="info-item">
					<span>TITLE</span>
					<span>{title}</span>
				</div>
				<div class="info-item">
					<span>STYLE</span>
					<span>{style}</span>
				</div>
				<div class="info-item blurb">
					<span>INFO</span>
					<span>{description}</span>
				</div>
			</div>

			<div class="data-bars left">
				<div class="bar-header">SYS-STATUS</div>
				<div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" />
			</div>
			<div class="data-bars right">
				<div class="bar-header">PWR-LEVEL</div>
				<div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" /><div class="bar" />
			</div>
			<div class="datastream-container bottom">
				<div class="datastream-text">
					....CARRIER SIGNAL ESTABLISHED....SOURCE ID: 734-AI-THETA....ENCRYPTION
					LAYER: ACTIVE....TRANSMITTING VISUAL DATA....PACKET INTEGRITY: {signalStrength}%....BUFFERING....PLAYBACK
					COMMENCED....WARNING: SIGNAL UNSTABLE....
				</div>
			</div>
			<div class="data-grid top-right">
				<div class="grid-cell"><span>ID</span><span>2A8B</span></div>
				<div class="grid-cell"><span>STAT</span><span class="ok">OK</span></div>
				<div class="grid-cell"><span>FREQ</span><span>7.8GHz</span></div>
				<div class="grid-cell"><span>TEMP</span><span>38C</span></div>
				<div class="grid-cell">
					<span>TIME</span><span>{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
				</div>
			</div>
		</div>
		<div class="projector-beam" />
	</div>
{/if}

<style>
	:root {
		--holo-primary-rgb: 50, 255, 50;
		--holo-secondary: rgba(100, 255, 150, 1);
		--holo-glitch-1: rgba(150, 255, 50, 0.7);
		--holo-glitch-2: rgba(50, 255, 150, 0.7);
		--holo-text: rgba(180, 255, 180, 0.9);
		--holo-melt: rgba(50, 255, 50, 0.2);
	}

	.hologram-container {
		position: fixed;
		inset: 0;
		background-color: rgba(10, 20, 40, 0.5);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		z-index: 2000;
		display: flex;
		justify-content: center;
		align-items: center;
		animation: fade-in 0.5s ease-out;
		cursor: pointer;
		overflow: hidden;
		font-family: 'Share Tech Mono', monospace;
	}

	.hologram-content {
		position: relative;
		width: 80vw;
		max-width: 1200px;
		aspect-ratio: 16 / 9;
		transform: perspective(1500px) rotateX(15deg);
		border: 2px solid rgba(var(--holo-primary-rgb), 0.3);
		background: radial-gradient(ellipse at center, rgba(0, 50, 30, 0.2) 0%, transparent 70%);
		box-shadow:
			0 0 15px rgba(var(--holo-primary-rgb), 0.2),
			0 0 30px rgba(var(--holo-primary-rgb), 0.2),
			inset 0 0 10px rgba(var(--holo-primary-rgb), 0.2);
		cursor: default;
		animation:
			power-on-effect 0.7s ease-out,
			projector-wobble 15s 0.7s infinite ease-in-out;
	}

	.hologram-container.closing {
		opacity: 0;
		transition: opacity 0.5s ease;
	}

	.closing .hologram-content {
		animation: shutdown-effect 0.7s ease-out forwards;
	}

	.closing .corner-bracket,
	.closing .data-bars,
	.closing .data-readout,
	.closing .projector-beam,
	.closing .close-button,
	.closing .datastream-container,
	.closing .data-grid,
	.closing .info-panel-left {
		animation: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.close-button {
		position: absolute;
		top: -45px;
		right: -15px;
		width: 35px;
		height: 35px;
		background: transparent;
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 50%;
		color: white;
		font-size: 24px;
		font-family: monospace;
		line-height: 31px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 20;
		animation: flash-button 1.5s infinite steps(1, end);
	}

	/* ✅ FIX: Only apply hover styles on devices that can actually hover. */
	@media (hover: hover) {
		.close-button:hover {
			background: rgba(var(--holo-primary-rgb), 0.2);
			border-color: rgba(var(--holo-primary-rgb), 1);
			transform: scale(1.1) rotate(90deg);
			animation: none;
		}
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		opacity: 0.8;
		mix-blend-mode: screen;
		animation: flicker 4s infinite steps(1);
		box-shadow: inset 0 0 25px 15px rgba(50, 255, 50, 0.1);
	}

	.scanlines,
	.static-overlay,
	.block-glitch,
	.zigzag-distortion,
	.melt-glitch,
	.particle-sparks,
	.grid-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.scanlines {
		background: linear-gradient(
			to bottom,
			rgba(var(--holo-primary-rgb), 0.1) 0%,
			rgba(var(--holo-primary-rgb), 0.1) 50%,
			transparent 50.1%
		);
		background-size: 100% 4px;
		animation: scan 0.5s linear infinite;
		z-index: 2;
	}

	.grid-overlay {
		background-image: linear-gradient(to right, rgba(var(--holo-primary-rgb), 0.15) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(var(--holo-primary-rgb), 0.15) 1px, transparent 1px);
		background-size: 30px 30px;
		animation: grid-pan 5s linear infinite;
		opacity: 0.4;
		z-index: 1;
	}

	.static-overlay {
		background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiGAAAARVBMVEUAAAC7u7uqqqrExMSbm5uZmZmjo6OysrKUlpSkpKSgoKCHh4eAgIB/f395eXl0dHRtbW1paWlpaWlVVVVRUVFNTU1OTk5ISEhJSUlK8uN9AAAAXElEQVR42tXWWQ6AIAwE0F2B+9/2P6w00Y2eGnKzT+GkY80I4AIAT09BvCgYIIA/FQjwc8ID/Cn4gU8Kn/BH0A//C+YRFIT+4T/BEii/+E/gCbqfxGcwC4U/jA/4L8g/gTv4Q/gC3f5u8hdgr5C/BA4g4y+QfwQ+4w8g/xES/gES/kECPpB/BJ5fAEg/gOMA/gAfgL/AEXwB+SX8C/gh/Av4IX8I/gV/CAhg588C+Cv4C/gI/gB/Av4A/gL+BH8E/gJ/AP8B/gD/Ab8B/wG/Af8B3wG/Ab8BvwG3AbcAtyu/A2g1gAAAABJRU5ErkJggg==');
		animation: static-flicker 0.15s steps(2, end) infinite;
		opacity: 0;
		z-index: 3;
	}

	.block-glitch div {
		position: absolute;
		width: 100%;
		height: 5%;
		background: var(--holo-glitch-1);
		opacity: 0.2;
		animation: block-glitch-anim 3s infinite alternate;
	}

	.block-glitch div:nth-child(2) {
		animation-delay: -1.5s;
		background: var(--holo-glitch-2);
	}
	.block-glitch div:nth-child(3) {
		animation-delay: -0.8s;
	}
	.block-glitch div:nth-child(4) {
		animation-delay: -2.2s;
		background: var(--holo-glitch-2);
	}
	.block-glitch div:nth-child(5) {
		animation-delay: -2.9s;
	}

	.projector-beam {
		position: absolute;
		bottom: 0;
		left: 50%;
		width: 200%;
		height: 200%;
		background: linear-gradient(to top, rgba(var(--holo-primary-rgb), 0.2) 0%, transparent 50%);
		transform-origin: bottom center;
		transform: translateX(-50%) perspective(1000px) rotateX(60deg);
		pointer-events: none;
	}

	.corner-bracket {
		position: absolute;
		width: 30px;
		height: 30px;
		border-style: solid;
		border-color: rgba(var(--holo-primary-rgb), 1);
		opacity: 0.7;
		animation: pulse 2s infinite ease-in-out;
		z-index: 5;
	}

	.top-left {
		top: -10px;
		left: -10px;
		border-width: 3px 0 0 3px;
	}
	.top-right {
		top: -10px;
		right: -10px;
		border-width: 3px 3px 0 0;
	}
	.bottom-left {
		bottom: -10px;
		left: -10px;
		border-width: 0 0 3px 3px;
	}
	.bottom-right {
		bottom: -10px;
		right: -10px;
		border-width: 0 3px 3px 0;
	}

	.data-bars {
		position: absolute;
		bottom: 10%;
		width: 100px;
		height: 20%;
		display: flex;
		flex-direction: column;
		gap: 2%;
		z-index: 5;
	}

	.data-bars.left {
		left: 20px;
	}
	.data-bars.right {
		right: 20px;
		align-items: flex-end;
	}

	.bar-header {
		color: var(--holo-text);
		font-size: 14px;
		text-shadow: 0 0 5px var(--holo-secondary);
		margin-bottom: 2px;
	}

	.data-bars .bar {
		width: 100%;
		height: 8px;
		background-color: var(--holo-secondary);
		box-shadow: 0 0 5px var(--holo-secondary);
		animation: data-bar-anim 1.5s infinite ease-in-out alternate;
	}

	.data-bars.right .bar {
		animation-direction: alternate-reverse;
	}
	.data-bars .bar:nth-child(odd) {
		animation-direction: alternate-reverse;
	}
	.data-bars .bar:nth-child(2) {
		animation-delay: -0.25s;
	}
	.data-bars .bar:nth-child(3) {
		animation-delay: -0.5s;
	}
	.data-bars .bar:nth-child(4) {
		animation-delay: -0.75s;
	}
	.data-bars .bar:nth-child(5) {
		animation-delay: -1s;
	}
	.data-bars .bar:nth-child(6) {
		animation-delay: -1.25s;
	}

	.datastream-container {
		position: absolute;
		width: 100%;
		height: 20px;
		color: var(--holo-text);
		font-size: 14px;
		overflow: hidden;
	}

	.datastream-container.bottom {
		bottom: -30px;
	}
	.datastream-text {
		position: absolute;
		white-space: nowrap;
		animation: datastream-scroll 20s linear infinite;
	}

	.data-grid {
		position: absolute;
		top: 5%;
		right: 5%;
		color: var(--holo-text);
		font-size: 14px;
		display: grid;
		grid-template-columns: 50px 1fr;
		gap: 5px 10px;
		text-shadow: 0 0 5px var(--holo-secondary);
		animation: data-flicker 0.2s infinite steps(1);
		z-index: 5;
	}

	.data-grid span {
		display: block;
	}
	.data-grid .ok {
		color: rgba(var(--holo-primary-rgb), 1);
	}

	.info-panel-left {
		position: absolute;
		left: 5%;
		top: 10%;
		width: 28%;
		height: auto;
		color: var(--holo-text);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 14px;
		text-shadow: 0 0 5px var(--holo-secondary);
		animation: data-flicker 0.4s infinite steps(1);
		z-index: 5;
	}
	.info-item span {
		display: block;
	}
	.info-item span:first-child {
		color: rgba(var(--holo-primary-rgb), 1);
		font-size: 0.8em;
		letter-spacing: 0.1em;
		opacity: 0.7;
		margin-bottom: 0.15em;
	}
	.info-item.blurb span:last-child {
		font-size: 0.9em;
		line-height: 1.4;
		opacity: 0.8;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes scan {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(100%);
		}
	}
	@keyframes flicker {
		0%,
		100% {
			opacity: 0.8;
		}
		2% {
			opacity: 0.75;
		}
		4% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.7;
		}
		52% {
			opacity: 0.75;
		}
		55% {
			opacity: 0.8;
		}
	}
	@keyframes projector-wobble {
		0%,
		100% {
			transform: perspective(1500px) rotateX(15deg) translateY(0px);
		}
		50% {
			transform: perspective(1500px) rotateX(15.5deg) translateY(-5px);
		}
	}
	@keyframes grid-pan {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 30px 30px;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.7;
			border-color: rgba(var(--holo-primary-rgb), 1);
		}
		50% {
			opacity: 1;
			border-color: #fff;
		}
	}
	@keyframes data-bar-anim {
		from {
			width: 20%;
		}
		to {
			width: 100%;
		}
	}
	@keyframes static-flicker {
		0%,
		100% {
			opacity: 0;
		}
		10% {
			opacity: 0.05;
		}
		15% {
			opacity: 0;
		}
		25% {
			opacity: 0.1;
		}
		30% {
			opacity: 0;
		}
		50% {
			opacity: 0.1;
		}
		55% {
			opacity: 0;
		}
		90% {
			opacity: 0.05;
		}
	}
	@keyframes block-glitch-anim {
		0% {
			top: 0%;
			height: 5%;
		}
		100% {
			top: 95%;
			height: 2%;
		}
	}
	@keyframes datastream-scroll {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(-100%);
		}
	}
	@keyframes data-flicker {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			opacity: 1;
		}
	}
	@keyframes shutdown-effect {
		0% {
			transform: perspective(1500px) rotateX(15deg) scale(1);
			filter: brightness(1);
			opacity: 1;
		}
		50% {
			transform: perspective(1500px) rotateX(15deg) scale(1.2, 0.01);
			filter: brightness(20);
			opacity: 1;
		}
		90% {
			transform: perspective(1500px) rotateX(15deg) scale(0, 0.01);
			filter: brightness(20);
			opacity: 1;
		}
		100% {
			transform: perspective(1500px) rotateX(15deg) scale(0);
			filter: brightness(0);
			opacity: 0;
		}
	}
	@keyframes power-on-effect {
		0% {
			transform: perspective(1500px) rotateX(15deg) scale(0);
			filter: brightness(20);
			opacity: 1;
		}
		50% {
			transform: perspective(1500px) rotateX(15deg) scale(1.2, 0.01);
			filter: brightness(20);
			opacity: 1;
		}
		100% {
			transform: perspective(1500px) rotateX(15deg) scale(1);
			filter: brightness(1);
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.hologram-content {
			width: 95vw;
			aspect-ratio: unset;
			height: 60vh;
			max-height: 70vh;
			transform: perspective(800px) rotateX(5deg);
		}
		.data-bars {
			display: none;
		}
		.info-panel-left {
			top: auto;
			bottom: 5%;
			left: 5%;
			right: 5%;
			width: auto;
			height: auto;
			gap: 0.5rem;
			font-size: 12px;
			background: rgba(0, 15, 0, 0.5);
			padding: 10px;
			border-top: 1px solid rgba(var(--holo-primary-rgb), 0.2);
			max-width: 90%;
		}
		.info-panel-left .blurb {
			display: none;
		}
		.close-button {
			top: -55px;
			right: -10px;
			width: 40px;
			height: 40px;
			line-height: 36px;
		}
		.data-grid {
			font-size: 11px;
			grid-template-columns: 35px 1fr;
			gap: 2px 5px;
			top: 2%;
			right: 2%;
		}
		.datastream-container {
			font-size: 12px;
			bottom: -20px;
		}
		.projector-beam {
			height: 150%;
		}
	}
</style>