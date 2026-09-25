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
vi.mock('../mfaApi', () => ({
    superAdminMfaApi: {
        enable: (...args: unknown[]) => enable(...args),
        verify: (...args: unknown[]) => verify(...args),
    },
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

// Dash #39: màn bắt buộc cài đặt 2FA — server chỉ điều hướng tới đây khi chưa
// bật 2FA, nên trang tự gọi enable() lấy QR ngay khi mở, trừ khi đã bật rồi.
describe('SuperAdminMfaSetup', () => {
    beforeEach(() => {
        routerVisit.mockReset();
        enable.mockReset();
        verify.mockReset();
        pageProps = { superAdmin, mfaEnabled: false };
    });

    it('gọi enable() để lấy QR khi chưa bật 2FA', async () => {
        enable.mockResolvedValue({ provisioning_url: 'otpauth://totp/x', secret: 'ABCDEF' });

        render(<SuperAdminMfaSetup />);

        await waitFor(() => expect(enable).toHaveBeenCalledTimes(1));
        expect(await screen.findByDisplayValue('ABCDEF')).toBeInTheDocument();
    });

    it('không gọi enable() và không hiện gì khi đã bật 2FA', () => {
        pageProps = { superAdmin, mfaEnabled: true };

        const { container } = render(<SuperAdminMfaSetup />);

        expect(enable).not.toHaveBeenCalled();
        expect(container).toBeEmptyDOMElement();
    });

    it('báo lỗi khi enable() thất bại', async () => {
        enable.mockRejectedValue(new Error('network'));

        render(<SuperAdminMfaSetup />);

        expect(await screen.findByText('Could not start 2FA setup.')).toBeInTheDocument();
    });
});
