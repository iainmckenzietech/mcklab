import { gsap } from 'gsap';
import { currentTrack, activeAudio as activeAudioStore, audioCues } from '$lib/stores';
import { get } from 'svelte/store';

export class AudioManager {
    private static instance: AudioManager | null = null;

    private EPIC_THEME_START_OFFSET = 17;
    private audioContext: AudioContext | null = null;
    private tracks: Map<string, HTMLAudioElement> = new Map();
    private activeAudio: HTMLAudioElement | null = null;
    private activeGallery: CinemaGallery | null = null;
    private analyser: AnalyserNode | null = null;
    private frequencyData: Uint8Array | null = null;
    private sourceNodeMap: Map<HTMLAudioElement, MediaElementAudioSourceNode> = new Map();
    private currentAnalysedSource: MediaElementAudioSourceNode | null = null;
	private isDucked: boolean = false;
	private originalVolume: number = 0.5;

    constructor(audioRefs: { [key: string]: HTMLAudioElement }) {
        if (AudioManager.instance) {
            // Silently return the existing instance if one already exists.
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        for (const key in audioRefs) {
            this.tracks.set(key, audioRefs[key]);
        }
    }

    public getTrack(trackName: string): HTMLAudioElement | null {
        return this.tracks.get(trackName) || null;
    }

    public initAudioContext() {
        // Create AudioContext on first user gesture
        if (this.audioContext) return;

        try {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.connect(this.audioContext.destination);

            this.tracks.forEach((audioElement, trackName) => {
                if (!this.sourceNodeMap.has(audioElement)) {
                    if (!(audioElement instanceof HTMLMediaElement)) return;
                    const sourceNode = this.audioContext!.createMediaElementSource(audioElement);
                    sourceNode.connect(this.audioContext!.destination); // Direct to speakers for sound
                    this.sourceNodeMap.set(audioElement, sourceNode);
                }
            });

        } catch (e) {
        }
    };

    public static getInstance(audioRefs?: { [key: string]: HTMLAudioElement }): AudioManager {
        if (!AudioManager.instance) {
            if (!audioRefs) throw new Error("AudioManager must be initialized with audioRefs on first call.");
            AudioManager.instance = new AudioManager(audioRefs);
        }
        return AudioManager.instance;
    }

    public register(gallery: CinemaGallery) {
        this.activeGallery = gallery;
    }

    public unregister() {
        this.activeGallery = null;
        this.disconnectAnalyserSources();
        activeAudioStore.set(null);
    }

    public preloadAll() {
        this.tracks.forEach((audio) => audio.load());
    }

    public async play(trackName: string, options: { volume?: number; startTime?: number } = {}) {
        const audio = this.tracks.get(trackName);
        if (!audio) return;
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }

        audio.volume = options.volume ?? 0.5;
        const targetStartTime = options.startTime ?? (trackName.includes('epic') ? this.EPIC_THEME_START_OFFSET : 0);

        audio.currentTime = targetStartTime;

        try {
            await audio.play();
            // ✅ FIX: Only connect primary music tracks to the analyser, not sound effects like the filmstrip reel.
            if (trackName.includes('theme') || trackName.includes('ambient_intro')) {
                this.connectActiveAudio(audio);
                this.activeAudio = audio;
                activeAudioStore.set(audio);
            }
        } catch (e) {
        }

        currentTrack.set(trackName);
    }

    public setTrackVolume(trackName: string, volume: number, duration: number = 0.1) {
        const audio = this.tracks.get(trackName);
        if (audio) {
            if (duration > 0) {
                gsap.to(audio, { volume: volume, duration: duration, ease: 'linear' });
            } else {
                audio.volume = volume;
            }
        }
    }

    public pause(trackName: string) {
        const audio = this.tracks.get(trackName);
        if (audio) {
            audio.pause();
            // Resetting currentTime allows it to play from the start next time.
            audio.currentTime = 0;
        }
    }

