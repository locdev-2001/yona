import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { setLocale } from '../../../../../i18n';
import SignupJoinForm from './SignupJoinForm';

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

afterEach(() => {
    vi.clearAllMocks();
});

describe('SignupJoinForm', () => {
    it('disables submit until email and password are valid', () => {
        render(<SignupJoinForm token="abc123" />);

        const submit = screen.getByRole('button', { name: 'Tạo tài khoản và tham gia' });
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email'), { target: { value: 'person@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Đặt mật khẩu đăng nhập'), { target: { value: 'Password1!' } });

        expect(submit).toBeEnabled();
    });

    it('submits name, email, and password to the invite endpoint', () => {
        render(<SignupJoinForm token="abc123" />);

        fireEvent.change(screen.getByPlaceholderText('Nhập tên hiển thị'), { target: { value: 'New Person' } });
        fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email'), { target: { value: 'person@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Đặt mật khẩu đăng nhập'), { target: { value: 'Password1!' } });
        fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản và tham gia' }));

        expect(post).toHaveBeenCalledWith(
            '/invite/abc123',
            { name: 'New Person', email: 'person@example.com', password: 'Password1!' },
            expect.objectContaining({ onError: expect.any(Function), onFinish: expect.any(Function) }),
        );
    });

    it('does not submit while the email is invalid', () => {
        render(<SignupJoinForm token="abc123" />);

        fireEvent.change(screen.getByPlaceholderText('Nhập địa chỉ email'), { target: { value: 'not-an-email' } });
        fireEvent.change(screen.getByPlaceholderText('Đặt mật khẩu đăng nhập'), { target: { value: 'Password1!' } });
        fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản và tham gia' }));

        expect(post).not.toHaveBeenCalled();
    });
});
