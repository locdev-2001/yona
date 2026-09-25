import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

import SuperAdminMfaSetup from './MfaSetup';

const superAdmin = {
    installationName: 'Yona',
    logo: '/logo.svg',
    logoThumbnail: '/logo-thumb.svg',
    version: '1.0',
    navigation: [],
    settingsPages: [],
    currentPath: '/super_admin/mfa/setup',
};

// Màn bắt buộc cài đặt 2FA — server (MfaController::setupPage) chỉ điều hướng
// tới đây khi chưa bật 2FA, nên trang tự gọi enable() lấy QR ngay khi mở.
describe('SuperAdminMfaSetup', () => {
    beforeEach(() => {
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
});
