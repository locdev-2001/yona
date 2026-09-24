import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageProps = vi.hoisted(() => ({
    auth: { user: { id: 1, ui_settings: {} as Record<string, unknown> } },
    currentAccount: { id: 2, features: {} },
    currentAccountUser: { role: 'administrator' },
    inboxes: [],
    teams: [],
}));
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
vi.mock('./SidebarGroup', () => ({ default: () => null }));
vi.mock('./SidebarProfileMenu', () => ({ default: () => null }));
vi.mock('./SidebarAccountSwitcher', () => ({ default: () => null }));
vi.mock('dashboard/components-next/icon/Logo', () => ({ default: () => null }));

import Sidebar from './Sidebar';

function topRowControls(container: HTMLElement) {
    const bell = container.querySelector<HTMLElement>('[data-test-id="notification-bell"]');
    const compose = container.querySelector('.i-lucide-pen-line')?.closest('button') ?? null;
    const search = container.querySelector<HTMLElement>('a[href$="/search"]');

    return { bell, compose, search };
}

// jsdom không dàn trang, nên khoá hợp đồng co giãn bằng class: chỉ ô tìm kiếm được
// co, hai nút hành động giữ cỡ cố định như nhau.
describe('hàng đầu sidebar: tìm kiếm, chuông, soạn', () => {
    beforeEach(() => {
        pageProps.auth.user.ui_settings = {};
    });

    it('sidebar mở rộng: chuông và nút soạn không co, cùng cỡ 32×28; ô tìm kiếm co thay', () => {
        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
        const { bell, compose, search } = topRowControls(container);

        expect(bell?.className).toContain('flex-shrink-0');
        expect(bell?.className).toContain('h-7 w-8');
        expect(compose?.className).toContain('flex-shrink-0');
        expect(compose?.className).toContain('!h-7');
        expect(compose?.className).toContain('w-8');
        expect(search?.className).toContain('min-w-0');
        expect(search?.className).not.toContain('flex-shrink-0');
    });

    // Hàng là grid item: thiếu min-w-0 thì track lấy bề rộng tối thiểu của chữ gợi ý
    // (không xuống dòng) nên "Tìm kiếm..." đẩy hàng tràn khỏi sidebar 200px.
    it('hàng tìm kiếm được co theo sidebar thay vì theo chữ gợi ý', () => {
        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
        const { search } = topRowControls(container);

        expect(search?.parentElement?.className).toContain('min-w-0');
    });

    it('sidebar thu gọn: chuông và nút soạn cùng cỡ 32×32, không co', () => {
        pageProps.auth.user.ui_settings = { sidebar_width: 56 };

        const { container } = render(<Sidebar onCloseMobileSidebar={() => undefined} />);
        const { bell, compose } = topRowControls(container);

        expect(bell?.className).toContain('flex-shrink-0');
        expect(bell?.className).toContain('size-8');
        expect(compose?.className).toContain('flex-shrink-0');
        expect(compose?.className).toContain('!size-8');
    });
});
