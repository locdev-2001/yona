import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

import { installDomStubs } from '../components/__fixtures__/dom';

const routerGet = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
    router: { get: (...args: unknown[]) => routerGet(...args) },
    usePage: () => ({ props: {} }),
}));

import ChannelHealth, { problemDetail } from './ChannelHealth';
import type { ChannelHealthItem } from './ChannelHealth';

const item: ChannelHealthItem = {
    inboxId: 11,
    inboxName: 'Zalo chính',
    accountId: 7,
    accountName: 'Shop Hoa',
    channelType: 'Channel::Zalo',
    platform: { key: 'zalo', name: 'Zalo', logo_url: '/zalo.svg' },
    healthy: false,
    problem: 'session_lost',
    severity: 'error',
    problemLabel: 'Zalo session lost',
    detail: 'Đăng nhập trên máy khác',
    since: '2026-09-30T00:00:00Z',
    url: '/admin/accounts/7/overview',
};

const baseProps = {
    stats: { total: 3, healthy: 2, failing: 1, errors: 1 },
    items: [item],
    filters: {},
    options: { problems: [{ value: 'session_lost', label: 'Zalo session lost', count: 1 }], platforms: [{ value: 'zalo', label: 'Zalo', count: 1 }] },
};

describe('ChannelHealth', () => {
    beforeAll(() => installDomStubs());
    beforeEach(() => routerGet.mockReset());

    it('hiện hộp thư hỏng kèm link tới account 360', () => {
        render(<ChannelHealth {...baseProps} />);

        const table = within(screen.getByRole('table'));
        expect(table.getByText('Zalo chính')).toBeInTheDocument();
        expect(table.getByRole('link', { name: 'Shop Hoa' })).toHaveAttribute('href', '/admin/accounts/7/overview');
        expect(table.getByText('Đăng nhập trên máy khác')).toBeInTheDocument();
        expect(table.getByText('Zalo session lost')).toBeInTheDocument();
    });

    it('chọn loại vấn đề thì lọc qua URL', async () => {
        render(<ChannelHealth {...baseProps} />);

        fireEvent.click(screen.getByRole('combobox', { name: 'Problem' }));
        const option = await screen.findByRole('option', { name: 'Zalo session lost (1)' });
        fireEvent.pointerDown(option, { pointerType: 'mouse' });
        fireEvent.mouseDown(option);
        fireEvent.pointerUp(option, { pointerType: 'mouse' });
        fireEvent.mouseUp(option);
        fireEvent.click(option);

        expect(routerGet).toHaveBeenCalledWith('/admin/channel_health', { problem: 'session_lost' }, expect.any(Object));
    });

    it('tìm kiếm gửi khi bấm Enter, bỏ lọc về URL gốc', () => {
        render(<ChannelHealth {...baseProps} filters={{ severity: 'error' }} />);

        const search = screen.getByRole('searchbox');
        fireEvent.change(search, { target: { value: 'Hoa' } });
        fireEvent.submit(search.closest('form')!);
        expect(routerGet).toHaveBeenLastCalledWith('/admin/channel_health', { severity: 'error', search: 'Hoa' }, expect.any(Object));

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(routerGet).toHaveBeenLastCalledWith('/admin/channel_health', {}, expect.any(Object));
    });

    it('không có hộp thư hỏng thì báo mọi kênh khoẻ', () => {
        render(<ChannelHealth {...baseProps} items={[]} />);

        expect(screen.getByText('All channels are healthy')).toBeInTheDocument();
    });

    it('chi tiết dạng số đổi thành số lần lỗi', () => {
        expect(problemDetail('3')).toBe('3 errors');
        expect(problemDetail(null)).toBeNull();
    });
});
