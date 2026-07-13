// CATATAN: vite.config.js tidak ikut ter-export di dokumen code — file ini
// dibuat ulang seperlunya (plugin React + alias "@" ke src). Kalau projectmu
// di Horizons sudah punya vite.config.js sendiri, PERTAHANKAN versimu.
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
 plugins: [react()],
 resolve: {
   alias: {
     '@': path.resolve(__dirname, './src'),
   },
 },
});
