import { render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { pageProps } = vi.hoisted(() => ({ pageProps: { current: {} as Record<string, unknown> } }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: pageProps.current }),
    Head: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    router: { post: vi.fn() },
}));

import { setLocale } from '../../../../i18n';
import InviteIndex from './Index';

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

function withProps(props: Record<string, unknown>) {
    pageProps.current = {
        auth: { user: null },
        flash: { alert: null },
        globalConfig: {},
        ...props,
    };
}

afterEach(() => {
    vi.clearAllMocks();
});

describe('InviteIndex', () => {
    it('shows the signup form with the account name for an active link when the visitor is a guest', () => {
        withProps({ status: 'active', token: 'abc123', account: { name: 'Wayne Enterprises', role: 'agent' } });

        render(<InviteIndex />);

        expect(screen.getAllByText(/Wayne Enterprises/).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Tạo tài khoản và tham gia' })).toBeInTheDocument();
    });

    it('shows the one-click join button when the visitor is already signed in', () => {
        withProps({
            status: 'active',
            token: 'abc123',
            account: { name: 'Wayne Enterprises', role: 'administrator' },
            auth: { user: { email: 'bruce@wayne.enterprises' } },
        });

        render(<InviteIndex />);

        expect(screen.getByRole('button', { name: 'Tham gia ngay' })).toBeInTheDocument();
        expect(screen.getByText(/bruce@wayne.enterprises/)).toBeInTheDocument();
    });

    it.each([
        ['revoked', 'Lời mời đã bị thu hồi'],
        ['expired', 'Lời mời đã hết hạn'],
        ['exhausted', 'Lời mời đã hết lượt dùng'],
        ['not_found', 'Không tìm thấy lời mời'],
    ])('shows a clear message for a %s link', (status, expectedTitle) => {
        withProps({ status, token: 'abc123', account: null });

        render(<InviteIndex />);

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    });
});
