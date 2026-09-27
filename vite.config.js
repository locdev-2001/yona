import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

import { thorvgWithoutCdnFallback } from './resources/js/shared/sticker/thorvgBuildPlugin.ts';
import { viteAliases } from './vite.aliases.js';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/scss/app.scss',
                'resources/scss/v3.scss',
                'resources/js/app.tsx',
                'resources/scss/widget.scss',
                'resources/js/widget/main.tsx',
                'resources/scss/survey.scss',
                'resources/js/survey/main.tsx',
                'resources/scss/flows.scss',
                'resources/js/flows/main.tsx',
                'resources/scss/portal.scss',
                'resources/js/portal/main.ts',
                'resources/scss/superadmin.scss',
                'resources/scss/superadmin-auth.scss',
                'resources/js/superadmin/main.tsx',
                'resources/css/landing.css',
                'resources/js/landing/main.tsx',
            ],
            refresh: true,
        }),
        react(),
        thorvgWithoutCdnFallback(),
    ],
    resolve: {
        alias: viteAliases(__dirname),
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**', '**/refs/**', '**/vendor/**'],
        },
    },
});
