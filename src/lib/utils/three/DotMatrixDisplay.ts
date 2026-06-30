// src/lib/utils/three/DotMatrixDisplay.ts

const CHAR_SPACE = 1;
const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;
const DOT_PAD = 0.5;
const OUT_PAD = 2;

const FONT = Object.freeze({
	A: [0xe, 0x11, 0x1f, 0x11, 0x11], B: [0x1e, 0x11, 0x1e, 0x11, 0x1e],
	C: [0xf, 0x10, 0x10, 0x10, 0xf], D: [0x1e, 0x11, 0x11, 0x11, 0x1e],
	E: [0x1f, 0x10, 0x1e, 0x10, 0x1f], F: [0x1f, 0x10, 0x1e, 0x10, 0x10],
	G: [0xf, 0x10, 0x17, 0x11, 0xf], H: [0x11, 0x11, 0x1f, 0x11, 0x11],
	I: [0xe, 0x4, 0x4, 0x4, 0xe], J: [0x7, 0x2, 0x2, 0x12, 0xc],
	K: [0x11, 0x12, 0x1c, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x1f],
	M: [0x11, 0x1b, 0x15, 0x11, 0x11], N: [0x11, 0x19, 0x15, 0x13, 0x11],
	O: [0xe, 0x11, 0x11, 0x11, 0xe], P: [0x1e, 0x11, 0x1e, 0x10, 0x10],
	Q: [0xe, 0x11, 0x15, 0x13, 0xf], R: [0x1e, 0x11, 0x1e, 0x11, 0x11],
	S: [0xf, 0x10, 0xe, 0x1, 0x1e], T: [0x1f, 0x4, 0x4, 0x4, 0x4],
	U: [0x11, 0x11, 0x11, 0x11, 0xe], V: [0x11, 0x11, 0xa, 0xa, 0x4],
	W: [0x11, 0x11, 0x15, 0x1b, 0x11], X: [0x11, 0xa, 0x4, 0xa, 0x11],
	Y: [0x11, 0x11, 0xa, 0x4, 0x4], Z: [0x1f, 0x2, 0x4, 0x8, 0x1f],
	0: [0x1f, 0x13, 0x15, 0x19, 0x1f], 1: [0x4, 0xc, 0x4, 0x4, 0xe],
	2: [0x1f, 0x1, 0x1f, 0x10, 0x1f], 3: [0x1f, 0x1, 0xf, 0x1, 0x1f],
	4: [0x11, 0x11, 0x1f, 0x1, 0x1], 5: [0x1f, 0x10, 0x1f, 0x1, 0x1f],
	6: [0x1f, 0x10, 0x1f, 0x11, 0x1f], 7: [0x1f, 0x1, 0x7, 0x1, 0x1],
	8: [0x1f, 0x11, 0x1f, 0x11, 0x1f], 9: [0x1f, 0x11, 0x1f, 0x1, 0x1f],
	'!': [0xe, 0xe, 0x4, 0x0, 0x4], '?': [0x1f, 0x11, 0x7, 0x0, 0x4],
	':': [0x0, 0x4, 0x0, 0x4, 0x0], ';': [0x0, 0x4, 0x0, 0x4, 0x8],
	',': [0x0, 0x0, 0x0, 0x4, 0x8], '.': [0x0, 0x0, 0x0, 0x0, 0x8],
	' ': [0x0, 0x0, 0x0, 0x0, 0x0],
});

export class DotMatrixDisplay {
	ctx: CanvasRenderingContext2D;
	mat: boolean[];
	bufferWidth: number;
	visibleWidth: number;
	height: number;
	scrollPos: number = 0;
	canvas: HTMLCanvasElement;
	textToScroll: string;
	color: string;
	charCount: number;
	dotRadius: number;

	private dotOnCanvas: HTMLCanvasElement; // We only need to cache the "on" state.
	constructor(canvas: HTMLCanvasElement, textToScroll: string, color: string, charCount: number, dotRadius: number) {
		this.ctx = canvas.getContext('2d')!;
		// ✅ NEW: Guard against running in SSR environments where canvas context might not be available.
		if (!this.ctx) {
			return;
		}
		this.canvas = canvas;
		this.textToScroll = textToScroll;
		this.color = color;
		this.charCount = charCount;
		this.dotRadius = dotRadius;

		this.bufferWidth = (this.textToScroll.length + this.charCount * 2) * (CHAR_WIDTH + CHAR_SPACE);
		this.visibleWidth = this.charCount * (CHAR_WIDTH + CHAR_SPACE);
		this.height = CHAR_HEIGHT;
		this.mat = new Array(this.bufferWidth * this.height).fill(false);
		this.canvas.width = this.visibleWidth * (this.dotRadius * 2 + DOT_PAD) + OUT_PAD * 2;
		this.canvas.height = this.height * (this.dotRadius * 2 + DOT_PAD) + OUT_PAD * 2; // ✅ FIX: Ensure height is set correctly.

		// ✅ FIX: Initialize dotOnCanvas BEFORE calling writeText() to prevent a race condition.
		this.dotOnCanvas = this.createDotCanvas(); 
		this.writeText();
	}

