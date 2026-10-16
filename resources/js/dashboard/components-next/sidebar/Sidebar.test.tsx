import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ url: '/app/accounts/2/dashboard' }));
const pageProps = vi.hoisted(() => ({
    auth: { user: { id: 1, ui_settings: {} as Record<string, unknown> } },
    currentAccount: { id: 2, features: {} },
    currentAccountUser: { role: 'administrator' as 'administrator' | 'agent' },
    inboxes: [] as Array<{ id: number; name: string; channel_type: string }>,
    teams: [],
}));
const inboxUnreadCounts = vi.hoisted(() => ({ current: {} as Record<string, number> }));
const renderedGroups = vi.hoisted(() => [] as Array<{ name: string; badgeCount?: number; children?: unknown[] }>);
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: page.url, props: pageProps }),
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('dashboard/composables/useLabelsList', () => ({ useLabelsList: () => [] }));
vi.mock('dashboard/composables/useCustomViews', () => ({ useCustomViews: () => [] }));
vi.mock('./useConversationUnreadCounts', () => ({
    useConversationUnreadCounts: () => ({ allCount: 0, inboxes: {}, labels: {}, teams: {} }),
}));
vi.mock('dashboard/notifications/useUnreadCount', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/notifications/useUnreadCount')>()),
    useNotificationsUnreadInboxCounts: () => inboxUnreadCounts.current,
}));
vi.mock('./SidebarGroup', () => ({
    default: (props: { name: string; badgeCount?: number; children?: unknown[] }) => {
        renderedGroups.push(props);
        return null;
    },
}));
vi.mock('./SidebarProfileMenu', () => ({ default: () => null }));
vi.mock('./SidebarAccountSwitcher', () => ({ default: () => null }));
vi.mock('dashboard/components-next/icon/Logo', () => ({ default: () => null }));

import Sidebar from './Sidebar';

function topRowControls(container: HTMLElement) {
    const bell = container.querySelector<HTMLElement>('[data-test-id="notification-bell"]');
    const search = container.querySelector<HTMLElement>('a[href$="/search"]');

    return { bell, search };
}

const SETTINGS_URL = '/app/accounts/2/settings/agents/list';

function renderSidebar() {
    renderedGroups.length = 0;
    return render(<Sidebar onCloseMobileSidebar={() => undefined} />);
}

// jsdom không dàn trang, nên khoá hợp đồng co giãn bằng class: chỉ ô tìm kiếm được
// co, chuông giữ cỡ cố định. Hàng đầu đầy đủ chỉ còn ở trang Cài đặt.
describe('hàng đầu sidebar mở rộng (trang Cài đặt)', () => {
    beforeEach(() => {
        page.url = SETTINGS_URL;
        pageProps.auth.user.ui_settings = {};
    });

    it('chuông không co, cỡ 32×28; ô tìm kiếm co thay; không còn nút soạn', () => {
        const { container } = renderSidebar();
        const { bell, search } = topRowControls(container);

        expect(bell?.className).toContain('flex-shrink-0');
        expect(bell?.className).toContain('h-7 w-8');
        expect(container.querySelector('.i-lucide-pen-line')).toBeNull();
        expect(search?.className).toContain('min-w-0');
        expect(search?.className).not.toContain('flex-shrink-0');
    });

    // Hàng là grid item: thiếu min-w-0 thì track lấy bề rộng tối thiểu của chữ gợi ý
    // (không xuống dòng) nên chữ gợi ý đẩy hàng tràn khỏi sidebar 200px.
    it('hàng tìm kiếm được co theo sidebar thay vì theo chữ gợi ý', () => {
        const { container } = renderSidebar();
        const { search } = topRowControls(container);

        expect(search?.parentElement?.className).toContain('min-w-0');
    });
});

describe('rail điều hướng từ 768px', () => {
    beforeEach(() => {
        page.url = '/app/accounts/2/conversations/540?inbox=5';
        pageProps.auth.user.ui_settings = { sidebar_width: 280 };
        pageProps.currentAccountUser.role = 'administrator';
    });

    it('trang hộp thư: rail 56px nền navy, không kéo giãn được dù đã lưu bề rộng lớn', () => {
        const { container } = renderSidebar();
        const aside = container.querySelector('aside')!;

        expect(aside.style.width).toBe('56px');
        expect(aside.className).toContain('bg-n-surface-rail');
        expect(container.querySelector('.cursor-col-resize')).toBeNull();
        expect(topRowControls(container).bell?.className).toContain('size-8');
    });

    it.each([
        { role: 'administrator' as const, groups: ['Conversation', 'Contacts', 'Reports', 'Settings'] },
        { role: 'agent' as const, groups: ['Conversation', 'Contacts', 'Settings'] },
    ])('$role thấy $groups.length icon, Cài đặt dời xuống đáy cạnh hồ sơ', ({ role, groups }) => {
        pageProps.currentAccountUser.role = role;
        const { container } = renderSidebar();

        expect(renderedGroups.map(group => group.name)).toEqual(groups);
        expect(container.querySelector('nav')?.nextElementSibling?.querySelector('ul')).not.toBeNull();
    });

    it('trang Cài đặt: mở rộng theo bề rộng đã lưu và kéo giãn được', () => {
        page.url = SETTINGS_URL;
        const { container } = renderSidebar();
        const aside = container.querySelector('aside')!;

        expect(aside.style.width).toBe('280px');
        expect(aside.className).toContain('bg-n-surface-sidebar');
        expect(container.querySelector('.cursor-col-resize')).not.toBeNull();
    });

    it('trang Cài đặt đã thu gọn: vẫn là rail nhưng còn tay nắm để mở lại', () => {
        page.url = SETTINGS_URL;
        pageProps.auth.user.ui_settings = { sidebar_width: 56 };
        const { container } = renderSidebar();

        expect(container.querySelector('aside')?.style.width).toBe('56px');
        expect(container.querySelector('.cursor-col-resize')).not.toBeNull();
    });
});

describe('badge chưa đọc của Hộp thư', () => {
    it('là tổng số trên chuông của mọi kênh, kể cả khi cờ bộ đếm sidebar đang tắt', () => {
        page.url = '/app/accounts/2/dashboard';
        pageProps.inboxes = [
            { id: 7, name: 'Zalo A', channel_type: 'Channel::ZaloPersonal' },
            { id: 8, name: 'Zalo B', channel_type: 'Channel::ZaloPersonal' },
        ];
        inboxUnreadCounts.current = { '7': 1, '8': 3 };

        renderSidebar();

        const conversation = renderedGroups.find(group => group.name === 'Conversation');
        expect(conversation?.badgeCount).toBe(4);
        expect(conversation?.children?.some(child => (child as { name: string }).name === 'Channels')).toBe(false);

        pageProps.inboxes = [];
        inboxUnreadCounts.current = {};
    });
});
