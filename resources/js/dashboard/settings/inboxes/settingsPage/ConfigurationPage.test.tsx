import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../../i18n';
import ConfigurationPage from './ConfigurationPage';
import type { Inbox } from '../types';

// Link của Inertia cần router thật nên thay bằng <a>; usePage chỉ cần accountId.
vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
    router: { on: () => () => undefined },
}));

const patchJson = vi.fn();
vi.mock('dashboard/helper/apiClient', () => ({ patchJson: (...args: unknown[]) => patchJson(...args) }));

const WIDGET_SCRIPT = '<script>window.yonaSDK.run({websiteToken:"abc"})</script>';

const inboxDeclaring = (capabilities: string[]): Inbox =>
    ({
        id: 85,
        name: 'Yona',
        capabilities,
        web_widget_script: WIDGET_SCRIPT,
        inbox_identifier: 'inbox-identifier-85',
        selected_feature_flags: [],
    }) as unknown as Inbox;

const renderPage = (capabilities: string[]) =>
    render(<ConfigurationPage inbox={inboxDeclaring(capabilities)} onInboxUpdated={() => undefined} />);

describe('ConfigurationPage — khối đoạn mã nhúng', () => {
    it('hiện đoạn mã nhúng ngay đầu tab Cấu hình của kênh Website', () => {
        setLocale('vi');
        renderPage(['settings_web_widget']);

        const headings = screen.getAllByText(/Đoạn mã nhúng|Tên miền được phép/);
        expect(headings[0]).toHaveTextContent('Đoạn mã nhúng');
        expect(screen.getByText(/Dán đoạn mã này ngay trước thẻ/)).toBeInTheDocument();
        expect(document.querySelector('code')?.textContent).toContain('yonaSDK');
        expect(screen.getByText('Tuỳ chỉnh giao diện widget')).toHaveAttribute(
            'href',
            '/app/accounts/3/settings/inboxes/85/widget',
        );
        setLocale('en');
    });

    it('không hiện khối đoạn mã nhúng ở kênh khác Website', () => {
        renderPage(['settings_client_api']);

        expect(screen.queryByText('Embed script')).not.toBeInTheDocument();
        expect(screen.queryByText('Customize the widget appearance')).not.toBeInTheDocument();
        expect(document.querySelector('code')?.textContent).toContain('inbox-identifier-85');
    });

    it('kênh không khai khối cấu hình nào thì không mượn khối của kênh khác', () => {
        renderPage(['session_qr', 'settings_single_conversation']);

        expect(document.querySelector('code')).toBeNull();
    });
});

describe('ConfigurationPage — cùng một mô hình lưu', () => {
    it('công tắc không tự lưu; bấm Lưu thay đổi gửi một lần cả tên miền, webview và bắt buộc xác thực', async () => {
        patchJson.mockReset().mockResolvedValue(inboxDeclaring(['settings_web_widget']));
        renderPage(['settings_web_widget']);

        const [mobileWebview, requireIdentity] = screen.getAllByRole('switch');
        fireEvent.click(mobileWebview);
        fireEvent.click(requireIdentity);
        expect(patchJson).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        expect(patchJson).toHaveBeenCalledWith('/api/v1/accounts/3/inboxes/85', {
            channel: { allowed_domains: '', selected_feature_flags: ['allow_mobile_webview'], hmac_mandatory: true },
        });
    });
});
