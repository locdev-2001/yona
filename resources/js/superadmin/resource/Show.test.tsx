import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { superAdminProps } from '../components/__fixtures__/superAdmin';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a>,
    usePage: () => ({ props: { superAdmin: superAdminProps() } }),
    router: { post: vi.fn(), delete: vi.fn() },
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        post: vi.fn(),
        processing: false,
    }),
}));

import ResourceShow from './Show';

const baseProps = {
    resource: 'users',
    singularLabel: 'User',
    record: { id: 5, title: 'User #5', url: '/admin/users/5' },
    fields: [],
    actions: ['index', 'show'],
};

// Đăng nhập hộ đòi lý do trước khi mở form thật (POST, không phải <a> GET) —
// form chỉ hiện sau khi bấm nút "Đăng nhập hộ".
describe('ResourceShow — mục đăng nhập hộ', () => {
    it('không hiện nút đăng nhập hộ khi không có impersonateUrl', () => {
        render(<ResourceShow {...baseProps} />);

        expect(screen.queryByRole('button', { name: 'Đăng nhập hộ' })).not.toBeInTheDocument();
    });

    it('mở form lý do khi bấm nút, khoá nút gửi tới khi đủ độ dài', () => {
        render(<ResourceShow {...baseProps} impersonateUrl="/admin/users/5/impersonate" />);

        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập hộ' }));

        const submit = screen.getByRole('button', { name: 'Xác nhận và đăng nhập hộ' }) as HTMLButtonElement;
        expect(submit.disabled).toBe(true);

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'điều tra sự cố khách báo lỗi' } });

        expect(submit.disabled).toBe(false);
    });

    it('form gửi POST tới đúng impersonateUrl kèm CSRF token thô từ prop csrf', () => {
        render(
            <ResourceShow
                {...baseProps}
                impersonateUrl="/admin/users/5/impersonate"
                csrf="real-csrf-token"
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập hộ' }));

        const form = document.querySelector('form[target="_blank"]') as HTMLFormElement;
        expect(form.method.toLowerCase()).toBe('post');
        expect(form.getAttribute('action')).toBe('/admin/users/5/impersonate');
        expect(form.target).toBe('_blank');
        expect((form.querySelector('input[name="_token"]') as HTMLInputElement).value).toBe('real-csrf-token');
    });
});
