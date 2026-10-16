import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { installDomStubs } from '../components/__fixtures__/dom';

const routerGet = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { get: (...args: unknown[]) => routerGet(...args) },
    usePage: () => ({ props: {} }),
}));

import { setLocale } from '../../i18n';
import AiAnalytics, { type AiAnalyticsProps } from './AiAnalytics';
import { cacheHitRatio, dayStarts, formatHourWithDay, formatUsd, pointChange, relativeChange, sortAccounts } from './aiAnalyticsMetrics';

const zero = {
    turns: 0,
    replies: 0,
    handoffs: 0,
    failed_turns: 0,
    unsourced_blocks: 0,
    model_calls: 0,
    failed_calls: 0,
    route_changes: 0,
    latency_ms_total: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    cost_micro_usd: 0,
    ai_agents: 0,
};

const account = (accountId: number, name: string | null, turns: number, cost: number) => ({
    accountId,
    name,
    aiAgents: 1,
    turns,
    replies: turns,
    handoffs: 0,
    failed_turns: 0,
    input_tokens: 100,
    cache_read_tokens: 300,
    cache_write_tokens: 0,
    cost_micro_usd: cost,
});

const props = (overrides: Partial<AiAnalyticsProps> = {}): AiAnalyticsProps => ({
    window: { preset: '7d', from: '2026-10-10', to: '2026-10-16', startsAt: '2026-10-09T17:00:00Z', endsBefore: '2026-10-16T17:00:00Z', bucket: 'day' },
    presets: ['24h', '7d', '30d', 'custom'],
    filters: { accountId: null, aiAgentId: null },
    totals: {
        ...zero,
        turns: 10,
        replies: 8,
        handoffs: 1,
        failed_turns: 1,
        unsourced_blocks: 2,
        model_calls: 20,
        latency_ms_total: 30_000,
        input_tokens: 1000,
        cache_read_tokens: 3000,
        cost_micro_usd: 1_500_000,
        ai_agents: 2,
    },
    previousTotals: { ...zero, turns: 5, replies: 3, cost_micro_usd: 1_000_000, model_calls: 5, latency_ms_total: 5000 },
    hourlyCost: [{ at: '2026-10-16T05:00:00Z', cost: 1_500_000, previousCost: 1_000_000 }],
    buckets: [
        {
            key: '2026-10-16',
            turns: 10,
            replies: 8,
            handoffs: 1,
            failed_turns: 1,
            input_tokens: 1000,
            cache_read_tokens: 3000,
            cache_write_tokens: 0,
            output_tokens: 200,
            failed_calls: 1,
            route_changes: 1,
            model_calls: 20,
        },
    ],
    accounts: [account(5, 'Shop Áo Đẹp', 4, 900_000), account(7, 'Tiệm Bánh Mây', 6, 600_000), account(9, null, 2, 100)],
    options: {
        accounts: [
            { value: '5', label: 'Shop Áo Đẹp' },
            { value: '7', label: 'Tiệm Bánh Mây' },
        ],
        aiAgents: [
            { value: '11', label: 'Lan', accountId: 5 },
            { value: '12', label: null, accountId: 7 },
        ],
    },
    ...overrides,
});

