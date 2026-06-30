export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Measures the initial frame rate of the application to determine a quality level.
 */
export class PerformanceMonitor {
    /**
     * Measures the FPS over a short duration and returns a quality level.
     * @param duration - The duration in milliseconds to measure FPS.
     * @returns A Promise that resolves to a QualityLevel.
     */
    public static checkInitialFPS(duration: number = 2000): Promise<QualityLevel> {
        return new Promise((resolve) => {
            let frameCount = 0;
            let startTime = performance.now();
            let rafId: number;

            const countFrames = () => {
                frameCount++;
                const elapsedTime = performance.now() - startTime;

                if (elapsedTime < duration) {
                    rafId = requestAnimationFrame(countFrames);
                } else {
                    const fps = Math.round(frameCount / (elapsedTime / 1000));

                    if (fps < 35) {
                        resolve('low');
                    } else if (fps < 55) {
                        resolve('medium');
                    } else {
                        resolve('high');
                    }
                }
            };

            // Start the measurement loop
            rafId = requestAnimationFrame(countFrames);
        });
    }
}