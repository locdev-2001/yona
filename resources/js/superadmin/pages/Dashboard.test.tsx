import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, className }: { href: string; children: unknown; className?: string }) => (
        <a href={href} className={className}>
            {children as never}
        </a>
    ),
}));

// Tên nút trong test là key + tham số, không phụ thuộc bản dịch đang sinh.
vi.mock('../../i18n', () => ({
    getLocale: () => 'vi',
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
}));

import { t } from '../../i18n';
import type { DashboardProps, WidgetMeta } from '../dashboard/types';
import SuperAdminDashboard from './Dashboard';

const meta = (key: string, source: WidgetMeta['source'] = 'server', defaultSize: WidgetMeta['defaultSize'] = 'sm'): WidgetMeta => ({
    key,
    title: `Ô ${key}`,
    description: `Mô tả ${key}`,
    defaultSize,
    source,
});

const props = (): DashboardProps => ({
    widgets: [meta('kpis', 'server', 'full'), meta('top_accounts'), meta('operation_links', 'client'), meta('chua_co_renderer')],
    layout: [
        { key: 'kpis', size: 'full' },
        { key: 'top_accounts', size: 'md' },
        { key: 'operation_links', size: 'sm' },
    ],
    sizes: ['sm', 'md', 'lg', 'full'],
    ranges: ['7d', '30d', '90d'],
    defaultRange: '30d',
    endpoints: { widgets: '/admin/api/dashboard/widgets', layout: '/admin/api/dashboard/layout' },
    links: [
        { key: 'horizon', url: '/horizon', external: false },
        { key: 'tasks', url: 'https://dash.yona.vn', external: true },
    ],
});

const WIDGET_DATA: Record<string, unknown> = {
    kpis: { metrics: [{ key: 'accounts_total', value: 1234, previous: null, changePercent: null }] },
    top_accounts: { items: [{ id: 7, name: 'Shop Hoa', url: '/admin/accounts/7', messages: 42 }] },
};

type Call = { url: string; method: string; body: unknown };

let calls: Call[];
let failingKeys: Set<string>;

function jsonResponse(body: unknown, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

beforeEach(() => {
    calls = [];
    failingKeys = new Set();
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string, init: RequestInit = {}) => {
            const method = init.method ?? 'GET';
            const body = init.body ? JSON.parse(String(init.body)) : undefined;
            calls.push({ url, method, body });

            if (url.startsWith('/admin/api/dashboard/layout')) {
                return jsonResponse({ layout: method === 'DELETE' ? props().layout : body.layout });
            }

            const key = new URL(url, 'http://localhost').pathname.split('/').pop() as string;
            if (failingKeys.has(key)) return jsonResponse({ message: 'lỗi' }, 500);

            return jsonResponse({ key, range: { from: '2026-09-02', to: '2026-10-01', days: 30 }, data: WIDGET_DATA[key] });
        }),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const widgetCalls = () => calls.filter(call => call.url.startsWith('/admin/api/dashboard/widgets'));
const layoutCalls = () => calls.filter(call => call.url.startsWith('/admin/api/dashboard/layout'));

describe('trang Tổng quan', () => {
    it('mỗi ô máy chủ tự gọi API của mình, ô lối tắt vẽ từ props', async () => {
        render(<SuperAdminDashboard {...props()} />);

        expect(await screen.findByText('Shop Hoa')).toBeTruthy();
        expect(screen.getByText(/^1[.,\s]?234$/)).toBeTruthy();
        expect(widgetCalls().map(call => call.url).sort()).toEqual([
            '/admin/api/dashboard/widgets/kpis?range=30d',
            '/admin/api/dashboard/widgets/top_accounts?range=30d',
        ]);
        expect(screen.queryByText('Ô chua_co_renderer')).toBeNull();

        const tasksLink = screen.getByRole('link', { name: /ADMIN_DASHBOARD\.LINKS\.TASKS\.TITLE/ });
        expect(tasksLink.getAttribute('href')).toBe('https://dash.yona.vn');
        expect(tasksLink.getAttribute('target')).toBe('_blank');
    });

    it('đổi khoảng ngày thì mọi ô tải lại', async () => {
        render(<SuperAdminDashboard {...props()} />);
        await screen.findByText('Shop Hoa');

        fireEvent.click(screen.getByRole('button', { name: t('ADMIN_DASHBOARD.RANGE.PRESETS.7D') }));

        await waitFor(() =>
            expect(widgetCalls().filter(call => call.url.includes('range=7d'))).toHaveLength(2),
        );
    });

    it('ô lỗi hiện nút thử lại, thử lại thì bỏ qua cache máy chủ', async () => {
        failingKeys.add('top_accounts');
        render(<SuperAdminDashboard {...props()} />);

        const retry = await screen.findByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.RETRY') });
        failingKeys.clear();
        fireEvent.click(retry);

        expect(await screen.findByText('Shop Hoa')).toBeTruthy();
        expect(widgetCalls().at(-1)?.url).toBe('/admin/api/dashboard/widgets/top_accounts?range=30d&fresh=1');
    });

    it('tuỳ chỉnh: ẩn, hiện lại, đổi cỡ, về mặc định và lưu qua API bố cục', async () => {
        render(<SuperAdminDashboard {...props()} />);
        await screen.findByText('Shop Hoa');

        fireEvent.click(screen.getByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.CUSTOMIZE') }));

        const handle = screen.getByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.DRAG', { title: 'Ô kpis' }) });
        expect(handle.getAttribute('aria-roledescription')).toBe('sortable');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.HIDE', { title: 'Ô top_accounts' }) }));
        });
        expect(layoutCalls().at(-1)).toMatchObject({
            method: 'PUT',
            body: { layout: [{ key: 'kpis', size: 'full' }, { key: 'operation_links', size: 'sm' }] },
        });

        const hiddenSection = screen.getByRole('region', { name: t('ADMIN_DASHBOARD.EDIT.HIDDEN_TITLE') });
        await act(async () => {
            fireEvent.click(within(hiddenSection).getByRole('button', { name: /Ô top_accounts/ }));
        });
        expect(layoutCalls().at(-1)?.body).toEqual({
            layout: [
                { key: 'kpis', size: 'full' },
                { key: 'operation_links', size: 'sm' },
                { key: 'top_accounts', size: 'sm' },
            ],
        });

        await act(async () => {
            fireEvent.change(screen.getByRole('combobox', { name: t('ADMIN_DASHBOARD.ACTIONS.SIZE', { title: 'Ô kpis' }) }), {
                target: { value: 'md' },
            });
        });
        expect((layoutCalls().at(-1)?.body as { layout: unknown[] }).layout[0]).toEqual({ key: 'kpis', size: 'md' });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.RESET') }));
        });
        expect(layoutCalls().at(-1)?.method).toBe('DELETE');
        expect(screen.getByRole('combobox', { name: t('ADMIN_DASHBOARD.ACTIONS.SIZE', { title: 'Ô top_accounts' }) })).toHaveProperty(
            'value',
            'md',
        );

        fireEvent.click(screen.getByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.DONE') }));
        expect(screen.queryByRole('button', { name: t('ADMIN_DASHBOARD.ACTIONS.DRAG', { title: 'Ô kpis' }) })).toBeNull();
    });
});