	set(x: number, y: number, v: boolean = false) {
		if (x < 0 || x >= this.bufferWidth || y < 0 || y >= this.height) return;
		this.mat[x + y * this.bufferWidth] = v;
	}

	sprite(x: number, y: number, image: number[]) {
		if (!image) return;
		for (let j = 0; j < 5; j++) {
			const row = image[j];
			for (let i = 0; i < 5; i++) {
				const col = (row >> (4 - i)) & 0b1;
				if (col === 1) this.set(x + i, y + j, true);
			}
		}
	}

	/** ✅ NEW: Clears the matrix buffer. */
	clear() {
		this.mat.fill(false);
	}

	/** ✅ NEW: Writes a static, centered message. */
	writeStaticText(text: string) {
		this.clear();
		const textWidth = text.length * (CHAR_WIDTH + CHAR_SPACE) - CHAR_SPACE;
		let startX = Math.floor((this.visibleWidth - textWidth) / 2);

		for (let i = 0; i < text.length; i++) {
			this.sprite(startX, 1, FONT[text.charAt(i) as keyof typeof FONT] || FONT[' ']);
			startX += CHAR_WIDTH + CHAR_SPACE;
		}
		this.scrollPos = 0; // Reset scroll position for static text
		this.redraw();
	}

	writeText() {
		const fullText = ' '.repeat(this.charCount) + this.textToScroll.toUpperCase() + ' '.repeat(this.charCount);
		let ox = 0;
		for (let i = 0; i < fullText.length; i++) {
			this.sprite(ox, 1, FONT[fullText.charAt(i) as keyof typeof FONT] || FONT[' ']);
			ox += CHAR_WIDTH + CHAR_SPACE;
		}
		// ✅ FIX: Remove redraw() from here. The animation loop is now solely responsible for drawing.
	}

	private createDotCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		// ✅ FIX: Make the canvas larger to avoid clipping the glow.
		// A 4x multiplier on the radius for the shadow size gives plenty of room.
		const shadowSize = this.dotRadius * 4; 
		const canvasSize = (this.dotRadius * 2) + (shadowSize * 2);
		canvas.width = canvasSize;
		canvas.height = canvasSize;

		const ctx = canvas.getContext('2d')!;
		const center = canvasSize / 2;

		ctx.fillStyle = this.color;
		ctx.shadowColor = this.color;
		ctx.shadowBlur = shadowSize;

		ctx.beginPath();
		ctx.arc(center, center, this.dotRadius, 0, Math.PI * 2);
		ctx.fill();
		
		return canvas;
	}

	redraw() {
		const ctx = this.ctx;
		const rad = this.dotRadius + DOT_PAD / 2;
		const step = rad * 2;
		const dotImageSize = this.dotOnCanvas.width;
		// ✅ FIX: Correctly calculate the offset to center the cached dot image.
		// The cached image's center needs to align with the grid cell's center.
		const offset = rad - (dotImageSize / 2);

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// ✅ FIX: Re-introduce the two-pass system for a better look.
		// Pass 1: Draw all "off" dots directly. This is fast and looks clean.
		ctx.shadowBlur = 0;
		ctx.fillStyle = '#222';
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.visibleWidth; x++) {
				const dx = x * step + OUT_PAD;
				const dy = y * step + OUT_PAD;
				ctx.beginPath();
				ctx.arc(dx + rad, dy + rad, this.dotRadius, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Pass 2: Stamp the pre-rendered "on" dots where needed.
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.visibleWidth; x++) {
				const bufferX = (x + Math.floor(this.scrollPos)) % this.bufferWidth;
				const idx = bufferX + y * this.bufferWidth;

				if (this.mat[idx]) {
					const dx = x * step + OUT_PAD + offset;
					const dy = y * step + OUT_PAD + offset;
					ctx.drawImage(this.dotOnCanvas, dx, dy);
				}
			}
		}
	}
}