import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
    usePage: () => ({ props: { errors: {} } }),
}));

import FeatureUsage, { TrendBars } from './FeatureUsage';
import type { FeatureRow } from './FeatureUsage';
import FeatureUsageAccounts from './FeatureUsageAccounts';

function row(overrides: Partial<FeatureRow>): FeatureRow {
    return {
        key: 'macro_run',
        label: 'Macro run',
        group: 'feature',
        accounts: { '7d': 0, '30d': 0, '90d': 0, all: 0 },
        events: 0,
        lastAt: null,
        trend: Array(30).fill(0),
        url: '/admin/feature_usage/macro_run',
        ...overrides,
    };
}

describe('FeatureUsage', () => {
    it('chia hai nhóm, mỗi tính năng dẫn tới danh sách account và hiện số account theo khoảng', () => {
        const trend = Array(30).fill(0);
        trend[29] = 3;
        render(
            <FeatureUsage
                windows={['7d', '30d', '90d']}
                trendDays={30}
                features={[
                    row({ key: 'channel_connected', label: 'Channel connected', group: 'activation', url: '/admin/feature_usage/channel_connected', accounts: { '7d': 2, '30d': 5, '90d': 9, all: 11 }, events: 14, lastAt: '2026-09-30T10:00:00Z', trend }),
                    row({ events: 0 }),
                ]}
            />,
        );

        const activation = screen.getByRole('region', { name: 'Activation milestones' });
        const link = within(activation).getAllByRole('link', { name: 'See accounts using Channel connected' })[0];
        expect(link).toHaveAttribute('href', '/admin/feature_usage/channel_connected');
        expect(within(activation).getAllByText('11').length).toBeGreaterThan(0);
        expect(within(activation).getAllByRole('img', { name: '3 uses in 30 days' }).length).toBeGreaterThan(0);

        const features = screen.getByRole('region', { name: 'Features' });
        expect(within(features).getAllByText('Never').length).toBeGreaterThan(0);
    });

    it('chưa có sự kiện nào thì chỉ lối dựng lại từ dữ liệu cũ', () => {
        render(<FeatureUsage windows={['7d']} trendDays={30} features={[row({})]} />);

        expect(screen.getAllByText('Run product-events:backfill to derive events from existing data.').length).toBe(2);
    });

    it('cột xu hướng cao theo ngày nhiều lượt nhất, ngày 0 lượt chỉ còn rãnh', () => {
        const { container } = render(<TrendBars trend={[0, 2, 4]} />);
        const bars = container.querySelectorAll('[role="img"] > span');

        expect(bars).toHaveLength(3);
        expect(bars[0].children).toHaveLength(0);
        expect((bars[2].firstChild as HTMLElement).style.height).toBe('100%');
        expect((bars[1].firstChild as HTMLElement).style.height).toBe('50%');
    });
});

describe('FeatureUsageAccounts', () => {
    it('liệt kê account dùng tính năng, mỗi dòng mở account 360', () => {
        render(
            <FeatureUsageAccounts
                feature={{ key: 'sticker_sent', label: 'Sticker sent', group: 'feature' }}
                limit={500}
                backUrl="/admin/feature_usage"
                accounts={[
                    { accountId: 7, accountName: 'Shop Hoa', events: 12, events30d: 4, firstAt: '2026-08-01T00:00:00Z', lastAt: '2026-09-30T00:00:00Z', url: '/admin/accounts/7/overview' },
                ]}
            />,
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Accounts using “Sticker sent”' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Shop Hoa/ })[0]).toHaveAttribute('href', '/admin/accounts/7/overview');
        expect(screen.getByRole('link', { name: 'Feature usage' })).toHaveAttribute('href', '/admin/feature_usage');
    });

    it('chưa account nào dùng thì nói rõ', () => {
        render(<FeatureUsageAccounts feature={{ key: 'macro_run', label: 'Macro run', group: 'feature' }} limit={500} backUrl="/admin/feature_usage" accounts={[]} />);

        expect(screen.getByText('No account uses it yet')).toBeInTheDocument();
    });
});
