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

import SuperAdminLogin from './Login';

const baseSuperAdmin = {
    installationName: 'Yona',
    logo: '/logo.svg',
    logoThumbnail: '/logo-thumb.svg',
    version: '1.0',
    navigation: [],
    settingsPages: [],
    currentPath: '/super_admin/sign_in',
};

describe('SuperAdminLogin', () => {
    beforeEach(() => {
        post.mockReset();
        routerPost.mockReset();
        pageProps = { superAdmin: baseSuperAdmin };
    });

    it('hiện form mật khẩu khi chưa cần OTP', () => {
        render(<SuperAdminLogin />);

        expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('chuyển sang màn OTP khi server báo otpRequired kèm token', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);

        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
        expect(document.querySelectorAll('input[inputmode="numeric"]').length).toBe(6);
    });

    it('gửi otp_token và mã đã nhập tới /super_admin/sign_in', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);
        const inputs = document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]');
        '123456'.split('').forEach((digit, index) => fireEvent.change(inputs[index], { target: { value: digit } }));

        expect(routerPost).toHaveBeenCalledWith(
            '/super_admin/sign_in',
            { otp_token: 'tok-123', otp_code: '123456', backup_code: '' },
            expect.objectContaining({ onFinish: expect.any(Function) }),
        );
    });

    it('không hiện lại màn OTP nữa sau khi bấm huỷ', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel and return to login' }));

        expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });
});
