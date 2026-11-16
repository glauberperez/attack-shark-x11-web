import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	base: './',
	plugins: [react()],
	resolve: {
		alias: [
			{ find: 'node-hid', replacement: r('./src/shims/node-hid.ts') },
			{ find: 'node:events', replacement: 'events' },
			{ find: 'node:buffer', replacement: 'buffer' },
		],
	},
	build: { target: 'es2022' },
});
