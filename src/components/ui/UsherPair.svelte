<!-- src/components/ui/UsherPair.svelte (Final Clean Version) -->
<script lang="ts">
    import { ET_USHER_PATH, JABBA_USHER_PATH } from "$lib/config/paths.ts"; 
    import { curtainState } from "$lib/stores";
    
    // NEW: Import the extracted component
    import PopcornAnimation from "$components/ui/PopcornAnimation.svelte"; 

    // --- STATE TRACKING ---
    // The component only needs to know the mobile state to conditionally render the Usher Right (Jabba)
    $: isMobile = $curtainState.isMobile;
</script>

<!-- Usher Left (E.T.) -->
<div class="usher usher-left parallax-layer" data-depth="0.65" data-group="ushers">
    <div class="usher-img-wrapper">
        <img src={ET_USHER_PATH} alt="E.T. Usher" class="usher-img" />
    </div>
</div>

<!-- Usher Right (Jabba) -->
<div class="usher usher-right parallax-layer" data-depth="0.70" data-group="ushers">
    <div class="usher-img-wrapper">
        {#if !isMobile}
            <PopcornAnimation />
        {/if}
        <img src={JABBA_USHER_PATH} alt="Jabba Usher" class="usher-img"/>
    </div>
</div>

<style lang="css">
/* --- USHERS (Positioning CSS remains here as it relates to the Usher's container) --- */
.usher {
	position: absolute !important;
	top: auto !important;
	bottom: -50px !important;
	z-index: 20;
	transform-origin: center bottom;
	opacity: 0;
	visibility: hidden;
	filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.9)) brightness(1.1);
	will-change: transform, opacity;
	transition: none;
	overflow: visible;
	pointer-events: auto;

     transform: translateZ(0); 
}

.usher-left {
	left: calc(50% - 42vw) !important;
	margin-left: 10vw;
	bottom: -10px !important;
	width: 17vw;
	height: 48vh;
	z-index: 73;
}

.usher-right {
	left: calc(50% + 10vw) !important;
	right: auto !important;
	bottom: -15px !important;
	width: 27vw;
	height: 63vh;
	z-index: 73;
}

.usher-img-wrapper {
	position: relative;
	width: 100%;
	height: 100%;
	transform: scale(1.1);
}

.usher-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* ✅ FIX: The E.T. finger glow effect styles belong in this component. */
.usher-left .usher-img-wrapper::after {
	content: '';
	position: absolute;
	bottom: 86%;
	left: 77.5%;
	/* ✅ FIX: Use a positive width and adjust for a circular appearance */
	width: 0vw;
	height: 0vw;
	background-color: #ffd90056; /* A rich, golden yellow */
	opacity: 0;
	box-shadow: 0 0.2vw 1.5vw 1vw rgba(255, 220, 100, 0.5), /* ✅ FIX: Use warm yellow for the glow */
		0 0.5vw 3vw 1.5vw rgba(255, 200, 80, 0.25);
	animation: et-finger-glow 2s infinite alternate ease-in-out;
	z-index: 10;
	pointer-events: none;
	border-radius: 50%;
	will-change: transform, opacity, box-shadow;
}

@keyframes et-finger-glow {
	0%,
	100% {
		opacity: 0.4;
		transform: scale(1);
		box-shadow: 0 0.2vw 1.5vw 1vw rgba(255, 220, 100, 0.5),
			0 0.5vw 3vw 1.5vw rgba(255, 200, 80, 0.25);
	}
	50% {
		opacity: 0.7;
		transform: scale(1.05);
		box-shadow: 0 0.2vw 2vw 1.2vw rgba(255, 240, 120, 0.7),
			0 0.5vw 4vw 2vw rgba(255, 220, 100, 0.4);
	}
}

/* --- MOBILE OVERRIDES --- */
@media (max-width: 768px) {
    .usher-right {
		display: none !important;
		visibility: hidden !important;
	}
	.usher-left {
        left: 1% !important;
        margin-left: 0;
        bottom: -100px !important;
        width: 50vw !important;
        height: 46vh !important;
        z-index: 100;
	}

	/* ✅ FIX: Add specific overrides for the glow position on mobile. */
	.usher-left .usher-img-wrapper::after {
		bottom: 85%;
		left: 86.5%;
		width: 0.5vw;
		height: 0.5vw; /* Maintain aspect ratio */
	}
}
</style>