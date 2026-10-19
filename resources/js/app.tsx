import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

import { SERVICE_WORKER_URL } from './dashboard/helper/pushHelper';
import { documentTitle } from './documentTitle';

const pages = import.meta.glob([
    './v3/views/**/*.tsx',
    './chat/*.tsx',
    './dashboard/*.tsx',
    './dashboard/onboarding/*.tsx',
    './dashboard/settings/**/*.tsx',
    './dashboard/campaigns/*.tsx',
    './dashboard/contacts/*.tsx',
    './dashboard/helpcenter/pages/*.tsx',
    './dashboard/conversation/*.tsx',
    './dashboard/notifications/*.tsx',
    './dashboard/reports/*.tsx',
    './dashboard/search/*.tsx',
    // Test đặt cạnh trang; không loại thì mỗi file test thành một chunk trong bản build.
    '!./**/*.test.tsx',
]);

createInertiaApp({
    title: documentTitle,
    resolve: name => {
        const importPage = pages[`./${name}.tsx`];
        if (!importPage) {
            throw new Error(`Page not found: ${name}`);
        }
        return importPage();
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#2781F6',
    },
});

// Đăng ký service worker ngay khi vào app để trình duyệt cho cài như ứng dụng
// (PWA); cùng tệp phục vụ Web Push nên đăng ký lặp lại không tạo bản thứ hai.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => undefined);
    });
}
