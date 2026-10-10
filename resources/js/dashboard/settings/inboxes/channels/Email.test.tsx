import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2 } } }),
}));

const { postJson, parseApiErrorMessage, useAlert } = vi.hoisted(() => ({
    postJson: vi.fn(),
    parseApiErrorMessage: vi.fn((): string | null => null),
    useAlert: vi.fn(),
}));
vi.mock('dashboard/helper/apiClient', () => ({ postJson, parseApiErrorMessage }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert }));

import EmailChannelForm from './Email';
import type { ChannelConnection } from '../channelConnection';

const GMAIL_PRESET = {
    imap_address: 'imap.gmail.com',
    imap_port: 993,
    imap_enable_ssl: true,
    smtp_address: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_enable_starttls_auto: true,
    smtp_enable_ssl_tls: false,
};

const option = (key: string, overrides: Partial<ChannelConnection> = {}): ChannelConnection => ({
    key,
    method: 'form',
    available: true,
    preset: null,
    guide_url: null,
    logo_url: null,
    start_url: null,
    options: [],
    ...overrides,
});

const connection = (options: ChannelConnection[]): ChannelConnection => ({
    ...option('email'),
    options,
});

beforeEach(() => {
    postJson.mockReset();
    postJson.mockResolvedValue({ id: 9 });
    parseApiErrorMessage.mockReset();
    parseApiErrorMessage.mockReturnValue(null);
    Object.defineProperty(window, 'location', { value: { replace: vi.fn(), href: '' }, writable: true });
});

const inputByLabel = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

describe('form Email', () => {
    it('chỉ hiện các nhà cung cấp backend mở', () => {
        render(
            <EmailChannelForm
                connection={connection([
                    option('gmail', { preset: GMAIL_PRESET }),
                    option('other'),
                ])}
            />,
        );

        expect(screen.getByRole('button', { name: /Gmail/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Other/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Sign in with Google/ })).toBeNull();
    });

    it('Gmail: chỉ hỏi email + App Password, tự điền máy chủ chuẩn, có link tạo App Password', async () => {
        render(
            <EmailChannelForm
                connection={connection([
                    option('gmail', { preset: GMAIL_PRESET, guide_url: 'https://myaccount.google.com/apppasswords' }),
                    option('other'),
                ])}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Gmail/ }));

        expect(screen.getByRole('link', { name: /Create an App Password/ }).getAttribute('href')).toBe(
            'https://myaccount.google.com/apppasswords',
        );
        expect(document.querySelectorAll('form input')).toHaveLength(2);

        fireEvent.change(inputByLabel(/Email address/), { target: { value: 'shop@gmail.com' } });
        fireEvent.change(inputByLabel(/App Password/), { target: { value: 'abcd efgh ijkl mnop' } });
        fireEvent.click(screen.getByRole('button', { name: /Connect mailbox/ }));

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][1]).toStrictEqual({
            channel: {
                type: 'email',
                email: 'shop@gmail.com',
                ...GMAIL_PRESET,
                imap_enabled: true,
                imap_login: 'shop@gmail.com',
                imap_password: 'abcd efgh ijkl mnop',
                smtp_enabled: true,
                smtp_login: 'shop@gmail.com',
                smtp_password: 'abcd efgh ijkl mnop',
            },
        });
    });

    it('máy chủ từ chối App Password thì hiện lời nhắn ngay dưới form', async () => {
        postJson.mockRejectedValueOnce(new Error('422'));
        parseApiErrorMessage.mockReturnValueOnce('The IMAP server imap.gmail.com rejected the login.');
        render(<EmailChannelForm connection={connection([option('gmail', { preset: GMAIL_PRESET })])} />);

        fireEvent.change(inputByLabel(/Email address/), { target: { value: 'shop@gmail.com' } });
        fireEvent.change(inputByLabel(/App Password/), { target: { value: 'sai' } });
        fireEvent.click(screen.getByRole('button', { name: /Connect mailbox/ }));

        await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('rejected the login'));
    });

    it('Khác: form đầy đủ, gửi máy chủ IMAP/SMTP người dùng điền', async () => {
        render(<EmailChannelForm connection={connection([option('gmail', { preset: GMAIL_PRESET }), option('other')])} />);
        fireEvent.click(screen.getByRole('button', { name: /Other/ }));

        fireEvent.change(inputByLabel(/Inbox name/), { target: { value: 'Hỗ trợ' } });
        fireEvent.change(inputByLabel(/Email address/), { target: { value: 'cs@acme.vn' } });
        const servers = screen.getAllByLabelText(/Server/) as HTMLInputElement[];
        fireEvent.change(servers[0], { target: { value: 'mail.acme.vn' } });
        fireEvent.change(servers[1], { target: { value: 'mail.acme.vn' } });
        const passwords = screen.getAllByLabelText(/^Password/) as HTMLInputElement[];
        fireEvent.change(passwords[0], { target: { value: 'pw' } });
        fireEvent.click(screen.getByRole('button', { name: /Connect mailbox/ }));

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][1]).toStrictEqual({
            name: 'Hỗ trợ',
            channel: {
                type: 'email',
                email: 'cs@acme.vn',
                imap_enabled: true,
                imap_address: 'mail.acme.vn',
                imap_port: 993,
                imap_enable_ssl: true,
                imap_login: 'cs@acme.vn',
                imap_password: 'pw',
                smtp_enabled: true,
                smtp_address: 'mail.acme.vn',
                smtp_port: 587,
                smtp_enable_ssl_tls: false,
                smtp_login: 'cs@acme.vn',
                smtp_password: 'pw',
            },
        });
    });

    it('lối OAuth chuyển sang trang của nhà cung cấp', () => {
        render(
            <EmailChannelForm
                connection={connection([
                    option('microsoft', { method: 'oauth_redirect', start_url: '/app/accounts/2/email/oauth/microsoft' }),
                    option('other'),
                ])}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Sign in with Microsoft/ }));

        expect(window.location.href).toBe('/app/accounts/2/email/oauth/microsoft');
        expect(postJson).not.toHaveBeenCalled();
    });

    it('nhà cung cấp sắp ra mắt hiện mờ kèm huy hiệu và không bấm được', () => {
        render(
            <EmailChannelForm
                connection={connection([
                    option('google', { method: 'oauth_redirect', start_url: '/oauth/google/start' }),
                    option('microsoft', { method: 'oauth_redirect', coming_soon: true }),
                    option('other', { coming_soon: true }),
                ])}
            />,
        );

        const other = screen.getByRole('button', { name: /Khác|Other/ }) as HTMLButtonElement;
        expect(other.disabled).toBe(true);
        expect(screen.getAllByText(/Sắp ra mắt|Coming soon/)).toHaveLength(2);
        fireEvent.click(other);
        expect(screen.queryByLabelText(/IMAP|Máy chủ/)).toBeNull();
        expect(window.location.href).toBe('');
    });
});
