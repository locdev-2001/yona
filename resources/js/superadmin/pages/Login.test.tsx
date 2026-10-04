import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const post = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
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
        pageProps = { superAdmin: baseSuperAdmin };
    });

    it('hiện form mật khẩu khi chưa cần OTP', () => {
        render(<SuperAdminLogin />);

        expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    });

    it('chỉ hiện form mật khẩu kể cả khi còn props OTP cũ', () => {
        pageProps = { superAdmin: baseSuperAdmin, otpRequired: true, otpToken: 'tok-123' };

        render(<SuperAdminLogin />);

        expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
        expect(document.querySelector('input[data-input-otp]')).toBeNull();
    });

    it('gửi thông tin đăng nhập tới /admin/sign_in', () => {
        render(<SuperAdminLogin />);
        fireEvent.submit(document.querySelector('form')!);

        expect(post).toHaveBeenCalledWith('/admin/sign_in');
    });
});
