<!-- src/components/ui/MarqueeSign.svelte (NO CHANGES) -->
<script lang="ts">
	import DotMatrix from './DotMatrix.svelte'; // ✅ ADD: Import the new component
	import { createEventDispatcher } from 'svelte';
	import { curtainState } from '$lib/stores';
	import { get } from 'svelte/store';

	export let logoSrc: string;
	export let imageHeight: number;
	export let handleEnter: (event: MouseEvent | KeyboardEvent) => void;

	const dispatch = createEventDispatcher();
	let loaded = get(curtainState).imageLoaded;

	curtainState.subscribe((s) => {
		if (s.imageLoaded) {
			loaded = true;
		}
	});

	function handleMouseAction(active: boolean) {
		// ✅ REFACTOR: Dispatch events instead of direct DOM manipulation.
		dispatch(active ? 'signHoverStart' : 'signHoverEnd');
	}
</script>

<div class="logo-container parallax-layer" data-depth="0.90">
	<div class="logo-wrapper" style:height="{`${imageHeight}px`}">
		<div
			id="wrapper"
			class:loaded
			role="button"
			tabindex="0"
			aria-label="Enter the experience"
			on:click="{handleEnter}"
			on:keydown="{handleEnter}"
			on:mouseenter={() => handleMouseAction(true)}
			on:mouseleave={() => handleMouseAction(false)}
		>
			<div id="sign-content">
				<img src={logoSrc} alt="Enter the experience" />
				<!-- ✅ ADD: The DotMatrix component, centered over the image -->
				<div class="dot-matrix-container">
					<DotMatrix 
						text="ENTER SITE" 
						color="#00ff41"
						charCount={4}
						dotRadius={4.1}
					/>
				</div>
			</div>

			<ul id="top">
				{#each Array(14) as _}<li></li>{/each}
			</ul>
			<ul id="right">
				{#each Array(6) as _}<li></li>{/each}
			</ul>
			<ul id="bottom">
				{#each Array(14) as _}<li></li>{/each}
			</ul>
			<ul id="left">
				{#each Array(6) as _}<li></li>{/each}
			</ul>
		</div>
	</div>
</div>
<style lang="css">
/* --- LOGO CONTAINER --- */
.logo-container {
    position: absolute !important;
    top: 21% !important;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 510px;
    max-height: 300px;
    width: 90vw;
    height: auto;
    aspect-ratio: 3 / 2;
    z-index: 480;
    pointer-events: auto;
}
.logo-wrapper {
    position: relative;
    width: 510px;
    height: 350px !important;
    font-size: clamp(7px, calc(100% / 40), 14px);
}

/* --- SIGN CONTENT --- */
#wrapper {
    position: absolute;
    inset: 0;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
}
#wrapper.loaded {
    opacity: 1;
}

#sign-content {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative; /* ✅ ADD: Needed for absolute positioning of child */
    box-sizing: border-box;
    top: 22%;
}

.dot-matrix-container {
	position: absolute;
	top: 40%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 1; /* Place it on top of the img */
}

/* ✅ ADD: The HAL 9000 red glow pseudo-element. */
#sign-content::before {
	content: '';
	position: absolute;
	top: 13%;
	left: 51%;
	transform: translate(-50%, -50%);
	width: 12px;
	height: 12px;
	background-color: #ff2a2a;
	border-radius: 50%;
	box-shadow: 0 0 5px #ff2a2a, 0 0 10px #ff2a2a, 0 0 15px #ff0000;
	opacity: 0; /* Hidden by default */
	animation: hal-pulse 2.5s infinite ease-in-out;
	animation-play-state: paused; /* Paused by default */
	transition: opacity 0.4s ease;
	z-index: 2; /* Above the image but below the dot matrix text */
}


#sign-content img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}
#sign-content::after {
    content: '';
    position: absolute;
    bottom: 87%;
    left: 73%;
    background-color: #FFF8E0;
    opacity: 0;
    box-shadow: 
        0 0.2vw 1.5vw 1.0vw rgba(255, 255, 255, 0.4), 
        0 0.5vw 3.0vw 1.5vw rgba(255, 230, 150, 0.15);
    animation: et-finger-glow 2s infinite alternate ease-in-out;
    z-index: 10;
    pointer-events: none;
    will-change: transform, opacity, box-shadow; 
}

