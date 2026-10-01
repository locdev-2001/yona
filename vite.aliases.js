import path from 'node:path';

// Bảng alias duy nhất cho vite.config.js, vitest.config.ts và scripts/check-css-surfaces.mjs:
// khai ở một chỗ thì build, test và gate CSS cùng giải được import.
export function viteAliases(projectRoot) {
    return {
        // Khối giao diện của console /admin (component shadcn, Tailwind 4).
        '@admin': path.resolve(projectRoot, 'resources/js/admin'),
        dashboard: path.resolve(projectRoot, 'resources/js/dashboard'),
        shared: path.resolve(projectRoot, 'resources/js/shared'),
        v3: path.resolve(projectRoot, 'resources/js/v3'),
        // Lõi xoá nền của renderer sticker chạy cả trong trình duyệt để xem trước đúng như bản dựng ở máy chủ.
        'sticker-renderer': path.resolve(projectRoot, 'services/sticker-renderer/src'),
    };
}
