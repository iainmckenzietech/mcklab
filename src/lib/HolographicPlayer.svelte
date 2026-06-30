<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	export let url = '';
	export let title = ''; // NEW: Added for post title
	export let style = 'Unknown Style';
	export let description = 'System awaiting data input...';
	export let isOpen = false; // Bindable for store sync

	const dispatch = createEventDispatcher();
	let videoElement: HTMLVideoElement;
	let isClosing = false;
	let currentTime = 0;
	let duration = 0;
	let signalStrength = 100;
	let error: string | null = null; // NEW: For video load errors

	function handleClose() {
		if (isClosing) return;
		isClosing = true;
		if (videoElement) videoElement.pause();
		dispatch('close');
	}

	function onAnimationComplete() {
		if (isClosing) {
			isClosing = false;
			isOpen = false; // Sync bindable prop
		}
	}

	function updateVideoInfo() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
			duration = videoElement.duration;
			signalStrength = Math.floor((1 - (currentTime / duration)) * 100) || 100;
		}
	}

	onMount(() => {
		if (videoElement) {
			videoElement.addEventListener('error', (e) => {
				console.error('Video error:', e);
				error = 'Video load failed. Please try again.';
				handleClose();
			});
		}
	});

	onDestroy(() => {
		if (videoElement) videoElement.pause();
	});

	$: if (videoElement && isOpen && !isClosing && !error) {
		videoElement.play().catch((e) => {
			console.error('Video play failed:', e);
			error = 'Playback failed. Check permissions.';
		});
	}
</script>

{#if isOpen && !error}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="hologram-container"
		class:closing={isClosing}
		on:click={handleClose}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:keydown={(e) => {
			if (e.key === 'Escape') handleClose();
		}}
	>
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div class="hologram-content" role="document" on:click|stopPropagation on:animationend={onAnimationComplete}>
			<button class="close-button" on:click={handleClose} aria-label="Close Player">&times;</button>
			<video
				bind:this={videoElement}
				src={url}
				autoplay
				loop
				muted
				playsinline
				crossOrigin="anonymous"
				on:timeupdate={updateVideoInfo}
			></video>

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

			<div class="info-panel-left">
				<div class="title-bar">
					<span>TITLE: {title}</span>
				</div>
				<div class="style-bar">
					<span>STYLE: {style}</span>
				</div>
				<div class="description-text">
					<p>{description}</p>
				</div>
			</div>

			<div class="data-bars left">
				<div class="bar-header">SYS-STATUS</div>
				<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
			</div>
			<div class="data-bars right">
				<div class="bar-header">PWR-LEVEL</div>
				<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
			</div>
			<div class="datastream-container bottom">
				<div class="datastream-text">
					....CARRIER SIGNAL ESTABLISHED....SOURCE ID: 734-AI-THETA....ENCRYPTION LAYER:
					ACTIVE....TRANSMITTING VISUAL DATA....PACKET INTEGRITY: {signalStrength}%....BUFFERING....PLAYBACK
					COMMENCED....WARNING: SIGNAL UNSTABLE....RE-ROUTING THROUGH NODE 7....
				</div>
			</div>
			<div class="data-grid top-right">
				<div class="grid-cell"><span>ID</span><span>2A8B</span></div>
				<div class="grid-cell"><span>STAT</span><span class="ok">OK</span></div>
				<div class="grid-cell"><span>FREQ</span><span>7.8GHz</span></div>
				<div class="grid-cell"><span>TEMP</span><span>38C</span></div>
				<div class="grid-cell"
					><span>TIME</span
					><span>{Math.floor(currentTime)}s / {Math.floor(duration)}s</span></div
				>
			</div>
		</div>
		<div class="projector-beam"></div>
	</div>
{:else if error}
	<div class="error-overlay">{error}</div>
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
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
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
		box-shadow: 0 0 15px rgba(var(--holo-primary-rgb), 0.2), 0 0 30px rgba(var(--holo-primary-rgb), 0.2),
			inset 0 0 10px rgba(var(--holo-primary-rgb), 0.2);
		cursor: default;
		animation: power-on-effect 0.7s ease-out,
			projector-wobble 15s 0.7s infinite ease-in-out;
	}

	.closing .hologram-content {
		animation: shutdown-effect 0.7s ease-out forwards;
	}

	.closing .corner-bracket,
	.closing .data-bars,
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
		position: absolute; top: -45px; right: -15px; width: 35px; height: 35px;
		background: transparent; border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 50%; color: white; font-size: 24px;
		font-family: monospace; line-height: 31px; text-align: center;
		cursor: pointer; transition: all 0.2s ease; z-index: 20;
		animation: flash-button 1.5s infinite steps(1, end); /* NEW: Add flash animation */
	}

	.close-button:hover {
		background: rgba(var(--holo-primary-rgb), 0.2);
		border-color: rgba(var(--holo-primary-rgb), 1);
		transform: scale(1.1) rotate(90deg);
		animation: none; /* NEW: Stop flashing on hover */
	}

	video {
		width: 100%; height: 100%; object-fit: contain;
		opacity: 0.8; mix-blend-mode: screen; animation: flicker 4s infinite steps(1);
		box-shadow: inset 0 0 25px 15px rgba(50, 255, 50, 0.1);
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
		gap: 0.75rem; /* Reduced from 1rem */
		font-size: 14px;
		text-shadow: 0 0 5px var(--holo-secondary);
		animation: data-flicker 0.4s infinite steps(1);
		z-index: 5;
	}

	.error-overlay { /* NEW: Basic error style */
		position: fixed; inset: 0; background: rgba(0,0,0,0.8); color: red; display: flex; align-items: center; justify-content: center; z-index: 3000;
  	}

	/* ... (rest of your styles are assumed to be here and correct) ... */
</style>