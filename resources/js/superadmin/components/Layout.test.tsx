import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a>,
    usePage: () => ({ props: pageProps }),
}));

// Layout nằm trong entry của console: nạp bộ i18n ở đây là mọi trang, kể cả
// trang đăng nhập, phải tải thêm cả bộ chuỗi của dashboard.
vi.mock('../../i18n', () => {
    throw new Error('Layout Super Admin không được nạp bộ i18n');
});

import Layout from './Layout';

describe('Layout Super Admin', () => {
    it('mục menu công cụ lấy nhãn và đường dẫn từ máy chủ', () => {
        pageProps = {
            superAdmin: {
                installationName: 'Yona',
                logo: '/logo.svg',
                logoThumbnail: '/logo-thumb.svg',
                version: '1.0',
                navigation: [],
                toolPages: [{ key: 'sticker_packs', label: 'Kho sticker', url: '/admin/sticker_packs' }],
                settingsPages: [],
                currentPath: '/admin/sticker_packs',
            },
        };

        render(<Layout>nội dung</Layout>);

        const link = screen.getByRole('link', { name: 'Kho sticker' });
        expect(link.getAttribute('href')).toBe('/admin/sticker_packs');
        expect(link.className).toContain('text-woot-500');
    });
});
