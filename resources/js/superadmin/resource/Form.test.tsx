import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { installDomStubs } from '../components/__fixtures__/dom';
import { superAdminProps } from '../components/__fixtures__/superAdmin';

const submitPut = vi.fn();
const submitPost = vi.fn();
let formErrors: Record<string, string> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, ...rest }: { href: string; children: unknown }) => (
        <a href={href} {...rest}>
            {children as never}
        </a>
    ),
    usePage: () => ({ props: { superAdmin: superAdminProps() } }),
    useForm: (initial: Record<string, Record<string, string>>) => {
        const [data, setState] = useState(initial);

        return {
            data,
            setData: (key: string, value: Record<string, string>) => setState(current => ({ ...current, [key]: value })),
            post: (...args: unknown[]) => submitPost(...args),
            put: (...args: unknown[]) => submitPut(...args),
            processing: false,
            errors: formErrors,
        };
    },
}));

import ResourceForm from './Form';

const field = (name: string, overrides: Record<string, unknown> = {}) => ({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1).replaceAll('_', ' '),
    type: 'string',
    options: [] as string[],
    value: null as string | number | null,
    depends_on: null as { field: string; value: string } | null,
    ...overrides,
});

const baseProps = {
    resource: 'accounts',
    resourceLabel: 'Accounts',
    singular: 'account',
    singularLabel: 'Account',
    record: { id: 7, title: 'Shop Hoa', url: '/admin/accounts/7' },
    fields: [
        field('name', { value: 'Shop Hoa' }),
        field('status', { type: 'select', options: ['active', 'suspended'], value: 'active' }),
        field('suspension_reason', { depends_on: { field: 'status', value: 'suspended' } }),
    ],
    action: '/admin/accounts/7',
    method: 'put' as const,
};

describe('ResourceForm', () => {
    beforeEach(() => {
        installDomStubs();
        submitPut.mockReset();
        submitPost.mockReset();
        formErrors = {};
    });

    it('nhãn tiếng Việt từ từ điển, trường phụ thuộc ẩn tới khi điều kiện đúng', () => {
        render(<ResourceForm {...baseProps} />);

        expect(screen.getByLabelText('Tên')).toHaveValue('Shop Hoa');
        expect(screen.queryByLabelText('Suspension reason')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Huỷ' })).toHaveAttribute('href', '/admin/accounts/7');
    });

    it('gửi PUT tới action khi sửa', () => {
        render(<ResourceForm {...baseProps} />);

        fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Shop Hoa Mới' } });
        fireEvent.submit(screen.getByLabelText('Tên').closest('form') as HTMLFormElement);

        expect(submitPut).toHaveBeenCalledWith('/admin/accounts/7');
        expect(submitPost).not.toHaveBeenCalled();
    });

    it('hiện lỗi máy chủ dưới trường', () => {
        formErrors = { 'account.name': 'Tên không được để trống' };
        render(<ResourceForm {...baseProps} />);

        expect(screen.getByText('Tên không được để trống')).toBeInTheDocument();
        expect(screen.getByLabelText('Tên')).toHaveAttribute('aria-invalid', 'true');
    });
});
