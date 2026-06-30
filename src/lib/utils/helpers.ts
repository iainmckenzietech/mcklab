// src/utils/helpers.ts

/**
 * Preloads a single image and returns a Promise that resolves when the image is loaded.
 * @param {string} src The image URL.
 * @returns {Promise<void>}
 */
export function preloadImage(src: string): Promise<void> {
    if (!src) return Promise.resolve();
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve even on error to prevent blocking
        img.src = src;
    });
}

/**
 * Defines a simple debounce utility.
 * Used to limit function calls during rapid events like window resizing.
 * @param {Function} func The function to debounce.
 * @param {number} [timeout=300] The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func: Function, timeout: number = 300): (...args: any) => void {
    let timer: number;
    return (...args: any) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout) as unknown as number;
    };
}