import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import ConfigurationPage from './ConfigurationPage';
import type { Inbox } from '../types';

// Link của Inertia cần router thật nên thay bằng <a>; usePage chỉ cần accountId.
vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
}));

const WIDGET_SCRIPT = '<script>window.yonaSDK.run({websiteToken:"abc"})</script>';

const inboxOfType = (channelType: string): Inbox =>
    ({
        id: 85,
        name: 'Yona',
        channel_type: channelType,
        web_widget_script: WIDGET_SCRIPT,
        selected_feature_flags: [],
    }) as unknown as Inbox;

const renderPage = (channelType: string) =>
    render(<ConfigurationPage inbox={inboxOfType(channelType)} onInboxUpdated={() => undefined} />);

describe('ConfigurationPage — khối đoạn mã nhúng', () => {
    it('hiện đoạn mã nhúng ngay đầu tab Cấu hình của kênh Website', () => {
        setLocale('vi');
        renderPage('Channel::WebWidget');

        const headings = screen.getAllByText(/Đoạn mã nhúng|Tên miền được phép/);
        expect(headings[0]).toHaveTextContent('Đoạn mã nhúng');
        expect(screen.getByText(/Dán đoạn mã này ngay trước thẻ/)).toBeInTheDocument();
        expect(document.querySelector('code')?.textContent).toContain('yonaSDK');
        expect(screen.getByText('Tuỳ chỉnh giao diện widget')).toHaveAttribute(
            'href',
            '/app/accounts/3/settings/inboxes/85',
        );
        setLocale('en');
    });

    it('không hiện khối đoạn mã nhúng ở kênh khác Website', () => {
        renderPage('Channel::Api');

        expect(screen.queryByText('Embed script')).not.toBeInTheDocument();
        expect(screen.queryByText('Customize the widget appearance')).not.toBeInTheDocument();
    });
});
