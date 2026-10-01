import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { superAdminProps } from '../components/__fixtures__/superAdmin';

const routerGet = vi.fn();
const routerDelete = vi.fn();
const routerVisit = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, preserveScroll: _preserveScroll, ...rest }: { href: string; children: unknown; preserveScroll?: boolean }) => (
        <a href={href} {...rest}>
            {children as never}
        </a>
    ),
    router: {
        get: (...args: unknown[]) => routerGet(...args),
        delete: (...args: unknown[]) => routerDelete(...args),
        visit: (...args: unknown[]) => routerVisit(...args),
    },
    usePage: () => ({ props: pageProps }),
}));

import ResourceIndex, { activeFilter, indexUrl } from './Index';

const cell = (name: string, type: string, value: unknown) => ({ name, label: name, type, html_class: type, value });

const baseProps = {
    resource: 'accounts',
    resourceLabel: 'Accounts',
    singular: 'account',
    singularLabel: 'Account',
    columns: [
        { name: 'id', label: 'Id', html_class: 'number' },
        { name: 'name', label: 'Name', html_class: 'string' },
    ],
    rows: [
        { url: '/admin/accounts/2', cells: [cell('id', 'number', 2), cell('name', 'string', 'Shop Hoa')] },
        { url: '/admin/accounts/1', cells: [cell('id', 'number', 1), cell('name', 'string', 'Shop Cây')] },
    ],
    pagination: { current: 2, last: 5, total: 90 },
    filters: ['active', 'suspended'],
    search: 'hoa',
    order: 'name',
    direction: 'asc',
    actions: ['index', 'show', 'new', 'edit', 'destroy'],
};

describe('ResourceIndex', () => {
    beforeEach(() => {
        routerGet.mockReset();
        routerDelete.mockReset();
        routerVisit.mockReset();
        pageProps = { superAdmin: superAdminProps({ currentPath: '/admin/accounts' }) };
    });

    it('lấy tiêu đề tiếng Việt từ thanh bên, nhãn cột từ từ điển', () => {
        render(<ResourceIndex {...baseProps} />);

        expect(screen.getByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument();
        expect(screen.getByText('90 bản ghi')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /Tên/ })).toHaveAttribute('aria-sort', 'ascending');
        expect(screen.getByRole('link', { name: /Thêm mới/ })).toHaveAttribute('href', '/admin/accounts/new');
    });

    it('gửi từ khoá tìm kiếm, giữ thứ tự sắp xếp đang xem', () => {
        render(<ResourceIndex {...baseProps} />);

        const input = screen.getByRole('searchbox');
        expect(input).toHaveValue('hoa');
        fireEvent.change(input, { target: { value: ' cây ' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(routerGet).toHaveBeenCalledWith(
            '/admin/accounts?search=c%C3%A2y&account%5Border%5D=name&account%5Bdirection%5D=asc',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('chọn bộ lọc gửi dạng `<tên>:`', () => {
        render(<ResourceIndex {...baseProps} />);

        fireEvent.change(screen.getByRole('combobox', { name: 'Bộ lọc' }), { target: { value: 'suspended' } });

        expect(routerGet.mock.calls[0][0]).toContain('search=suspended%3A');
        expect(screen.getByRole('option', { name: 'Tạm khoá' })).toBeInTheDocument();
    });

    it('liên kết phân trang giữ từ khoá và sắp xếp', () => {
        render(<ResourceIndex {...baseProps} />);

        const pagination = screen.getByRole('navigation', { name: 'pagination' });
        expect(within(pagination).getByRole('link', { name: '3' })).toHaveAttribute(
            'href',
            '/admin/accounts?search=hoa&account%5Border%5D=name&account%5Bdirection%5D=asc&page=3',
        );
    });

    it('xoá phải xác nhận qua hộp thoại', () => {
        render(<ResourceIndex {...baseProps} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Xoá' })[0]);
        expect(routerDelete).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog', { name: 'Xoá bản ghi này?' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá' }));

        expect(routerDelete).toHaveBeenCalledWith('/admin/accounts/2', expect.anything());
    });

    it('bấm vào dòng mở trang chi tiết', () => {
        render(<ResourceIndex {...baseProps} />);

        fireEvent.click(screen.getByText('Shop Cây'));

        expect(routerVisit).toHaveBeenCalledWith('/admin/accounts/1');
    });

    it('không có bản ghi thì hiện trạng thái rỗng', () => {
        render(<ResourceIndex {...baseProps} rows={[]} pagination={{ current: 1, last: 1, total: 0 }} />);

        expect(screen.getByText('Chưa có bản ghi nào')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('activeFilter/indexUrl', () => {
        expect(activeFilter('active:', ['active'])).toBe('active');
        expect(activeFilter('hoa:', ['active'])).toBe('');
        expect(indexUrl('users', 'user', { order: 'id', direction: 'desc', page: 1 })).toBe('/admin/users');
    });
});
