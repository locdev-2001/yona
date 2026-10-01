import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const routerVisit = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { visit: (...args: unknown[]) => routerVisit(...args) },
    usePage: () => ({ props: pageProps }),
}));

const enable = vi.fn();
const verify = vi.fn();
vi.mock('dashboard/settings/profile/mfa/mfaApi', () => ({
    createMfaApi: () => ({
        enable: (...args: unknown[]) => enable(...args),
        verify: (...args: unknown[]) => verify(...args),
    }),
}));

import { installDomStubs } from '../components/__fixtures__/dom';
import SuperAdminMfaSetup from './MfaSetup';

const superAdmin = {
    installationName: 'Yona',
    logo: '/logo.svg',
    logoThumbnail: '/logo-thumb.svg',
    version: '1.0',
    navigation: [],
    toolPages: [],
    settingsPages: [],
    labels: { login_password: 'Mật khẩu' },
    currentPath: '/admin/mfa/setup',
};

// Màn bắt buộc cài đặt 2FA — server (MfaController::setupPage) chỉ điều hướng
// tới đây khi chưa bật 2FA, nên trang tự gọi enable() lấy QR ngay khi mở.
describe('SuperAdminMfaSetup', () => {
    beforeEach(() => {
        installDomStubs();
        routerVisit.mockReset();
        enable.mockReset();
        verify.mockReset();
        pageProps = { superAdmin };
    });

    it('gọi enable() để lấy QR khi mở trang', async () => {
        enable.mockResolvedValue({ provisioning_url: 'otpauth://totp/x', secret: 'ABCDEF' });

        render(<SuperAdminMfaSetup />);

        await waitFor(() => expect(enable).toHaveBeenCalledTimes(1));
        expect(await screen.findByDisplayValue('ABCDEF')).toBeInTheDocument();
    });

    it('báo lỗi khi enable() thất bại', async () => {
        enable.mockRejectedValue(new Error('network'));

        render(<SuperAdminMfaSetup />);

        expect(await screen.findByText('MFA not enabled. Please contact administrator.')).toBeInTheDocument();
    });

    it('nhập đủ 6 số thì xác minh, rồi bắt xác nhận đã lưu mã dự phòng trước khi vào console', async () => {
        enable.mockResolvedValue({ provisioning_url: 'otpauth://totp/x', secret: 'ABCDEF' });
        verify.mockResolvedValue({ enabled: true, backup_codes: ['aaaa1111', 'bbbb2222'] });

        render(<SuperAdminMfaSetup />);
        await screen.findByDisplayValue('ABCDEF');

        await act(async () => {
            fireEvent.change(document.querySelector('input[data-input-otp]')!, { target: { value: '123456' } });
        });

        expect(verify).toHaveBeenCalledWith('123456');
        expect(await screen.findByText('aaaa1111')).toBeInTheDocument();

        const complete = screen.getByRole('button', { name: 'Complete Setup' });
        expect(complete).toBeDisabled();
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(complete);

        expect(routerVisit).toHaveBeenCalledWith('/admin');
    });

    it('mã sai thì báo lỗi và ở lại bước quét QR', async () => {
        enable.mockResolvedValue({ provisioning_url: 'otpauth://totp/x', secret: 'ABCDEF' });
        verify.mockRejectedValue(new Error('invalid'));

        render(<SuperAdminMfaSetup />);
        await screen.findByDisplayValue('ABCDEF');

        await act(async () => {
            fireEvent.change(document.querySelector('input[data-input-otp]')!, { target: { value: '000000' } });
        });

        expect(await screen.findByText('Invalid verification code')).toBeInTheDocument();
        expect(screen.queryByText('Complete Setup')).not.toBeInTheDocument();
    });
});
