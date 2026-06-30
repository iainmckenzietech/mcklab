<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { DotMatrixDisplay } from '$lib/utils/three/DotMatrixDisplay';
	import { gsap } from 'gsap';

	export let text: string = 'TABOR SPARK';
	export let color: string = '#1e4';
	export let charCount: number = 12;
	export let dotRadius: number = 1.5;

	let canvas: HTMLCanvasElement;
	let display: DotMatrixDisplay;
	let tween: gsap.core.Tween;

	onMount(() => {
		if (!canvas) return;

		display = new DotMatrixDisplay(canvas, text, color, charCount, dotRadius);
		display.scrollPos = 0;

		const scrollWidth = display.bufferWidth - display.visibleWidth;

		tween = gsap.to(display, {
			scrollPos: scrollWidth,
			duration: scrollWidth / (5 * 3),
			ease: 'none',
			repeat: -1,
			onUpdate: () => {
				display.redraw();
			}
		});
	});

	onDestroy(() => {
		if (tween) {
			tween.kill();
		}
	});
</script>

<canvas bind:this={canvas} class="dot-matrix-display"></canvas>

<style>
	.dot-matrix-display {
		display: block;
		width: 100%;
		height: auto;
		box-shadow: 0px 6px 28px rgba(0, 0, 0, 0.8);
		image-rendering: pixelated;
		border-radius: 4px;
	}
</style>