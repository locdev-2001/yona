// Module graph thật của từng entry, đo bằng Rollup (xem scripts/check-css-surfaces.mjs).
// Sửa danh sách này khi thêm import xuyên bề mặt; `npm run check:css` sẽ fail nếu quên.
module.exports = {
    widget: {
        entries: ['resources/js/widget/main.tsx'],
        content: [
            './resources/js/widget/**/*.{ts,tsx}',
            './resources/js/shared/**/*.{ts,tsx}',
            './resources/js/i18n/**/*.{ts,tsx}',
            './resources/js/sdk/**/*.{ts,tsx}',
            './resources/js/dashboard/components-next/avatar/Avatar.tsx',
            './resources/js/dashboard/components-next/icon/Icon.tsx',
            './resources/views/widget.blade.php',
        ],
    },
    survey: {
        entries: ['resources/js/survey/main.tsx'],
        content: [
            './resources/js/survey/**/*.{ts,tsx}',
            './resources/js/shared/**/*.{ts,tsx}',
            './resources/js/i18n/**/*.{ts,tsx}',
            './resources/views/survey.blade.php',
        ],
    },
    portal: {
        entries: ['resources/js/portal/main.ts'],
        content: [
            './resources/js/portal/**/*.{ts,tsx}',
            './resources/js/shared/**/*.{ts,tsx}',
            './resources/views/public/**/*.blade.php',
        ],
    },
    superadmin: {
        entries: ['resources/js/superadmin/main.tsx'],
        content: [
            './resources/js/superadmin/**/*.{ts,tsx}',
            './resources/js/shared/**/*.{ts,tsx}',
            './resources/views/superadmin.blade.php',
            './resources/views/superadmin_auth.blade.php',
        ],
    },
    // v3.scss chỉ phục vụ trang auth (`app.blade.php` khi component bắt đầu bằng
    // `v3/`), nên nó không cần utility của cả dashboard dù dùng chung app.tsx.
    v3: {
        entries: ['resources/js/v3/views/**/*.tsx'],
        content: [
            './resources/js/v3/**/*.{ts,tsx}',
            './resources/js/shared/**/*.{ts,tsx}',
            './resources/js/i18n/**/*.{ts,tsx}',
            './resources/js/dashboard/components-next/button/Button.tsx',
            './resources/js/dashboard/components-next/dialog/Dialog.tsx',
            './resources/js/dashboard/components-next/icon/Icon.tsx',
            './resources/js/dashboard/components-next/spinner/Spinner.tsx',
            './resources/js/dashboard/components/auth/**/*.{ts,tsx}',
            './resources/views/app.blade.php',
        ],
    },
};