	public duckMainTrack(shouldDuck: boolean, duration: number = 0.5) {
		const primaryTrackName = get(currentTrack);
		// ✅ FIX: Prevent ducking for the main theme and sound effects.
		if (!primaryTrackName || primaryTrackName.includes('sfx') || primaryTrackName === 'epic_theme') return;

		const audio = this.tracks.get(primaryTrackName);
		if (!audio) return;

		if (shouldDuck && !this.isDucked) {
			this.isDucked = true;
			this.originalVolume = audio.volume; // Store the current volume
			const duckedVolume = this.originalVolume * 0.2; // Duck to 20% of current volume
			gsap.to(audio, { volume: duckedVolume, duration: duration, ease: 'power2.out' });
		} else if (!shouldDuck && this.isDucked) {
			this.isDucked = false;
			// Restore to the volume it was at before ducking
			gsap.to(audio, { volume: this.originalVolume, duration: duration, ease: 'power2.inOut' });
		}
	}
    public async crossfade(
        fromTrackName: string,
        toTrackName: string,
        duration: number,
        options: { startTime?: number } = {}
    ) {
        const fromAudio = this.tracks.get(fromTrackName);
        const toAudio = this.tracks.get(toTrackName);

        if (!toAudio) return;
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }

        toAudio.volume = 0;

        const targetStartTime = options.startTime ?? (toTrackName.includes('epic') ? this.EPIC_THEME_START_OFFSET : 0);
        toAudio.currentTime = targetStartTime;

        try {
            await toAudio.play();
            // Ensure the crossfaded track is connected to the analyser, as it's always a music track.
            this.connectActiveAudio(toAudio);
            this.activeAudio = toAudio;
            activeAudioStore.set(toAudio);
            gsap.to(toAudio, { volume: 0.3, duration, ease: 'power2.in' });
            currentTrack.set(toTrackName); // ✅ FIX: Set the store to the track's name, not its SRC.

            // 🔥 FIX: Explicitly set the 'from' track to not loop.
            // This ensures it plays to its natural end and then stops, instead of repeating.
            if (fromAudio) {
                // This was already here, but let's ensure it's correct.
                // The main theme should not loop after crossfading away from it.
                if (fromTrackName === 'epic_theme') fromAudio.loop = false;
            }
        } catch (e) {}
    }

    public triggerSoundEffect(trackName: string, volume: number = 0.4) {
        const audio = this.tracks.get(trackName);
        if (audio) {
            if (audio.paused) {
                audio.volume = 0;
                audio.play().catch(() => {});
            }
            gsap.to(audio, { volume: volume, duration: 0.3 });
        }
    }

    private connectActiveAudio(audioToConnect: HTMLAudioElement) {
        if (!this.audioContext || !this.analyser) return;

        // Disconnect old from analyser only
        if (this.currentAnalysedSource) {
            try {
                this.currentAnalysedSource.disconnect(this.analyser);
            } catch (e) {}
        }

        const source = this.sourceNodeMap.get(audioToConnect);
        if (source) {
            try {
                source.connect(this.analyser);
                this.currentAnalysedSource = source;
            } catch (e) {
            }
        } else {
        }
    }

    private disconnectAnalyserSources() {
        if (this.currentAnalysedSource && this.analyser) {
            try {
                this.currentAnalysedSource.disconnect(this.analyser);
            } catch (e) {}
            this.currentAnalysedSource = null;
        }
    }

    public getFrequencyData(): Uint8Array | null {
        if (!this.analyser || !this.frequencyData) return null;
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }

    public disconnectAnalyser() {
        if (this.analyser) {
            this.disconnectAnalyserSources();
            this.sourceNodeMap.forEach((sourceNode) => {
                try {
                    sourceNode.disconnect(this.audioContext!.destination);
                } catch (e) {}
            });
            this.sourceNodeMap.clear();
            this.analyser.disconnect();
            this.analyser = null;
            this.frequencyData = null;
        }
    }
}