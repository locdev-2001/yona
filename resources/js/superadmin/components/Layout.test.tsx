import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { installDomStubs } from './__fixtures__/dom';
import { superAdminProps } from './__fixtures__/superAdmin';

let pageProps: Record<string, unknown> = {};
let pageUrl = '/admin';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: unknown }) => (
        <a href={href} {...rest}>
            {children as never}
        </a>
    ),
    router: { visit: vi.fn() },
    usePage: () => ({ props: pageProps, url: pageUrl }),
}));

// Layout nằm trong entry của console: nạp bộ i18n ở đây là mọi trang, kể cả
// trang đăng nhập, phải tải thêm cả bộ chuỗi của dashboard.
vi.mock('../../i18n', () => {
    throw new Error('Layout Super Admin không được nạp bộ i18n');
});

import Layout from './Layout';

function visitPage(url: string) {
    pageUrl = url;
    const path = url.split('?')[0];
    pageProps = { superAdmin: superAdminProps({ currentPath: path, currentUrl: url }) };
}

function sidebar(): HTMLElement {
    return document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
}

describe('Layout Super Admin', () => {
    beforeEach(() => {
        installDomStubs();
        document.cookie = 'sidebar_state=; max-age=0; path=/';
        visitPage('/admin/accounts/5');
    });

    it('vẽ thanh bên theo nhóm chức năng, đánh dấu mục đang mở theo tiền tố đường dẫn', () => {
        render(<Layout>nội dung</Layout>);

        const nav = within(sidebar());
        expect(nav.getByText('Khách hàng')).toBeInTheDocument();
        expect(nav.getByText('Kênh & hệ thống')).toBeInTheDocument();

        const accounts = nav.getByRole('link', { name: 'Tài khoản' });
        expect(accounts).toHaveAttribute('href', '/admin/accounts');
        expect(accounts).toHaveAttribute('data-active');
        expect(nav.getByRole('link', { name: 'Bảng điều khiển' })).not.toHaveAttribute('data-active');
        expect(screen.getByText('nội dung')).toBeInTheDocument();
    });

    it('vụn bánh mì theo nhóm và trang đang mở', () => {
        render(<Layout>x</Layout>);

        const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' });
        expect(within(breadcrumb).getByText('Khách hàng')).toBeInTheDocument();
        expect(within(breadcrumb).getByText('Tài khoản')).toHaveAttribute('aria-current', 'page');
    });

    it('mục công cụ bên ngoài mở tab mới', () => {
        render(<Layout>x</Layout>);

        const horizon = within(sidebar()).getByRole('link', { name: /Hàng đợi \(Horizon\)/ });
        expect(horizon).toHaveAttribute('href', '/horizon');
        expect(horizon).toHaveAttribute('target', '_blank');
        expect(horizon).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('mục có trang con (cấu hình ứng dụng) mở sẵn và khớp cả query', () => {
        visitPage('/admin/app_config?config=email');

        render(<Layout>x</Layout>);

        const nav = within(sidebar());
        expect(nav.getByRole('link', { name: 'Email' })).toHaveAttribute('data-active');
        expect(nav.getByRole('link', { name: 'General' })).not.toHaveAttribute('data-active');
    });

    it('thu gọn thanh bên về dải icon và nhớ trạng thái', () => {
        render(<Layout>x</Layout>);

        expect(sidebar()).toHaveAttribute('data-state', 'expanded');
        fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));

        expect(sidebar()).toHaveAttribute('data-state', 'collapsed');
        expect(document.cookie).toContain('sidebar_state=false');
    });

    it('nút menu trên điện thoại mở ngăn điều hướng', () => {
        installDomStubs({ width: 390 });
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));

        const sheet = screen.getByRole('dialog');
        expect(within(sheet).getByRole('link', { name: 'Người dùng' })).toHaveAttribute('href', '/admin/users');
    });

    it('Ctrl+K hoặc nút tìm kiếm mở bảng lệnh', () => {
        render(<Layout>x</Layout>);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('nút tìm kiếm trên thanh trên mở bảng lệnh', () => {
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

        expect(screen.getByPlaceholderText('Nhập tên trang…')).toBeInTheDocument();
    });

    it('menu người dùng có tên, email, về trang làm việc và đăng xuất', () => {
        render(<Layout>x</Layout>);

        fireEvent.click(screen.getByRole('button', { name: 'Tài khoản quản trị' }));

        const menu = screen.getByRole('menu');
        expect(within(menu).getByText('loc@yona.vn')).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'back_to_app' })).toHaveAttribute('href', '/');
        expect(within(menu).getByRole('menuitem', { name: 'Đăng xuất' })).toHaveAttribute('href', '/admin/logout');
    });

    it('hiện thông báo flash từ máy chủ thành toast', async () => {
        pageProps = { ...pageProps, flash: { notice: 'Đã lưu', error: null } };

        render(<Layout>x</Layout>);

        expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
    });
});
