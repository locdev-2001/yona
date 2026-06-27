import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: [
                'resources/**',
                'modules/*/resources/**',
            ],
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            // @modules/sample/... → modules/sample/... (asset imports in module pages)
            '@modules': path.resolve(__dirname, 'modules'),
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
    // Dev server config that works both on the host and inside the Docker `node`
    // container. In Docker: bind all interfaces so Docker can forward :5173, but
    // advertise `localhost` (the host-reachable name) in the hot file + HMR — the
    // container's [::1]/127.0.0.1 are not reachable from the host browser.
    // Polling only when running inside Docker (set VITE_USE_POLLING=true in the
    // container). On native Windows host, OS file events work fine.
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'localhost',
        },
        watch: {
            usePolling: process.env.VITE_USE_POLLING === 'true',
            ignored: [
                '**/node_modules/**',
                '**/vendor/**',
                '**/storage/**',
                '**/.git/**',
                '**/public/build/**',
                '**/bootstrap/cache/**',
            ],
        },
    },
});