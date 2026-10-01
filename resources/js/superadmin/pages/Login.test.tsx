import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const post = vi.fn();
const routerPost = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: (...args: unknown[]) => routerPost(...args) },
    usePage: () => ({ props: pageProps }),
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        post: (...args: unknown[]) => post(...args),
        processing: false,
    }),
}));

import { installDomStubs } from '../components/__fixtures__/dom';
import SuperAdminLogin from './Login';

const baseSuperAdmin = {
    installationName: 'Yona',
    logo: '/logo.svg',
    logoThumbnail: '/logo-thumb.svg',
    version: '1.0',
    navigation: [],
    toolPages: [],
    settingsPages: [],
    labels: { login_password: 'Mật khẩu' },
    currentPath: '/admin/sign_in',
};

describe('SuperAdminLogin', () => {
    beforeEach(() => {
        installDomStubs();
        post.mockReset();
        routerPost.mockReset();
        pageProps = { superAdmin: baseSuperAdmin };
    });

    it('hiện form mật khẩu khi chưa cần OTP', () => {
        render(<SuperAdminLogin />);

        expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    });

    it('chuyển sang màn OTP khi server báo otpRequired kèm token', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);

        expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
        expect(document.querySelector('input[data-input-otp]')).toHaveAttribute('maxlength', '6');
    });

    it('gửi otp_token và mã đã nhập tới /admin/sign_in', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);
        const input = document.querySelector<HTMLInputElement>('input[data-input-otp]')!;
        fireEvent.change(input, { target: { value: '123456' } });

        expect(routerPost).toHaveBeenCalledWith(
            '/admin/sign_in',
            { otp_token: 'tok-123', otp_code: '123456', backup_code: '' },
            expect.objectContaining({ onFinish: expect.any(Function) }),
        );
    });

    it('đổi sang mã dự phòng và gửi backup_code', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);
        fireEvent.click(screen.getByRole('button', { name: 'Backup Code' }));
        fireEvent.change(screen.getByLabelText('Enter one of your backup codes'), { target: { value: 'abcd1234' } });
        fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

        expect(routerPost).toHaveBeenCalledWith(
            '/admin/sign_in',
            { otp_token: 'tok-123', otp_code: '', backup_code: 'abcd1234' },
            expect.objectContaining({ onFinish: expect.any(Function) }),
        );
    });

    it('hiện lỗi đăng nhập từ máy chủ và gửi form tới /admin/sign_in', () => {
        pageProps = { superAdmin: baseSuperAdmin, flash: { error: 'Invalid credentials. Please try again.' } };

        render(<SuperAdminLogin />);
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials. Please try again.');
        fireEvent.submit(document.getElementById('new_super_admin')!);

        expect(post).toHaveBeenCalledWith('/admin/sign_in');
    });

    it('không hiện lại màn OTP nữa sau khi bấm huỷ', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel and return to login' }));

        expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    });
});
