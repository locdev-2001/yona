import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { QueryClientProvider } from '@tanstack/react-query';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';
import { queryClient } from './lib/query-client';

declare global {
    const route: typeof routeFn;
    // Echo is attached to window so modules can use window.Echo directly.
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// F11: Reverb realtime bootstrap — shared infrastructure, done once here.
// Modules only need to subscribe to channels; they never re-init Echo.
// laravel-echo + pusher-js added as required peer deps (realtime is not
// achievable without them; no stdlib/platform alternative exists).
window.Pusher = Pusher;
window.Echo = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
});

const appPages = import.meta.glob('./pages/**/*.tsx');

function resolvePage(name: string) {
    return resolvePageComponent(`./pages/${name}.tsx`, appPages);
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: resolvePage,
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <QueryClientProvider client={queryClient}>
                <App {...props} />
            </QueryClientProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
