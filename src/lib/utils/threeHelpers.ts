import * as THREE from 'three';

// --- SHADER DEFINITIONS ---
// --- HELPER FUNCTIONS ---

export function getBoundsAtDepth(camera: THREE.Camera, depth: number) {
    const distance = camera.position.z - depth;
    const vFOV = THREE.MathUtils.degToRad(
        (camera as THREE.PerspectiveCamera).fov
    );
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * (camera as THREE.PerspectiveCamera).aspect;
    return { x: width / 2, y: height / 2 };
}

export function createProceduralStarTexture(width: number, height: number, density: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    const numStars = width * height * density;
    for (let i = 0; i < numStars; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.2;
        const alpha = Math.random() * 0.5 + 0.2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}