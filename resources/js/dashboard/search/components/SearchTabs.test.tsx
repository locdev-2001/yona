import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { revealHorizontally } from 'shared/helpers/revealHorizontally';
import SearchTabs, { type SearchTabConfig } from './SearchTabs';

vi.mock('shared/helpers/revealHorizontally', () => ({ revealHorizontally: vi.fn() }));

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

const TABS: SearchTabConfig[] = [
    { key: 'all', name: 'Tất cả', count: null, showBadge: false },
    { key: 'conversations', name: 'Hội thoại', count: 0, showBadge: true },
    { key: 'messages', name: 'Tin nhắn', count: 5, showBadge: true },
    { key: 'contacts', name: 'Liên hệ', count: 1, showBadge: true },
    { key: 'files', name: 'Tệp', count: 2, showBadge: true },
    { key: 'articles', name: 'Bài viết', count: 0, showBadge: true },
];

beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

beforeEach(() => vi.mocked(revealHorizontally).mockClear());

describe('SearchTabs', () => {
    it('đặt thanh tab trong khung cuộn ngang riêng để màn hẹp vuốt tới được mọi tab', () => {
        const { container } = render(<SearchTabs tabs={TABS} selectedTab={0} onTabChange={vi.fn()} />);
        const scroller = container.firstElementChild!;

        expect(scroller.className).toMatch(/\boverflow-x-auto\b/);
        expect(scroller.firstElementChild!.className).toMatch(/\bshrink-0\b/);
    });

    it('cuộn tab đang chọn vào tầm nhìn khi mở trang và khi đổi tab', () => {
        const { rerender } = render(<SearchTabs tabs={TABS} selectedTab={4} onTabChange={vi.fn()} />);

        expect(revealHorizontally).toHaveBeenLastCalledWith(screen.getByRole('button', { name: 'Tệp (2)' }));

        rerender(<SearchTabs tabs={TABS} selectedTab={2} onTabChange={vi.fn()} />);

        expect(revealHorizontally).toHaveBeenLastCalledWith(screen.getByRole('button', { name: 'Tin nhắn (5)' }));
    });
});