describe('AiAnalytics', () => {
    beforeAll(() => {
        installDomStubs();
        setLocale('vi');
    });
    beforeEach(() => routerGet.mockReset());

    it('hiện thẻ chỉ số so với kỳ trước, chiều xấu tô đỏ', () => {
        render(<AiAnalytics {...props()} />);

        const kpis = within(screen.getByRole('region', { name: 'Chỉ số chính' }));
        expect(kpis.getByText('$1.50')).toBeInTheDocument();
        // Chi phí và độ trễ cùng tăng 50%: tăng là xấu.
        const rises = kpis.getAllByText('+50%');
        expect(rises).toHaveLength(2);
        rises.forEach(rise => expect(rise).toHaveClass('text-danger'));
        expect(kpis.getByText('80%')).toBeInTheDocument();
        expect(kpis.getByText('+20 điểm')).toHaveClass('text-success');
        expect(kpis.getByText('2 nhân viên AI')).toBeInTheDocument();
        expect(kpis.getByText('75%')).toBeInTheDocument();
        expect(kpis.getByText('1,5 giây')).toBeInTheDocument();
        expect(kpis.getAllByText('kỳ trước chưa có số liệu').length).toBeGreaterThan(0);
        expect(screen.getByText('lần trong kỳ · 20% số lượt')).toBeInTheDocument();
    });

    it('sắp xếp bảng theo cột và bấm một account thì lọc cả trang', () => {
        render(<AiAnalytics {...props()} />);
        const table = screen.getByRole('table', { name: 'Theo account' });
        const names = () => within(table).getAllByRole('button', { name: /Lọc cả trang theo/ }).map(button => button.textContent);

        expect(names()).toEqual(['Shop Áo Đẹp', 'Tiệm Bánh Mây', 'Account #9 (đã xoá)']);

        fireEvent.click(within(table).getByRole('button', { name: /^Lượt/ }));
        expect(names()).toEqual(['Tiệm Bánh Mây', 'Shop Áo Đẹp', 'Account #9 (đã xoá)']);
        expect(within(table).getByRole('columnheader', { name: /^Lượt/ })).toHaveAttribute('aria-sort', 'descending');

        fireEvent.click(within(table).getByRole('button', { name: 'Lọc cả trang theo Tiệm Bánh Mây' }));
        expect(routerGet).toHaveBeenCalledWith('/admin/ai_analytics', { range: '7d', account_id: '7' }, expect.anything());
    });

    it('đổi khoảng thời gian giữ bộ lọc, khoảng tuỳ chọn hỏi ngày trước khi xem', () => {
        render(<AiAnalytics {...props({ filters: { accountId: 5, aiAgentId: 11 } })} />);

        fireEvent.click(screen.getByRole('button', { name: '24 giờ' }));
        expect(routerGet).toHaveBeenLastCalledWith('/admin/ai_analytics', { range: '24h', account_id: '5', ai_agent_id: '11' }, expect.anything());

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
        expect(screen.getByRole('button', { name: 'Xem' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Xem' }));
        expect(routerGet).toHaveBeenLastCalledWith(
            '/admin/ai_analytics',
            { range: 'custom', from: '2026-10-10', to: '2026-10-16', account_id: '5', ai_agent_id: '11' },
            expect.anything(),
        );
    });

    it('hiện trạng thái rỗng khi khoảng xem chưa có số liệu', () => {
        render(<AiAnalytics {...props({ totals: zero, previousTotals: zero, accounts: [] })} />);

        expect(screen.getByText('Chưa có số liệu AI trong khoảng này')).toBeInTheDocument();
        expect(screen.queryByRole('table', { name: 'Theo account' })).toBeNull();
    });
});

describe('aiAnalyticsMetrics', () => {
    beforeAll(() => setLocale('vi'));

    it('hiện giờ theo giờ Việt Nam, không theo múi giờ trình duyệt', () => {
        expect(formatHourWithDay('2026-10-15T17:00:00Z')).toBe('T6 16/10 00:00');
    });

    it('lấy mốc đầu ngày theo giờ Việt Nam cho trục của chuỗi theo giờ', () => {
        expect(dayStarts(['2026-10-15T16:00:00Z', '2026-10-15T17:00:00Z', '2026-10-15T18:00:00Z'])).toEqual(['2026-10-15T17:00:00Z']);
    });

    it('tính trúng cache trên cả token vào, đọc và ghi cache', () => {
        expect(cacheHitRatio({ input_tokens: 100, cache_read_tokens: 300, cache_write_tokens: 100 })).toBe(0.6);
        expect(cacheHitRatio({ input_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 })).toBeNull();
    });

    it('so với kỳ trước: % với số đếm, điểm với tỉ lệ, không chia cho 0', () => {
        expect(relativeChange(150, 100)).toBe(50);
        expect(relativeChange(150, 0)).toBeNull();
        expect(pointChange(0.8, 0.6)).toBeCloseTo(20);
        expect(pointChange(0.8, null)).toBeNull();
    });

    it('giữ đủ chữ số cho chi phí nhỏ', () => {
        expect(formatUsd(0)).toBe('$0.00');
        expect(formatUsd(1234)).toBe('$0.0012');
        expect(formatUsd(2_345_678)).toBe('$2.35');
    });

    it('sắp xếp account đã xoá theo tên rỗng, hoà thì theo id', () => {
        const rows = [account(9, null, 1, 5), account(3, 'B', 1, 5), account(2, 'A', 1, 5)];

        expect(sortAccounts(rows, { key: 'name', direction: 'asc' }).map(row => row.accountId)).toEqual([9, 2, 3]);
        expect(sortAccounts(rows, { key: 'cost', direction: 'desc' }).map(row => row.accountId)).toEqual([2, 3, 9]);
    });
});
