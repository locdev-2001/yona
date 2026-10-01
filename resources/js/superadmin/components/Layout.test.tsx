import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { superAdminProps } from './__fixtures__/superAdmin';

let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: unknown }) => (
        <a href={href} {...rest}>
            {children as never}
        </a>
    ),
    router: { visit: vi.fn() },
    usePage: () => ({ props: pageProps }),
}));

// Layout nằm trong entry của console: nạp bộ i18n ở đây là mọi trang, kể cả
// trang đăng nhập, phải tải thêm cả bộ chuỗi của dashboard.
vi.mock('../../i18n', () => {
    throw new Error('Layout Super Admin không được nạp bộ i18n');
});

import Layout from './Layout';

describe('Layout Super Admin', () => {
    beforeEach(() => {
        window.localStorage.clear();
        pageProps = { superAdmin: superAdminProps({ currentPath: '/admin/accounts/5', currentUrl: '/admin/accounts/5' }) };
    });

    it('vẽ thanh bên theo nhóm chức năng, đánh dấu mục đang mở theo tiền tố đường dẫn', () => {
        render(<Layout>nội dung</Layout>);

        const nav = screen.getByRole('navigation', { name: 'Điều hướng' });
        expect(within(nav).getByText('Khách hàng')).toBeInTheDocument();
        expect(within(nav).getByText('Kênh & hệ thống')).toBeInTheDocument();

        const accounts = within(nav).getByRole('link', { name: 'Tài khoản' });
        expect(accounts).toHaveAttribute('href', '/admin/accounts');
        expect(accounts).toHaveAttribute('aria-current', 'page');
        expect(within(nav).getByRole('link', { name: 'Bảng điều khiển' })).not.toHaveAttribute('aria-current');
        expect(screen.getByText('nội dung')).toBeInTheDocument();
    });

    it('mục công cụ bên ngoài mở tab mới', () => {
        render(<Layout>x</Layout>);

        const horizon = screen.getByRole('link', { name: /Hàng đợi \(Horizon\)/ });
        expect(horizon).toHaveAttribute('href', '/horizon');
        expect(horizon).toHaveAttribute('target', '_blank');
        expect(horizon).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('mục có trang con (cấu hình ứng dụng) mở sẵn và khớp cả query', () => {
        pageProps = {
            superAdmin: superAdminProps({ currentPath: '/admin/app_config', currentUrl: '/admin/app_config?config=email' }),
        };

        render(<Layout>x</Layout>);

        expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute('aria-current');
    });

    it('thu gọn thanh bên và nhớ trạng thái', () => {
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'collapse_sidebar' }));

        expect(window.localStorage.getItem('yona.admin.sidebarCollapsed')).toBe('1');
        expect(screen.getByRole('button', { name: 'expand_sidebar' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('nút menu trên điện thoại mở ngăn điều hướng', () => {
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));

        const sheet = screen.getByRole('dialog', { name: 'Điều hướng' });
        expect(within(sheet).getByRole('link', { name: 'Người dùng' })).toBeInTheDocument();
    });

    it('Ctrl+K mở bảng lệnh', () => {
        render(<Layout>x</Layout>);

        expect(screen.queryByRole('dialog', { name: 'Bảng lệnh' })).not.toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

        expect(screen.getByRole('dialog', { name: 'Bảng lệnh' })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('menu người dùng có tên, email và đăng xuất', () => {
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'Tài khoản quản trị' }));

        const menu = screen.getByRole('menu');
        expect(within(menu).getByText('loc@yona.vn')).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Đăng xuất' })).toHaveAttribute('href', '/admin/logout');
    });

    it('hiện thông báo flash từ máy chủ', () => {
        pageProps = { ...pageProps, flash: { notice: 'Đã lưu', error: null } };

        render(<Layout>x</Layout>);

        expect(screen.getByText('Đã lưu')).toBeInTheDocument();
    });
});
