import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
    url: '/app/accounts/2/dashboard',
    props: {
        currentAccount: { id: 2, features: {} },
        currentAccountUser: { role: 'administrator' as 'administrator' | 'agent' },
    },
}));
vi.mock('@inertiajs/react', () => ({
    usePage: () => page,
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const getJson = vi.hoisted(() => vi.fn());
vi.mock('dashboard/helper/apiClient', () => ({ getJson }));

import { bindUnreadCount, resetUnreadCount } from 'dashboard/notifications/useUnreadCount';
import { buildMenuItems } from './menuItems';
import MobileTabBar, { buildMobileTabs, isMobileTabActive } from './MobileTabBar';
import { filterMenuByRole } from './permissions';

async function renderTabBar({ unreadCount = 0, isMobileSidebarOpen = false, onToggleSidebar = () => undefined } = {}) {
    getJson.mockResolvedValue({ unread_count: unreadCount, unread_inbox_counts: {} });
    const view = render(<MobileTabBar isMobileSidebarOpen={isMobileSidebarOpen} onToggleSidebar={onToggleSidebar} />);
    await act(async () => {
        bindUnreadCount(2);
        await Promise.resolve();
    });
    return view;
}

const tabLabels = () => screen.getAllByRole('link').map(link => link.textContent);

describe('thanh tab dưới của điện thoại', () => {
    beforeEach(() => {
        resetUnreadCount();
        page.url = '/app/accounts/2/dashboard';
        page.props.currentAccountUser.role = 'administrator';
    });

    afterEach(() => resetUnreadCount());

    it('quản trị viên thấy đủ bốn nhóm theo thứ tự của điều hướng máy tính', async () => {
        await renderTabBar();

        expect(tabLabels()).toEqual(['Inbox', 'Customers', 'Reports', 'Settings']);
    });

    it('nhân viên không thấy Báo cáo', async () => {
        page.props.currentAccountUser.role = 'agent';

        await renderTabBar();

        expect(tabLabels()).toEqual(['Inbox', 'Customers', 'Settings']);
    });

    it('tab Hộp thư mang số hội thoại chưa đọc, không có thì không hiện', async () => {
        const { container, unmount } = await renderTabBar({ unreadCount: 7 });
        expect(screen.getByLabelText('7 unread conversations').textContent).toBe('7');
        unmount();

        resetUnreadCount();
        await renderTabBar({ unreadCount: 0 });
        expect(container.querySelector('[aria-label$="unread conversations"]')).toBeNull();
    });

    it('số quá 99 thì rút gọn', async () => {
        await renderTabBar({ unreadCount: 240 });

        expect(screen.getByLabelText('240 unread conversations').textContent).toBe('99+');
    });

    it('đánh dấu tab của trang đang mở, kể cả trang con và danh sách lọc theo kênh', async () => {
        page.url = '/app/accounts/2/conversations?inbox=25';
        await renderTabBar();

        expect(screen.getByRole('link', { current: 'page' }).textContent).toContain('Inbox');
    });

    it('ô Thêm mở và đóng ngăn kéo sidebar', async () => {
        const onToggleSidebar = vi.fn();
        await renderTabBar({ onToggleSidebar });

        const launcher = screen.getByRole('button', { name: 'More' });
        expect(launcher.id).toBe('mobile-sidebar-launcher');
        fireEvent.click(launcher);

        expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });
});

describe('dựng tab từ menu sidebar', () => {
    const adminTabs = () => buildMobileTabs(filterMenuByRole(buildMenuItems(2), 'administrator'));

    it('mỗi tab đi tới mục con đầu tiên được phép của nhóm', () => {
        const hrefs = Object.fromEntries(adminTabs().map(tab => [tab.name, tab.href]));

        expect(hrefs.Conversation).toBe('/app/accounts/2/dashboard');
        expect(hrefs.Contacts).toBe('/app/accounts/2/contacts');
        expect(hrefs.Reports).toBe('/app/accounts/2/reports/overview');
    });

    it('trang con của nhóm vẫn sáng đúng tab, đường dẫn trùng tiền tố thì không', () => {
        const [inbox, contacts, , settings] = adminTabs();

        expect(isMobileTabActive(inbox, '/app/accounts/2/conversations/159')).toBe(true);
        expect(isMobileTabActive(contacts, '/app/accounts/2/contacts/12')).toBe(true);
        expect(isMobileTabActive(contacts, '/app/accounts/2/conversations')).toBe(false);
        expect(isMobileTabActive(settings, '/app/accounts/2/settings/inboxes/5/edit')).toBe(true);
    });
});
