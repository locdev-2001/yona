import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    // Dev server config that works both on the host and inside the Docker `node`
    // container. In Docker: bind all interfaces so Docker can forward :5173, but
    // advertise `localhost` (the host-reachable name) in the hot file + HMR — the
    // container's [::1]/127.0.0.1 are not reachable from the host browser.
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'localhost',
        },
        // Windows bind mounts don't emit inotify events; poll so HMR sees edits.
        watch: {
            usePolling: true,
        },
    },
});