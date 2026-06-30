import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';

export default defineConfig({
	plugins: [
		sveltekit(),
		glsl()
	],
	resolve: {
		alias: {
			'three/addons': 'three/examples/jsm',
			'$components': path.resolve('./src/components'),
			'$utils': path.resolve('./src/lib/utils')
		}
	},
	server: {
  host: '127.0.0.1',
  port: 5173,
  proxy: {
    '/video-proxy': {
      target: 'https://videos.taborspark.co.uk',
      changeOrigin: true,
      secure: true,
      // 🔥 ADD THIS: Strips /video-proxy → /taborsparkvideos/...
      rewrite: (path) => path.replace(/^\/video-proxy/, '')
    }
  },
  fs: {
    allow: ['src/assets']
  },
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  }
}
});
