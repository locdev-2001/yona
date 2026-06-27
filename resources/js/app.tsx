import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { QueryClientProvider } from '@tanstack/react-query';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';
import { moduleToKebab } from './lib/module-kebab';
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

// App pages (GĐ0 monolith pages) — unchanged glob.
const appPages = import.meta.glob('./pages/**/*.tsx');

// Module pages — keyed by full path, resolved via prefix Modules.{Module}.{Page}.
// ponytail: glob outside resources/ works in Vite via relative path from this file.
// Build bundles ALL module pages regardless of enabled flag (build-time doesn't know
// runtime enabled state). Disabled module → its routes 404 before resolver is called.
const modulePages = import.meta.glob('../../modules/*/resources/js/pages/**/*.tsx');

/**
 * Resolve an Inertia page component.
 *
 * Routing:
 *   name = 'dashboard'                    → app page ./pages/dashboard.tsx
 *   name = 'Modules.Sample.sample/index'  → module page modules/sample/.../sample/index.tsx
 *
 * The Modules.{Module}.{Page} prefix is mandatory to prevent collision between
 * an app page and a module page sharing the same basename (e.g. both named
 * 'sample/index').
 */
function resolvePage(name: string) {
    if (name.startsWith('Modules.')) {
        // 'Modules.Sample.sample/index' → module='Sample', page='sample/index'
        const withoutPrefix = name.slice('Modules.'.length);
        const dotIdx = withoutPrefix.indexOf('.');
        const module = withoutPrefix.slice(0, dotIdx); // 'Sample'
        const page = withoutPrefix.slice(dotIdx + 1); // 'sample/index'
        const kebab = moduleToKebab(module);
        const key = `../../modules/${kebab}/resources/js/pages/${page}.tsx`;

        if (!(key in modulePages)) {
            throw new Error(`Module page not found: [${name}]. Looked up key: [${key}]`);
        }

        return (modulePages[key] as () => Promise<{ default: unknown }>)();
    }

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
