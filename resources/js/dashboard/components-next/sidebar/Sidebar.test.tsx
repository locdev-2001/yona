import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageProps = vi.hoisted(() => ({
    auth: { user: { id: 1, ui_settings: {} as Record<string, unknown> } },
    currentAccount: { id: 2, features: {} },
    currentAccountUser: { role: 'administrator' },
    inboxes: [] as Array<{ id: number; name: string; channel_type: string }>,
    teams: [],
}));
const inboxUnreadCounts = vi.hoisted(() => ({ current: {} as Record<string, number> }));
const renderedGroups = vi.hoisted(() => [] as Array<{ name: string; children?: unknown[] }>);
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: pageProps }),
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
    default: (props: { name: string; children?: unknown[] }) => {
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

// jsdom không dàn trang, nên khoá hợp đồng co giãn bằng class: chỉ ô tìm kiếm được
// co, chuông giữ cỡ cố định. Soạn hội thoại mới nằm cạnh ô tìm của danh sách hội thoại.
describe('hàng đầu sidebar: tìm kiếm, chuông', () => {
    beforeEach(() => {
        pageProps.auth.user.ui_settings = {};
    });

    it('sidebar mở rộng: chuông không co, cỡ 32×28; ô tìm kiếm co thay; không còn nút soạn', () => {
        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
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
        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
        const { search } = topRowControls(container);

        expect(search?.parentElement?.className).toContain('min-w-0');
    });

    it('sidebar thu gọn: chuông cỡ 32×32, không co', () => {
        pageProps.auth.user.ui_settings = { sidebar_width: 56 };

        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
        const { bell } = topRowControls(container);

        expect(bell?.className).toContain('flex-shrink-0');
        expect(bell?.className).toContain('size-8');
    });
});

type MenuNode = { name: string; badgeCount?: number; children?: MenuNode[] };

describe('badge từng kênh', () => {
    it('là số trên chuông chia theo kênh, kể cả khi cờ bộ đếm sidebar đang tắt', () => {
        pageProps.inboxes = [
            { id: 7, name: 'Zalo A', channel_type: 'Channel::ZaloPersonal' },
            { id: 8, name: 'Zalo B', channel_type: 'Channel::ZaloPersonal' },
        ];
        inboxUnreadCounts.current = { '8': 3 };
        renderedGroups.length = 0;

        render(<Sidebar onCloseMobileSidebar={() => undefined} />);

        const conversation = renderedGroups.find(group => group.name === 'Conversation') as MenuNode | undefined;
        const channels = conversation?.children?.find(child => child.name === 'Channels');
        expect(channels?.children?.map(child => [child.name, child.badgeCount])).toEqual([
            ['Zalo A-7', 0],
            ['Zalo B-8', 3],
        ]);

        pageProps.inboxes = [];
        inboxUnreadCounts.current = {};
    });
});
