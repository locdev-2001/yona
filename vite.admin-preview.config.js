import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { viteAliases } from './vite.aliases.js';

export default defineConfig({
    cacheDir: 'node_modules/.vite-admin-preview',
    plugins: [react()],
    resolve: { alias: viteAliases(import.meta.dirname) },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: { host: '127.0.0.1', port: 8620, strictPort: true, open: false },
    build: {
        outDir: 'dist/admin-preview',
        rollupOptions: { input: ['design/admin-preview/index.html', 'design/admin-preview/cohort.html'] },
    },
});