ul {
    list-style: none;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

li {
    width: 1em;
    height: 1em;
    border-radius: 100%;
    background: radial-gradient(ellipse at center, rgba(255,255,200,0.5) 30%, rgba(255,255,150,0.8) 100%);
    position: relative;
    /* ✅ OPTIMIZATION: Use static box-shadow (ON state) and animate opacity. 
       This avoids expensive layout thrashing from animating box-shadow directly. */
    box-shadow: inset 0 0 1.875em 0.625em rgba(255,255,220,0.9),
                0 0 1.875em 0.5em rgba(255,255,190,0.9);
    /* Removed flicker-random to prioritize performance and avoid opacity conflicts */
    animation-name: chase; 
    animation-iteration-count: infinite;
    z-index: 10;
    will-change: opacity; /* Hint for browser optimization */
    transition: animation-duration 0.2s ease-in-out; 
}

/* --- LIGHT STRIP PLACEMENT --- */
#top, #bottom {
    position: absolute;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between; 
    align-items: center;
    /* Symmetrical padding for all sides */
    padding: 16em 22.2em; 
    box-sizing: border-box;
}
#top {
    top: 3px;
}
#bottom {
    bottom: 0;
	top: 43px; /* Should this be 38px or 0? 0 is the logical bottom, 38px is an artifact */
}
#right, #left {
    position: absolute;
    top: -19px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between; 
    padding: 19.25em 142px; 
    box-sizing: border-box;
}
#right {
    right: -0.5px;
}
#left {
    left: -1px;
}
#top li, #bottom li, #right li, #left li {
    margin: 0; 
    flex: 0 0 auto;
}

/* --- LIGHT ANIMATION --- */
/* ✅ OPTIMIZATION: Removed the secondary duration/delay for flicker-random */
li:nth-child(4n + 1) { animation-duration: 600ms; }
li:nth-child(4n + 2) { animation-duration: 600ms; }
li:nth-child(4n + 3) { animation-duration: 600ms; }
li:nth-child(4n + 4) { animation-duration: 600ms; }
li:nth-child(3n+1) { animation-delay: 0s; }
li:nth-child(3n+2) { animation-delay: 200ms; }
li:nth-child(3n+3) { animation-delay: 400ms; }

/* ✅ OPTIMIZATION: Animate opacity instead of box-shadow. 
   Opacity is handled by the GPU compositor, making this buttery smooth even on Chrome. */
@keyframes chase {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.3;
    }
    100% {
        opacity: 0.3;
    }
}

/* ✅ ADD: The keyframes for the HAL pulse animation. */
@keyframes hal-pulse {
	0%, 100% {
		transform: translate(-50%, -50%) scale(1);
		box-shadow: 0 0 5px #ff2a2a, 0 0 10px #ff2a2a, 0 0 15px #ff0000;
	}
	50% {
		transform: translate(-50%, -50%) scale(1.1);
		box-shadow: 0 0 8px #ff4a4a, 0 0 18px #ff4a4a, 0 0 28px #ff2a2a;
	}
}

@keyframes flicker-random {
    0%, 5%, 8%, 15%, 25%, 50%, 100% { opacity: 1; filter: brightness(1); }
    3% { opacity: 0.1; filter: brightness(0.6); }
    6% { opacity: 0.8; filter: brightness(0.9); }
    16% { opacity: 0.3; filter: brightness(0.7); }
    21% { opacity: 0.9; filter: brightness(1.1); }
    40% { opacity: 0.85; filter: brightness(0.95); }
}

#wrapper.hovered li,
#wrapper:focus li {
    /* Reduce duration from 600ms to 150ms for a massive speed increase */
    animation-duration: 150ms; 
}

/* --- MOBILE OVERRIDES --- */
@media (max-width: 768px) {
    .logo-container {
		top: 50% !important;
		left: 50% !important;
		transform: translate(-50%, -50%) !important;
		y: 0 !important;
	}
	.logo-wrapper {
		top: 35% !important;
		left: 50% !important;
		transform: translate(-50%, -50%) !important; 
		width: 550px !important; 
		height: 250px !important; 
		max-height: 25vh;
	}
    #top, #bottom {
        padding: 6.5em 24.25em; 
        display:none !important; /* Temporarily disabled on mobile based on original code */
    }
    #right, #left{
        display:none !important; /* Temporarily disabled on mobile based on original code */
        top:-21px;
        padding:9.25em 158px;
    }

.rope-frame {

    display:none !important;
}

}
</style>
