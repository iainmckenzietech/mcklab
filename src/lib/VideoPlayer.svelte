<script>
  import { createEventDispatcher } from 'svelte';

  export let url;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }
</script>

<div class="video-overlay" on:click|self={close}>
  <div class="video-container">
    <video src={url} controls autoplay playsinline class="full-aspect-video"></video>
    <button on:click={close} class="close-button">X</button>
  </div>
</div>

<style>
  .video-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .video-container {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }

  .full-aspect-video {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
  }

  .close-button {
    position: absolute;
    top: -20px;
    right: -20px;
    background: white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 20px;
    color: black;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 101;
  }
</style>