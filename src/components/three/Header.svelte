<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { phase, ExperiencePhase } from '$lib/stores';
	
	let show = false;
	
	let sparkContainer: HTMLDivElement;
	const numSparks = 45;

	$: sparkData = Array.from({ length: numSparks }, (_, i) => ({
		id: i,
		delay: Math.random() * -5,
		duration: 2 + Math.random() * 2,
		size: 1 + Math.random() * 2,
		startOffset: Math.random() * 100
	}));
</script>

{#if $phase >= ExperiencePhase.FILMSTRIP_GALLERY}
<header class="site-header" transition:fade={{ duration: 1500, delay: 700 }}>
  <a href="/" class="logo-link">
    <h1 class="header-logo zen-dots-regular bloom-footer">McKLab</h1>
    <div class="spark-container" bind:this={sparkContainer}>
      {#each sparkData as spark}
        <div
          class="spark"
          style="--spark-delay: {spark.delay}s; --spark-duration: {spark.duration}s; --spark-size: {spark.size}px; --spark-offset: {spark.startOffset}%;"
        />
      {/each}
    </div>
  </a>
</header>
{/if}

<style>
	/* Import Zen Dots (if not already in app.css) */
	@import url('https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap');

	:root {
		--bloom-color: rgba(255, 255, 255, 0.7);
	}

	.site-header {
		position: absolute;
		top: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		pointer-events: auto;
	}

.bloom-header a, .bloom-header h1 {
		color: var(--bloom-color);
		display: block;
		transition: filter 0.3s ease, transform 0.3s ease;
		filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.5))
			drop-shadow(0 0 0px var(--bloom-color))
			drop-shadow(0 0 10px var(--bloom-color));
	}


	.logo-link {
		position: relative;
		display: inline-block;
		transition: filter 0.3s ease, transform 0.3s ease;
		filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.5))
			drop-shadow(0 0 0px var(--bloom-color))
			drop-shadow(0 0 10px var(--bloom-color));
			text-decoration: none !important;
	}

	.logo-link:hover {
		transform: scale(1.05);
		filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.5))
			drop-shadow(0 0 5px var(--bloom-color))
			drop-shadow(0 0 10px var(--bloom-color));
	}

	.header-logo {
		/* Text styling - matching footer exactly */
		font-size: clamp(80px, 10vw, 140px);
		margin: 0;
		line-height: 1;
		opacity: 0.9;
		position: relative;
		z-index: 2;
		color: var(--bloom-color);
		text-align: center;
		transition: color 0.3s ease, filter 0.3s ease, transform 0.3s ease;
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))
			drop-shadow(0 0 0px var(--bloom-color))
			drop-shadow(0 0 19px var(--bloom-color));
	}

	/* Apply footer's bloom and font classes directly for reuse */
	.zen-dots-regular {
		font-family: 'Zen Dots', sans-serif;
	}

	/* Adjust spark container position relative to text bottom */
	.spark-container {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		height: 150px;
		pointer-events: none;
		z-index: 1;
	}

	.spark {
		position: absolute;
		width: var(--spark-size);
		height: var(--spark-size);
		left: var(--spark-offset);
		top: -13px;
		background: white;
		border-radius: 50%;
		box-shadow: 0 0 5px 1px white, 0 0 10px 2px rgba(173, 216, 230, 0.5);
		animation-name: firework-spark-fall;
		animation-duration: var(--spark-duration);
		animation-delay: var(--spark-delay);
		animation-timing-function: cubic-bezier(0.5, 0, 1, 0.5);
		animation-iteration-count: infinite;
		opacity: 0.7;
	}

	@keyframes firework-spark-fall {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(215px) scale(0.1);
			opacity: 0;
		}
	}

	@media (max-width: 768px) {
		.header-logo {
			font-size: clamp(60px, 15vw, 90px);
		}
	}
</style>