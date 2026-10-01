import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, preserveScroll: _preserveScroll, ...rest }: { href: string; children: ReactNode; preserveScroll?: boolean }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn() },
    usePage: () => ({ props: {} }),
}));

import DataTable, { tableQuery } from './DataTable';
import type { DataColumn } from './DataTable';

const column = (name: string, overrides: Partial<DataColumn> = {}): DataColumn => ({
    name,
    type: 'text',
    masked: null,
    filterable: true,
    sortable: true,
    ...overrides,
});

describe('DataTable', () => {
    it('ô đã che hiện dấu che, khoá ngoại account mở account 360', () => {
        render(
            <DataTable
                table="inboxes"
                columns={[
                    column('id', { type: 'bigint' }),
                    column('account_id', { type: 'bigint' }),
                    column('hmac_token', { masked: 'secret', filterable: false, sortable: false }),
                ]}
                rows={[{ id: 1, account_id: 7, hmac_token: '••••' }]}
                page={1}
                hasMore={false}
                sort="id"
                direction="desc"
                filters={{}}
                perPage={50}
            />,
        );

        expect(screen.getByRole('link', { name: '7' })).toHaveAttribute('href', '/admin/accounts/7/overview');
        expect(screen.getAllByLabelText('Masked: secret data').some(element => element.textContent === '••••')).toBe(true);
        expect(screen.queryByRole('link', { name: /hmac_token/ })).toBeNull();
        // Cột id ghim trái sẵn; cột sắp xếp được là link giữ bộ lọc.
        expect(screen.getByRole('columnheader', { name: /Sort by id/ })).toHaveAttribute('data-pinned', 'left');
        expect(screen.getByRole('link', { name: 'Sort by account_id' })).toHaveAttribute(
            'href',
            '/admin/data/inboxes?sort=account_id&direction=desc',
        );
    });

    it('trang sau là link khi còn dòng, trang trước tắt ở trang 1', () => {
        render(
            <DataTable
                table="inboxes"
                columns={[column('id', { type: 'bigint' })]}
                rows={[{ id: 1 }]}
                page={1}
                hasMore
                sort="id"
                direction="desc"
                filters={{ name: 'Hoa' }}
                perPage={50}
            />,
        );

        expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
            'href',
            '/admin/data/inboxes?sort=id&direction=desc&filter%5Bname%5D=Hoa&page=2',
        );
        expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    });

    it('tham số truy vấn bỏ ô lọc rỗng và trang 1', () => {
        expect(tableQuery({ filters: { name: ' Hoa ', email: '' }, sort: 'id', direction: 'asc', page: 1 })).toEqual({
            sort: 'id',
            direction: 'asc',
            'filter[name]': 'Hoa',
        });
        expect(tableQuery({ filters: {}, sort: 'id', direction: 'desc', page: 3 }).page).toBe('3');
    });
});
