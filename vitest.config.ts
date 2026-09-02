import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            dashboard: path.resolve(__dirname, 'resources/js/dashboard'),
            shared: path.resolve(__dirname, 'resources/js/shared'),
            v3: path.resolve(__dirname, 'resources/js/v3'),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['resources/js/**/*.test.{ts,tsx}'],
        setupFiles: ['resources/js/test-setup.ts'],
    },
});
