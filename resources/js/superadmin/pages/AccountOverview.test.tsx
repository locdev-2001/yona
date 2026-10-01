import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

const routerPost = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { post: (...args: unknown[]) => routerPost(...args) },
    usePage: () => ({ props: { errors: {} } }),
}));

import AccountOverview, { UsageBars } from './AccountOverview';
import type { AccountOverviewProps } from './AccountOverview';

function props(overrides: Partial<AccountOverviewProps> = {}): AccountOverviewProps {
    return {
        account: { id: 7, name: 'Shop Hoa', locale: 'vi', status: 'active', createdAt: '2026-09-01T00:00:00Z' },
        suspension: {
            categories: [
                { value: 'spam', label: 'Spam' },
                { value: 'other', label: 'Other' },
            ],
            maxReasonLength: 256,
            history: [],
        },
        users: [
            {
                id: 3,
                name: 'Chị Hoa',
                email: 'hoa@example.com',
                role: 'administrator',
                confirmed: true,
                lastSignInAt: null,
                activeAt: null,
                url: '/admin/users/3',
                impersonateUrl: '/admin/users/3/impersonate',
            },
        ],
        inboxes: [],
        stats: { users: 1, contacts: 4, conversations: 2, inboxes: 0, messages7d: 5, messages30d: 9, lastActivityAt: null },
        usage: [
            { date: '2026-09-29', count: 0 },
            { date: '2026-09-30', count: 4 },
        ],
        onboarding: { step: null, stepLabel: null, milestones: [] },
        timeline: [],
        stickers: { packs: 1, stickers: 3 },
        impersonations: [],
        urls: {
            show: '/admin/accounts/7',
            edit: '/admin/accounts/7/edit',
            stickers: '/admin/accounts/7/sticker_packs',
            auditLogs: '/admin/audit_logs?subject_type=accounts&subject_id=7',
            data: '/admin/data/inboxes?filter[account_id]=7',
            suspend: '/admin/accounts/7/suspend',
            unsuspend: '/admin/accounts/7/unsuspend',
            impersonations: '/admin/impersonations',
        },
        csrf: 'token',
        ...overrides,
    };
}

describe('AccountOverview', () => {
    beforeEach(() => {
        routerPost.mockReset();
        window.location.hash = '';
    });

    it('khoá account qua hai bước: điền lý do rồi xác nhận lần nữa', () => {
        render(<AccountOverview {...props()} />);

        fireEvent.click(screen.getByRole('button', { name: /Suspend account/ }));
        const form = screen.getByRole('dialog');
        const next = within(form).getByRole('button', { name: 'Continue' });
        expect(next).toBeDisabled();

        fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Gửi tin rác' } });
        fireEvent.click(next);
        expect(routerPost).not.toHaveBeenCalled();

        const confirm = screen.getByRole('dialog');
        expect(confirm).toHaveTextContent('Suspend "Shop Hoa" now?');
        fireEvent.click(within(confirm).getByRole('button', { name: 'Suspend now' }));

        expect(routerPost).toHaveBeenCalledWith('/admin/accounts/7/suspend', { category: 'spam', reason: 'Gửi tin rác' }, expect.any(Object));
    });

    it('account đang khoá hiện lý do và mở khoá sau khi xác nhận', () => {
        render(
            <AccountOverview
                {...props({
                    account: { id: 7, name: 'Shop Hoa', locale: 'vi', status: 'suspended', createdAt: null },
                    suspension: { ...props().suspension, history: [{ category: 'spam', reason: 'Gửi tin rác', suspended_at: '2026-09-30T00:00:00Z' }] },
                })}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Spam: Gửi tin rác');
        fireEvent.click(screen.getByRole('button', { name: /Reactivate/ }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reactivate' }));

        expect(routerPost).toHaveBeenCalledWith('/admin/accounts/7/unsuspend', {}, expect.any(Object));
    });

    it('đăng nhập hộ nộp form gốc sang tab mới, đòi lý do đủ dài', () => {
        render(<AccountOverview {...props()} />);

        fireEvent.click(screen.getByRole('button', { name: /Impersonate/ }));
        const dialog = screen.getByRole('dialog');
        const submit = within(dialog).getByRole('button', { name: /Impersonate \(new tab\)/ });
        expect(submit).toBeDisabled();

        fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Hỗ trợ khách theo phiếu #12' } });
        expect(submit).toBeEnabled();

        const form = dialog.querySelector('form');
        expect(form).toHaveAttribute('action', '/admin/users/3/impersonate');
        expect(form).toHaveAttribute('target', '_blank');
    });

    it('đổi tab hiện danh sách thành viên', () => {
        render(<AccountOverview {...props()} />);

        fireEvent.click(screen.getByRole('tab', { name: 'Members' }));

        expect(screen.getByRole('link', { name: 'Chị Hoa' })).toHaveAttribute('href', '/admin/users/3');
        expect(window.location.hash).toBe('#users');
    });

    it('biểu đồ lượng tin có một cột mỗi ngày và tổng số tin', () => {
        const { container } = render(<UsageBars usage={props().usage} />);

        expect(container.querySelectorAll('rect')).toHaveLength(2);
        expect(screen.getByText('4 messages')).toBeInTheDocument();
    });
});
