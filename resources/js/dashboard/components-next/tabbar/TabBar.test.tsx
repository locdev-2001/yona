import { act, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { revealHorizontally } from 'shared/helpers/revealHorizontally';
import TabBar, { type TabBarTab } from './TabBar';

vi.mock('shared/helpers/revealHorizontally', () => ({ revealHorizontally: vi.fn() }));

class ResizeObserverSpy {
    static instances: ResizeObserverSpy[] = [];

    observed = new Set<Element>();

    constructor(private readonly onResize: ResizeObserverCallback) {
        ResizeObserverSpy.instances.push(this);
    }

    observe(element: Element): void {
        this.observed.add(element);
    }

    unobserve(element: Element): void {
        this.observed.delete(element);
    }

    disconnect(): void {
        this.observed.clear();
    }

    static resize(element: Element): void {
        ResizeObserverSpy.instances
            .filter(instance => instance.observed.has(element))
            .forEach(instance => instance.onResize([], instance as unknown as ResizeObserver));
    }
}

const TABS_BEFORE_COUNTS: TabBarTab[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Tin nhắn', value: 'messages' },
    { label: 'Tệp', value: 'files' },
];

const TABS_WITH_COUNTS: TabBarTab[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Tin nhắn', value: 'messages', count: 12 },
    { label: 'Tệp', value: 'files', count: 6 },
];

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverSpy;
});

afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
});

beforeEach(() => {
    ResizeObserverSpy.instances = [];
    vi.mocked(revealHorizontally).mockClear();
});

describe('TabBar', () => {
    it('cuộn lại tab đang chọn khi nhãn một tab khác dài ra sau khi số đếm nạp về', () => {
        const { rerender } = render(<TabBar tabs={TABS_BEFORE_COUNTS} initialActiveTab={2} onTabChanged={vi.fn()} />);
        rerender(<TabBar tabs={TABS_WITH_COUNTS} initialActiveTab={2} onTabChanged={vi.fn()} />);
        vi.mocked(revealHorizontally).mockClear();

        act(() => ResizeObserverSpy.resize(screen.getByRole('button', { name: 'Tin nhắn (12)' })));

        expect(revealHorizontally).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Tệp (6)' }));
    });

    it('cuộn lại tab đang chọn khi chính nó rộng ra', () => {
        render(<TabBar tabs={TABS_WITH_COUNTS} initialActiveTab={2} onTabChanged={vi.fn()} />);
        vi.mocked(revealHorizontally).mockClear();

        const activeTab = screen.getByRole('button', { name: 'Tệp (6)' });
        act(() => ResizeObserverSpy.resize(activeTab));

        expect(revealHorizontally).toHaveBeenCalledWith(activeTab);
    });

    it('thanh tab cao 44px trên màn nhỏ để dễ chạm, về 32px từ màn md', () => {
        const { container } = render(<TabBar tabs={TABS_WITH_COUNTS} onTabChanged={vi.fn()} />);
        const tabBar = container.firstElementChild!;

        expect(tabBar.className).toMatch(/(^|\s)h-11(\s|$)/);
        expect(tabBar.className).toMatch(/(^|\s)md:h-8(\s|$)/);
        screen.getAllByRole('button').forEach(tab => expect(tab.className).toMatch(/(^|\s)h-full(\s|$)/));
        screen.getAllByRole('button').forEach(tab => expect(tab.className).not.toMatch(/(^|\s)scale-\[0\.98\]/));
    });
});
