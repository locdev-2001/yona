import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

import { installDomStubs } from '../components/__fixtures__/dom';

const routerPatch = vi.fn();
const routerPost = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: {
        patch: (...args: unknown[]) => routerPatch(...args),
        post: (...args: unknown[]) => routerPost(...args),
        get: vi.fn(),
        reload: vi.fn(),
    },
    usePage: () => ({ props: {} }),
}));

import Alerts, { formatAlertValue } from './Alerts';
import type { AlertIncidentItem, AlertRuleItem } from './Alerts';

const rule = (overrides: Partial<AlertRuleItem>): AlertRuleItem => ({
    key: 'failed_jobs',
    enabled: true,
    threshold: 10,
    windowMinutes: 15,
    cooldownMinutes: 60,
    windowMode: 'lookback',
    unit: 'count',
    lastValue: 3,
    lastEvaluatedAt: '2026-10-01T00:00:00Z',
    status: 'ok',
    openedAt: null,
    url: '/horizon/failed',
    ...overrides,
});

const incident: AlertIncidentItem = {
    id: 5,
    ruleKey: 'failing_channels',
    unit: 'count',
    value: 6,
    peakValue: 9,
    threshold: 5,
    openedAt: '2026-09-30T10:00:00Z',
    resolvedAt: null,
    notifiedAt: '2026-09-30T10:00:00Z',
    recoveryNotifiedAt: null,
};

const baseProps = {
    rules: [
        rule({}),
        rule({ key: 'failing_channels', status: 'firing', lastValue: 9, threshold: 5, windowMode: 'sustain', openedAt: '2026-09-30T10:00:00Z', url: '/admin/channel_health' }),
        rule({ key: 'zalo_bridge_down', unit: 'state', threshold: 1, lastValue: 0, windowMode: 'sustain', windowMinutes: 5 }),
    ],
    incidents: [incident],
    pagination: { current: 1, last: 1, total: 1 },
    push: { vapidPublicKey: null, subscriptions: 0, endpoint: '/admin/api/push_subscriptions' },
    stats: { firing: 1, enabled: 3, incidents7d: 1, recipients: 2 },
    limits: { threshold: 1000000, minutes: 1440 },
};

describe('Alerts', () => {
    beforeAll(() => installDomStubs());
    beforeEach(() => {
        routerPatch.mockReset();
        routerPost.mockReset();
    });

    it('hiện luật với giá trị hiện tại so với ngưỡng và trạng thái', () => {
        render(<Alerts {...baseProps} />);

        const [rulesTable] = screen.getAllByRole('table');
        const firingRow = within(rulesTable).getByText('Failing channels').closest('tr')!;
        expect(within(firingRow).getByText('Firing')).toBeInTheDocument();
        expect(within(firingRow).getByText('9')).toBeInTheDocument();
        expect(within(firingRow).getByText('Over threshold for 15 min')).toBeInTheDocument();

        const bridgeRow = within(rulesTable).getByText('zalo-bridge unreachable').closest('tr')!;
        expect(within(bridgeRow).getByText('Reachable')).toBeInTheDocument();
        expect(within(bridgeRow).getByText('Normal')).toBeInTheDocument();
    });

    it('bật/tắt luật gửi PATCH tới đúng luật', () => {
        render(<Alerts {...baseProps} />);

        fireEvent.click(screen.getAllByRole('switch', { name: 'Enable rule Failed jobs' })[0]);

        expect(routerPatch).toHaveBeenCalledWith('/admin/alerts/rules/failed_jobs', { enabled: false }, expect.any(Object));
    });

    it('sửa ngưỡng ngay trên dòng, chặn giá trị sai', () => {
        render(<Alerts {...baseProps} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Edit rule Failed jobs' })[0]);
        const form = screen.getAllByRole('form', { name: 'Edit rule Failed jobs' })[0];
        const threshold = within(form).getByLabelText('Threshold');

        fireEvent.change(threshold, { target: { value: '0' } });
        expect(within(form).getByRole('button', { name: 'Save' })).toBeDisabled();

        fireEvent.change(threshold, { target: { value: '25' } });
        fireEvent.change(within(form).getByLabelText('Cooldown (minutes)'), { target: { value: '120' } });
        fireEvent.submit(form);

        expect(routerPatch).toHaveBeenCalledWith(
            '/admin/alerts/rules/failed_jobs',
            { threshold: 25, window_minutes: 15, cooldown_minutes: 120 },
            expect.any(Object),
        );
    });

    it('luật trạng thái không cho sửa ngưỡng', () => {
        render(<Alerts {...baseProps} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Edit rule zalo-bridge unreachable' })[0]);
        const form = screen.getAllByRole('form', { name: 'Edit rule zalo-bridge unreachable' })[0];

        expect(within(form).queryByLabelText('Threshold')).toBeNull();
        fireEvent.submit(form);
        expect(routerPatch).toHaveBeenCalledWith('/admin/alerts/rules/zalo_bridge_down', { window_minutes: 5, cooldown_minutes: 60 }, expect.any(Object));
    });

    it('Gửi thử gọi POST /admin/alerts/test', () => {
        render(<Alerts {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Send test' }));

        expect(routerPost).toHaveBeenCalledWith('/admin/alerts/test', {}, expect.any(Object));
    });

    it('lịch sử sự cố: sự cố đang mở, cao nhất trên ngưỡng; máy chủ không gửi được đẩy thì nói rõ', () => {
        render(<Alerts {...baseProps} />);

        const incidentsTable = screen.getAllByRole('table')[1];
        expect(within(incidentsTable).getByText('Open')).toBeInTheDocument();
        expect(within(incidentsTable).getByText('/ 5')).toBeInTheDocument();
        expect(within(incidentsTable).getByText('Notified')).toBeInTheDocument();
        expect(screen.getByText('This browser or the server does not support push notifications.')).toBeInTheDocument();
    });

    it('chưa có sự cố thì hiện trạng thái rỗng', () => {
        render(<Alerts {...baseProps} incidents={[]} />);

        expect(screen.getByText('No incidents yet')).toBeInTheDocument();
    });

    it('định dạng giá trị theo đơn vị', () => {
        expect(formatAlertValue('seconds', 300)).toBe('300 s');
        expect(formatAlertValue('state', 1)).toBe('Unreachable');
        expect(formatAlertValue('count', null)).toBe('Not measured');
    });
});
