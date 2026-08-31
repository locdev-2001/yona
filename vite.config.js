import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/scss/app.scss', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            dashboard: path.resolve(__dirname, 'resources/js/dashboard'),
            shared: path.resolve(__dirname, 'resources/js/shared'),
            v3: path.resolve(__dirname, 'resources/js/v3'),
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**', '**/refs/**', '**/vendor/**'],
        },
    },
});
