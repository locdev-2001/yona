// Module graph thật của từng entry, đo bằng Rollup (xem scripts/check-css-surfaces.mjs).
// Glob theo thư mục (một component, một nhóm hook) chứ không theo file lẻ, để thêm
// file cạnh file đã dùng không làm lệch; `npm run check:css` fail nếu import vượt ra ngoài.
const sourcesIn = directory => `./resources/js/${directory}/**/*.{ts,tsx}`;

const SHARED = [sourcesIn('shared'), sourcesIn('i18n')];

// Khối dựng giao diện của dashboard mà các bề mặt khác mượn lại. Thư mục icon/ và
// helper/ chỉ lấy đúng file dùng: phần còn lại kéo theo cả bộ icon (~35-40 KB CSS).
const DASHBOARD_PRIMITIVES = [
    sourcesIn('dashboard/components-next/{avatar,button,dialog,inline-input,input,spinner}'),
    './resources/js/dashboard/components-next/icon/{Icon,PlatformLogo}.tsx',
    sourcesIn('dashboard/composables'),
    './resources/js/dashboard/components/Modal.tsx',
];

module.exports = {
    widget: {
        entries: ['resources/js/widget/main.tsx'],
        content: [
            sourcesIn('widget'),
            sourcesIn('sdk'),
            ...SHARED,
            ...DASHBOARD_PRIMITIVES,
            sourcesIn('dashboard/components/widgets/conversation/components'),
            './resources/views/widget.blade.php',
        ],
    },
    survey: {
        entries: ['resources/js/survey/main.tsx'],
        content: [sourcesIn('survey'), ...SHARED, './resources/views/survey.blade.php'],
    },
    portal: {
        entries: ['resources/js/portal/main.ts'],
        content: [sourcesIn('portal'), sourcesIn('shared'), './resources/views/public/**/*.blade.php'],
    },
    // Console /admin chạy Tailwind 4: không có `content`, phạm vi quét là các dòng
    // `@source` trong file CSS dưới đây (check-css-surfaces.mjs đọc thẳng từ đó).
    superadmin: {
        entries: ['resources/js/superadmin/main.tsx'],
        css: 'resources/css/admin/app.css',
    },
    // v3.scss chỉ phục vụ trang auth (`app.blade.php` khi component bắt đầu bằng
    // `v3/`), nên nó không cần utility của cả dashboard dù dùng chung app.tsx. Trang
    // đăng nhập nạp trước mọi thứ khác nên giữ đúng từng file, không lấy cả khối dựng.
    v3: {
        entries: ['resources/js/v3/views/**/*.tsx'],
        content: [
            sourcesIn('v3'),
            ...SHARED,
            './resources/js/dashboard/components-next/button/Button.tsx',
            './resources/js/dashboard/components-next/dialog/Dialog.tsx',
            './resources/js/dashboard/components-next/icon/Icon.tsx',
            './resources/js/dashboard/components-next/spinner/Spinner.tsx',
            sourcesIn('dashboard/components/auth'),
            './resources/js/dashboard/composables/useAlert.ts',
            './resources/js/dashboard/helper/apiClient.ts',
            './resources/views/app.blade.php',
        ],
    },
};
