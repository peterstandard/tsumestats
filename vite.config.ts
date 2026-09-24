import process from 'node:process';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html', strict: false }),
			paths: {
				base: (process.env.BASE_PATH as `/${string}` | undefined) || ''
			}
		})
	],
	server: {
		proxy: {
			'/api/tsumego': {
				target: 'https://tsumego.com',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/tsumego/, ''),
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				}
			}
		}
	}
});
