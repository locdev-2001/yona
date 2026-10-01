import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { installDomStubs } from '../components/__fixtures__/dom';

const routerGet = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, preserveScroll: _preserveScroll, ...rest }: { href: string; children: ReactNode; preserveScroll?: boolean }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: (...args: unknown[]) => routerGet(...args) },
    usePage: () => ({ props: {} }),
}));

import AuditLogs, { pageHref } from './AuditLogs';

const log = {
    id: 3,
    superAdminId: 1,
    superAdminEmail: 'qa-admin@local.test',
    action: 'accounts.suspend',
    subjectType: 'Account',
    subjectId: 7,
    subjectUrl: '/admin/accounts/7/overview',
    changes: { reason: 'spam' },
    responseStatus: 302,
    ipAddress: '127.0.0.1',
    userAgent: 'Playwright',
    createdAt: '2026-09-30T08:00:00Z',
};

const baseProps = {
    logs: [log],
    pagination: { current: 1, last: 3, total: 120 },
    filters: { action: 'suspend' },
    options: { superAdmins: [{ value: '1', label: 'qa-admin@local.test' }], subjectTypes: ['Account'] },
};

describe('AuditLogs', () => {
    beforeAll(() => installDomStubs());
    beforeEach(() => routerGet.mockReset());

    it('hiện thao tác, link đối tượng và mở dữ liệu gửi kèm', () => {
        render(<AuditLogs {...baseProps} />);

        expect(screen.getByText('accounts.suspend')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Account #7' })).toHaveAttribute('href', '/admin/accounts/7/overview');

        fireEvent.click(screen.getByRole('button', { name: 'Submitted data' }));
        expect(screen.getByText(/"reason": "spam"/)).toBeInTheDocument();
        expect(screen.getByText('Playwright')).toBeInTheDocument();
    });

    it('phân trang giữ bộ lọc', () => {
        render(<AuditLogs {...baseProps} />);

        expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute('href', '/admin/audit_logs?action=suspend&page=2');
        expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/admin/audit_logs?action=suspend&page=2');
        expect(pageHref({}, 1)).toBe('/admin/audit_logs');
    });

    it('bấm Lọc gửi bộ lọc nháp lên URL', () => {
        render(<AuditLogs {...baseProps} />);

        fireEvent.change(screen.getByLabelText('Subject ID'), { target: { value: '7' } });
        fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

        expect(routerGet).toHaveBeenCalledWith('/admin/audit_logs', { action: 'suspend', subject_id: '7' }, expect.any(Object));
    });
});
