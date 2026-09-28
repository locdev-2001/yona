import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import type { ComponentType, ReactNode } from 'react';

import Layout from './components/Layout';

const pages = import.meta.glob<{ default: PageComponent }>([
    './pages/*.tsx',
    './resource/*.tsx',
    // Test đặt cạnh trang; không loại thì mỗi file test thành một chunk trong bản build.
    '!./**/*.test.tsx',
]);

type PageComponent = ComponentType & {
    layout?: ((page: ReactNode) => ReactNode) | null;
};

// Tên page Inertia của khu này luôn bắt đầu bằng `superadmin/`; trang nào tự
// khai báo `layout = null` (màn đăng nhập) thì không bọc khung điều hướng.
const resolvePage = async (name: string) => {
    const path = name.replace(/^superadmin\//, '');
    const importPage = pages[`./pages/${path}.tsx`] ?? pages[`./${path}.tsx`];

    if (!importPage) {
        throw new Error(`Page not found: ${name}`);
    }

    const page = await importPage();

    if (page.default.layout === undefined) {
        page.default.layout = renderedPage => <Layout>{renderedPage}</Layout>;
    }

    return page;
};

createInertiaApp({
    title: title => (title ? `${title} - Yona` : 'Yona'),
    resolve: resolvePage,
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#1f93ff' },
});
