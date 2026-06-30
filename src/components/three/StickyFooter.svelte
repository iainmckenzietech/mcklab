<script lang="ts">

	import { fade } from 'svelte/transition';
	import { isPopupActive } from '$lib/stores.js';

	export let show = false;

	const socialLinks = {
		instagram: 'https://www.instagram.com/taborsparkai' 
	};
</script>
<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Zen+Dots&display=swap" rel="stylesheet">
    </svelte:head>

{#if show && !$isPopupActive}
<div class="bloom-footer" transition:fade={{ duration: 1500, delay: 700 }}>
    
  <h1 class="zen-dots-regular"></h1>
    <div class="social-links">
		<a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram">
			<svg viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" fill="currentColor"/></svg>
		</a>
	</div>

</div>
{/if}
<style>
    /* --- 1. VARIABLES (Permanent Base Tint Increased) --- */
    :root {
        --glitch-main-color: #ffffff; 
        --glitch-dim-color: rgba(255, 255, 255, 0.6); 
        --glitch-cool-accent: #00ffff; 
        
        /* KEY CHANGE: Increased opacity to 15% for a more prominent white tint */
        --background-fill: rgba(255, 255, 255, 0.15); 
        /* Dimming hover: slightly lower opacity tint than the base to enhance dimming contrast */
        --background-fill-hover: rgba(255, 255, 255, 0.10); 
        
        --bloom-color: rgba(255, 255, 255, 0.7); 
    }

	/* --- 2. YOUR BASE STYLES (Unchanged) --- */
	.zen-dots-regular {
		font-family: "Zen Dots", sans-serif;
		font-weight: 400;
		font-style: normal;
	}
	.bloom-footer {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3000;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px; 
		width: 90%;
		max-width: 600px;
		text-align: center;
		padding-bottom: 10px;
	}

    .bloom-header h1 {
		font-size: 1.2rem;
		font-weight: 400;
		margin: 0;
		line-height: 1.4;
		text-transform: inherit;
	}

	.zen-dots-regular {
		font-family: "Zen Dots", sans-serif;
		font-weight: 400;
		font-style: normal;
        font-size: 1.3rem;
	}

	.bloom-header a, .bloom-header h1 {
		color: var(--bloom-color);
		display: block;
		transition: filter 0.3s ease, transform 0.3s ease;
		filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.5))
			drop-shadow(0 0 0px var(--bloom-color))
			drop-shadow(0 0 10px var(--bloom-color));
	}
    
    /* ---------------------------------------------------------------------- */
    /* --- 3. GLITCH BUTTON STYLES (Permanent 15% White Tint) --- */
    /* ---------------------------------------------------------------------- */
    .glitch-button {
        /* KEY CHANGE: Uses the 15% soft white fill for a solid tint */
        background: var(--background-fill); 
        
        border: 2px solid var(--glitch-main-color); 
        color: var(--glitch-main-color);
        font-family: 'Zen Dots', monospace;
        font-size: 1.0rem; 
        font-weight: 700;
        letter-spacing: 2px; 
        padding: 9px 18px; 
        position: relative;
        cursor: pointer;
        text-transform: uppercase;
        overflow: hidden;
        transition: all 0.3s ease;
        background-clip: padding-box;
        border-radius: 6px; 
        
        /* Strong base bloom */
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.7), 
                    inset 0 0 5px rgba(255, 255, 255, 0.2); 
    }

    /* Swipe effect: Adjusted to soft white/cyan */
    .glitch-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg,  
            transparent,  
            rgba(0, 255, 255, 0.1), /* Cyan tint */
            transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
        z-index: 1;
    }

    .glitch-button:hover:not(:disabled)::before {
        transform: translateX(100%);
    }

    /* Main Text */
    .text {
        position: relative;
        z-index: 3;
        display: block;
        transition: all 0.3s ease;
        /* White text bloom */
        filter: drop-shadow(0 0 4px var(--glitch-main-color));
    }

    /* Glitch Layers container (Hidden in base state) */
    .glitch-layers {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0; 
        transition: opacity 0.3s ease;
        pointer-events: none; 
    }

    .layer {
        position: absolute;
        top: 50%;
        left: 50%;
        font-size: 1.0rem; 
        font-weight: 700;
        letter-spacing: 2px; 
        text-transform: uppercase;
        white-space: nowrap;
        transform: translate(-50%, -50%); 
    }

    .layer-1 {
        color: var(--glitch-dim-color); 
        z-index: 1;
        animation: glitch1 0.3s ease-in-out infinite;
    }

    .layer-2 {
        color: var(--glitch-cool-accent); 
        z-index: 2;
        animation: glitch2 0.4s ease-in-out infinite;
    }

    .layer-3 {
        color: var(--glitch-dim-color); 
        z-index: 1;
        animation: glitch3 0.5s ease-in-out infinite;
    }

    /* Glitch Animation Keyframes (Unchanged) */
    @keyframes glitch1 {
        0%, 100% { transform: translate(-50%, -50%); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        10% { transform: translate(-51%, -49%); clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%); } 
        20% { transform: translate(-49%, -51%); clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%); }
        30% { transform: translate(-51%, -50%); clip-path: polygon(0 0, 100% 0, 100% 30%, 0 30%); }
        40% { transform: translate(-49%, -49%); clip-path: polygon(0 70%, 100% 70%, 100% 100%, 0 100%); }
        50% { transform: translate(-50%, -51%); clip-path: polygon(0 0, 100% 0, 100% 80%, 0 80%); }
    }

    @keyframes glitch2 {
        0%, 100% { transform: translate(-50%, -50%); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        15% { transform: translate(-49%, -51%); clip-path: polygon(0 20%, 100% 20%, 100% 60%, 0 60%); }
        25% { transform: translate(-51%, -49%); clip-path: polygon(0 0, 100% 0, 100% 40%, 0 40%); }
        35% { transform: translate(-50%, -51%); clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%); }
        45% { transform: translate(-49%, -50%); clip-path: polygon(0 0, 100% 0, 100% 25%, 0 25%); }
        55% { transform: translate(-51%, -51%); clip-path: polygon(0 75%, 100% 75%, 100% 100%, 0 100%); }
    }

    @keyframes glitch3 {
        0%, 100% { transform: translate(-50%, -50%); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        12% { transform: translate(-51%, -51%); clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%); }
        24% { transform: translate(-49%, -49%); clip-path: polygon(0 50%, 100% 50%, 100% 85%, 0 85%); }
        36% { transform: translate(-51%, -49%); clip-path: polygon(0 0, 100% 0, 100% 60%, 0 60%); }
        48% { transform: translate(-49%, -51%); clip-path: polygon(0 40%, 100% 40%, 100% 100%, 0 100%); }
        60% { transform: translate(-50%, -49%); clip-path: polygon(0 0, 100% 0, 100% 90%, 0 90%); }
    }

    /* ---------------------------------------------------------------------- */
    /* --- 4. HOVER EFFECTS (DIMMING LIGHT & ACTIVATING GLITCH) --- */
    /* ---------------------------------------------------------------------- */
    .glitch-button:hover:not(:disabled) {
        /* KEY CHANGE: Dimmer background on hover (lower opacity white) */
        background: var(--background-fill-hover); 
        
        /* DIM THE TEXT AND BORDER */
        color: var(--glitch-dim-color); 
        border-color: var(--glitch-dim-color);
        
        /* DIM THE SHADOW/BLOOM */
        box-shadow: 
            0 0 5px rgba(255, 255, 255, 0.4), /* Reduced outer glow opacity */
            inset 0 0 5px rgba(255, 255, 255, 0.1); /* Reduced inner glow */
            
        /* Button jiggle animation */
        animation: buttonGlitch 0.3s ease-in-out infinite; 
    }

    .glitch-button:hover:not(:disabled) .glitch-layers {
        opacity: 1; /* Glitch layers become fully visible on hover */
    }

    .glitch-button:hover:not(:disabled) .text {
        /* Text becomes dimmer and glitch text shadow is softer */
        filter: drop-shadow(0 0 1px var(--glitch-dim-color)); 
        text-shadow: 
            1px 0 var(--glitch-dim-color), 
            -1px 0 var(--glitch-cool-accent), 
            0 1px var(--glitch-dim-color), 
            0 -1px var(--glitch-cool-accent);
    }

    @keyframes buttonGlitch {
        0%, 90%, 100% { transform: translate(0); }
        10% { transform: translate(-0.5px, 0.5px); } 
        20% { transform: translate(0.5px, -0.5px); }
        30% { transform: translate(-0.5px, -0.5px); }
        40% { transform: translate(0.5px, 0.5px); }
        50% { transform: translate(-0.5px, 0); }
        60% { transform: translate(0.5px, 0); }
        70% { transform: translate(0, -0.5px); }
        80% { transform: translate(0, 0.5px); }
    }

    /* Active State */
    .glitch-button:active:not(:disabled) {
        transform: scale(0.80); 
        box-shadow: 
            0 0 2px rgba(255, 255, 255, 0.2),
            inset 0 0 10px rgba(255, 255, 255, 0.1);
    }
    
    /* Disabled State */
    .glitch-button:disabled {
        cursor: not-allowed;
        opacity: 0.3; 
        background: rgba(255, 255, 255, 0.03); 
        box-shadow: none;
        border-color: rgba(255, 255, 255, 0.2); 
        animation: none; 
        transform: scale(1.0); 
    }
    .glitch-button:disabled .glitch-layers { opacity: 0 !important; }
    .glitch-button:disabled .text { text-shadow: none; filter: none; }

	/* --- SOCIAL LINKS & ANIMATIONS (Unchanged) --- */
	.bloom-footer a, .bloom-footer h1 {
		color: var(--bloom-color);
		transition: color 0.3s ease, filter 0.3s ease, transform 0.3s ease;
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))
			drop-shadow(0 0 0px var(--bloom-color))
			drop-shadow(0 0 19px var(--bloom-color));
	}

	.bloom-footer .social-links {
		display: flex;
		gap: 20px;
		margin-top: 5px;
	}

    /* --- RESPONSIVE DESIGN (Unchanged) --- */
    @media (max-width: 768px) {
        .bloom-footer { gap: 25px; bottom: 25px; }
        .glitch-button { font-size: 0.9rem; padding: 10px 20px; letter-spacing: 1.5px; }
        .layer { font-size: 0.9rem; letter-spacing: 1.5px; }
        .bloom-footer .social-links { gap: 15px; }
        .bloom-footer svg { width: 28px; height: 28px; }
    }

    @media (max-width: 480px) {
        .bloom-footer { gap: 15px; bottom: 25px; }
        .glitch-button { font-size: 0.8rem; padding: 8px 18px; letter-spacing: 1px; }
        .layer { font-size: 0.8rem; letter-spacing: 1px; }
        .bloom-footer .social-links { gap: 12px; }
        .bloom-footer svg { width: 25px; height: 25px; }
    }
</style>
