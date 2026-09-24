import { defineConfig } from 'vite';
import path from 'node:path';

// Bundle SDK nhúng — IIFE độc lập, không qua manifest của Laravel Vite.
// Đường ra cố định `public/packs/js/sdk.js` vì đoạn script nhúng do backend sinh
// (WebWidget::web_widget_script) trỏ thẳng vào `BASE_URL + "/packs/js/sdk.js"`.
export default defineConfig({
    // outDir nằm trong public/ nên phải tắt publicDir, không thì vite chép public/ vào chính nó.
    publicDir: false,
    build: {
        outDir: path.resolve(import.meta.dirname, 'public/packs/js'),
        emptyOutDir: false,
        // BigInt literal trong fnv1a128 cần ES2020 trở lên.
        target: 'es2020',
        cssCodeSplit: false,
        lib: {
            entry: path.resolve(import.meta.dirname, 'resources/js/sdk/index.ts'),
            name: 'yonaSDKBundle',
            formats: ['iife'],
            fileName: () => 'sdk.js',
        },
    },
});
