import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    action: 'POST accounts/{id}/suspend',
    actionLabel: 'Khoá tài khoản',
    subjectType: 'accounts',
    subjectLabel: 'Tài khoản #7',
    subjectId: 7,
    subjectUrl: '/admin/accounts/7/overview',
    changes: { reason: 'spam' },
    responseStatus: 302,
    statusLabel: 'Thành công',
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

        const table = within(screen.getByRole('table'));
        expect(table.getByText('Khoá tài khoản')).toHaveAttribute('title', 'POST accounts/{id}/suspend');
        expect(table.getByRole('link', { name: 'Tài khoản #7' })).toHaveAttribute('href', '/admin/accounts/7/overview');
        expect(table.getByText('Thành công')).toBeInTheDocument();

        fireEvent.click(table.getByRole('button', { name: 'Submitted data' }));
        expect(table.getByText(/"reason": "spam"/)).toBeInTheDocument();
        expect(table.getByText('Playwright')).toBeInTheDocument();
        expect(table.getByText('127.0.0.1')).toBeInTheDocument();
    });

    it('phân trang giữ bộ lọc', () => {
        render(<AuditLogs {...baseProps} />);

        expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute('href', '/admin/audit_logs?action=suspend&page=2');
        expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/admin/audit_logs?action=suspend&page=2');
        expect(pageHref({}, 1)).toBe('/admin/audit_logs');
    });

    it('ô chữ lọc khi nhấn Enter, ô ngày lọc ngay theo dd/mm/yyyy', () => {
        render(<AuditLogs {...baseProps} />);

        const subjectId = screen.getByLabelText('Subject ID');
        fireEvent.change(subjectId, { target: { value: '7' } });
        fireEvent.submit(subjectId.closest('form')!);
        expect(routerGet).toHaveBeenLastCalledWith('/admin/audit_logs', { action: 'suspend', subject_id: '7' }, expect.any(Object));

        const from = screen.getByLabelText('From');
        expect(from).toHaveAttribute('placeholder', 'dd/mm/yyyy');
        fireEvent.change(from, { target: { value: '05092026' } });
        expect(from).toHaveValue('05/09/2026');
        expect(routerGet).toHaveBeenLastCalledWith(
            '/admin/audit_logs',
            { action: 'suspend', subject_id: '7', from: '2026-09-05' },
            expect.any(Object),
        );
        expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    });
});
