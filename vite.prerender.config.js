import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        ssr: 'resources/js/landing/prerender.tsx',
        outDir: 'storage/framework/landing-prerender',
        emptyOutDir: true,
        rollupOptions: {
            output: { entryFileNames: 'render.mjs' },
        },
    },
});
