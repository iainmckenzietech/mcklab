
	let canvas: HTMLCanvasElement;
	let titlesContainer: HTMLElement;
	let cinemaGallery: CinemaGallery | null = null;

	// State for the holographic player
	let isPlayerOpen = false;

	// This is where you would fetch your data in a real app
	const posts = [
		{
			style: 'Abstract Dimensions',
			description: 'A journey through swirling nebulae and crystalline structures, exploring the boundaries of perception.',
			media: [{ url: 'https://res.cloudinary.com/tbor/video/upload/v1719602013/abstract_cgi_animation_of_a_colorful_galaxy_and_nebula_with_many_stars_and_planets_in_the_background_in_4k_ultra_hd_animation_vj_loop_motion_background_for_vj_and_dj_and_scifi_presentation_s_vj0r3y.mp4' }]
		},
		{
			style: 'Cybernetic Dreams',
			description: 'Visual data stream depicting the inner workings of a futuristic metropolis and its AI core.',
			media: [{ url: 'https://res.cloudinary.com/tbor/video/upload/v1719602012/futuristic_hud_interface_screen_with_data_and_code_animation_in_4k_ultra_hd_vj_loop_motion_background_for_vj_and_dj_and_scifi_presentation_s_vj0r3y_1_b3qj7b.mp4' }]
		},
		{
			style: 'Quantum Echoes',
			description: 'An exploration of subatomic particles and quantum foam, rendered as a chaotic yet beautiful dance of light.',
			media: [{ url: 'https://res.cloudinary.com/tbor/video/upload/v1719602012/futuristic_hud_interface_screen_with_data_and_code_animation_in_4k_ultra_hd_vj_loop_motion_background_for_vj_and_dj_and_scifi_presentation_s_vj0r3y_2_f7gqf1.mp4' }]
		},
		// Add more post objects here...
	];

	function handleSlideClick() {
		// Just open the player. We are not passing any data yet.
		isPlayerOpen = true;
		cinemaGallery?.dimBackground(true); // Dim the background scene
	}

	function handlePlayerClose() {
		isPlayerOpen = false;
		cinemaGallery?.dimBackground(false); // Restore scene brightness
	}

	onMount(() => {
		if (canvas && titlesContainer) {
			cinemaGallery = new CinemaGallery(canvas, {
				posts,
				onSlideClick: handleSlideClick,
				// Dummy props to satisfy the interface
				onWarpPeak: () => {},
				onTeleportsComplete: () => {},
				onMusicComplete: () => {},
				titlesContainer: titlesContainer,
				teleportAudio: new Audio(),
				filmstripAudio: new Audio(),
				settings: {}
			});
			cinemaGallery.init();
		}

		return () => {
			cinemaGallery?.dispose();
		};
	});
</script>

<div class="gallery-wrapper">
	<canvas bind:this={canvas}></canvas>
	<div class="titles-container" bind:this={titlesContainer}></div>

	<HolographicPlayer bind:isOpen={isPlayerOpen} on:close={handlePlayerClose} />
</div>

<style>
	.gallery-wrapper, canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.titles-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		opacity: 0; /* Faded in by FilmstripManager */
		visibility: hidden;
	}
</style>