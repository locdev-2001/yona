import path from 'node:path';

// Bảng alias duy nhất cho vite.config.js, vitest.config.ts và scripts/check-css-surfaces.mjs:
// khai ở một chỗ thì build, test và gate CSS cùng giải được import.
export function viteAliases(projectRoot) {
    return {
        dashboard: path.resolve(projectRoot, 'resources/js/dashboard'),
        shared: path.resolve(projectRoot, 'resources/js/shared'),
        v3: path.resolve(projectRoot, 'resources/js/v3'),
        // Gói không khai `exports` cho tệp wasm nên trỏ thẳng vào dist.
        'thorvg-dist': path.resolve(projectRoot, 'node_modules/@thorvg/lottie-player/dist'),
    };
}
