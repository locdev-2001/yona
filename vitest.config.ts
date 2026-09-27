import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteAliases } from './vite.aliases.js';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: viteAliases(__dirname),
    },
    test: {
        environment: 'jsdom',
        // jsdom mặc định chạy ở about:blank — origin mờ, nên localStorage/sessionStorage
        // là undefined và mọi test đụng tới chúng nổ TypeError. Đặt URL thật để có origin.
        environmentOptions: { jsdom: { url: 'http://localhost' } },
        include: ['resources/js/**/*.test.{ts,tsx}'],
        setupFiles: ['resources/js/test-setup.ts'],
    },
});
