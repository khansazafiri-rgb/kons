// Konfigurasi Vite untuk deployment mandiri (VPS), tanpa tooling builder Horizons.
// Versi lama (dengan plugin visual-editor & error-handler iframe Horizons) masih
// ada di git history kalau suatu saat dibutuhkan lagi.
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		// Saat development lokal, request /api dan /_ diteruskan ke PocketBase
		// sehingga VITE_POCKETBASE_URL cukup "/" (same-origin, tanpa CORS).
		proxy: {
			'/api': 'http://127.0.0.1:8090',
			'/_': 'http://127.0.0.1:8090',
		},
	},
	resolve: {
		extensions: ['.jsx', '.js', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
