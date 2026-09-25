import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { currentEntry, pushRoute, resetRouterForTests, WIDGET_ROUTES } from '../router';
import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact } from '../types';

const apiMock = vi.hoisted(() => ({ fetchUpdates: vi.fn(), fetchUpdate: vi.fn() }));
vi.mock('../api/widget', async importOriginal => ({ ...(await importOriginal<object>()), ...apiMock }));

const { default: HelpScreen } = await import('./HelpScreen');
const { default: HelpCategoryScreen } = await import('./HelpCategoryScreen');
const { default: HelpSearchScreen } = await import('./HelpSearchScreen');
const { default: ArticleScreen } = await import('./ArticleScreen');
const { default: UpdatesScreen } = await import('./UpdatesScreen');

let portalSlug = 0;
const usePortal = () => {
    // Mỗi test một Help Center riêng: thư viện bài được nhớ theo slug.
    portalSlug += 1;
    widgetStore.setChannelConfig(
        { websiteName: 'Gốm Mộc', portal: { slug: `hc-${portalSlug}`, name: 'Trợ giúp', defaultLocale: 'vi', locales: ['vi'] } } as unknown as ChannelConfig,
        {},
        {} as WidgetContact,
    );
};

const article = (id: number, title: string, category: string, views = 0) => ({
    id,
    slug: `bai-${id}`,
    title,
    views,
    category_id: category === 'doi-tra' ? 1 : 2,
    category: { id: category === 'doi-tra' ? 1 : 2, slug: category },
});

const LIBRARY = {
    articles: [article(1, 'Phí giao hàng', 'giao-hang', 5), article(2, 'Chính sách đổi trả 7 ngày', 'doi-tra', 40), article(3, 'Hàng vỡ khi nhận', 'doi-tra', 12)],
    categories: [
        { name: 'Đổi trả và bảo hành', slug: 'doi-tra', description: 'Điều kiện đổi', meta: { articles_count: 2 } },
        { name: 'Giao hàng', slug: 'giao-hang', meta: { articles_count: 1 } },
        { name: 'Danh mục trống', slug: 'trong', meta: { articles_count: 0 } },
    ],
};

const fetchMock = vi.fn();
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => {
    resetRouterForTests();
    usePortal();
    fetchMock.mockReset().mockImplementation((url: string) => {
        if (url.includes('/categories')) return json({ payload: LIBRARY.categories });
        if (url.includes('/articles/')) return json({ ...article(2, 'Chính sách đổi trả 7 ngày', 'doi-tra'), content: 'một hai ba', content_html: '<p>Được đổi <a href="https://gommoc.vn/doi-tra">tại đây</a></p><script>alert(1)</script>' });
        if (url.includes('query=')) {
            return json({ payload: [{ id: 2, category_id: 1, title: 'Chính sách đổi trả 7 ngày', content: '...muốn đổi size, nhắn mã đơn...', link: '/hc/x/articles/bai-2' }] });
        }

        return json({ payload: LIBRARY.articles });
    });
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('tab Trợ giúp', () => {
    it('bài hay được hỏi theo lượt xem; danh mục trống bị ẩn', async () => {
        render(<HelpScreen />);

        const popular = await screen.findAllByRole('button', { name: /Chính sách|Hàng vỡ|Phí giao/ });
        expect(popular.map(button => button.textContent)).toEqual(['Chính sách đổi trả 7 ngày', 'Hàng vỡ khi nhận', 'Phí giao hàng']);
        expect(screen.queryByText('Danh mục trống')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Đổi trả và bảo hành/ }));
        expect(currentEntry()).toEqual({ name: WIDGET_ROUTES.HELP_CATEGORY, params: { slug: 'doi-tra' } });
    });

    it('danh mục chỉ liệt kê bài của nó (server không lọc)', async () => {
        pushRoute(WIDGET_ROUTES.HELP_CATEGORY, { slug: 'doi-tra' });
        render(<HelpCategoryScreen />);

        expect(await screen.findByRole('heading', { name: 'Đổi trả và bảo hành' })).toBeTruthy();
        expect(screen.getByText('Hàng vỡ khi nhận')).toBeTruthy();
        expect(screen.queryByText('Phí giao hàng')).toBeNull();
    });
});

describe('tìm bài', () => {
    it('đợi ngừng gõ mới tìm; tô từ khoá; mở bài bằng slug lấy từ link', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<HelpSearchScreen />);
        const input = screen.getByRole('searchbox');

        fireEvent.change(input, { target: { value: 'đổi' } });
        fireEvent.change(input, { target: { value: 'đổi size' } });
        await act(() => vi.advanceTimersByTimeAsync(300));

        const searches = fetchMock.mock.calls.filter(([url]) => String(url).includes('query='));
        expect(searches).toHaveLength(1);
        expect(String(searches[0][0])).toContain('query=%C4%91%E1%BB%95i+size');

        await waitFor(() => expect(screen.getByText('1 articles')).toBeTruthy());
        expect(screen.getByText('đổi size', { selector: 'mark' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Chính sách đổi trả/ }));
        expect(currentEntry()).toEqual({ name: WIDGET_ROUTES.ARTICLE, params: { slug: 'bai-2' } });
    });
});

describe('đọc bài', () => {
    it('hiện HTML đã lọc; liên kết mở tab mới thay vì rời khung chat', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        pushRoute(WIDGET_ROUTES.ARTICLE, { slug: 'bai-2' });
        const { container } = render(<ArticleScreen />);

        const link = await screen.findByRole('link', { name: 'tại đây' });
        expect(container.querySelector('script')).toBeNull();

        fireEvent.click(link);
        expect(open).toHaveBeenCalledWith('https://gommoc.vn/doi-tra', '_blank', 'noopener,noreferrer');
    });
});

describe('tab Cập nhật', () => {
    it('tin đầu là thẻ lớn có đoạn trích; nhãn lạ hiện như Thông báo', async () => {
        apiMock.fetchUpdates.mockResolvedValueOnce({
            payload: [
                { id: 9, title: 'Giảm 15% men lam', tag: 'promo', cover_url: null, cta: null, published_at: null, excerpt: 'Áp dụng cho bình' },
                { id: 8, title: 'Lịch nghỉ lễ', tag: 'la', cover_url: null, cta: null, published_at: null, excerpt: 'x' },
            ],
            meta: { has_more: false },
        });
        render(<UpdatesScreen />);

        expect(await screen.findByText('Áp dụng cho bình')).toBeTruthy();
        expect(screen.getByText('Promotion')).toBeTruthy();
        expect(screen.getByText('Announcement')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Lịch nghỉ lễ/ }));
        expect(currentEntry()).toEqual({ name: WIDGET_ROUTES.UPDATE, params: { id: 8 } });
    });
});
