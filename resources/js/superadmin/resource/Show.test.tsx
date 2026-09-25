import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn(), delete: vi.fn() },
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        post: vi.fn(),
        processing: false,
    }),
}));

vi.mock('dashboard/helper/apiClient', () => ({ xsrfToken: () => 'test-csrf-token' }));

import ResourceShow from './Show';

const baseProps = {
    resource: 'users',
    singularLabel: 'User',
    record: { id: 5, title: 'User #5', url: '/super_admin/users/5' },
    fields: [],
    actions: ['index', 'show'],
};

// Dash #38: đăng nhập hộ giờ đòi lý do trước khi mở form thật (POST, không
// còn là <a> GET như bản cũ) — form chỉ hiện sau khi bấm "Impersonate user".
describe('ResourceShow — mục đăng nhập hộ', () => {
    it('không hiện nút đăng nhập hộ khi không có impersonateUrl', () => {
        render(<ResourceShow {...baseProps} />);

        expect(screen.queryByText('Impersonate user')).not.toBeInTheDocument();
    });

    it('mở form lý do khi bấm nút, khoá nút gửi tới khi đủ độ dài', () => {
        render(<ResourceShow {...baseProps} impersonateUrl="/super_admin/users/5/impersonate" />);

        fireEvent.click(screen.getByRole('button', { name: 'Impersonate user' }));

        const submit = screen.getByRole('button', { name: 'Confirm & impersonate' }) as HTMLButtonElement;
        expect(submit.disabled).toBe(true);

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'điều tra sự cố khách báo lỗi' } });

        expect(submit.disabled).toBe(false);
    });

    it('form gửi POST tới đúng impersonateUrl kèm CSRF token', () => {
        render(<ResourceShow {...baseProps} impersonateUrl="/super_admin/users/5/impersonate" />);
        fireEvent.click(screen.getByRole('button', { name: 'Impersonate user' }));

        const form = document.querySelector('form') as HTMLFormElement;
        expect(form.method.toLowerCase()).toBe('post');
        expect(form.getAttribute('action')).toBe('/super_admin/users/5/impersonate');
        expect(form.target).toBe('_blank');
        expect((form.querySelector('input[name="_token"]') as HTMLInputElement).value).toBe('test-csrf-token');
    });
});
