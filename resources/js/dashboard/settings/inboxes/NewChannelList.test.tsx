import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 4 } } }),
}));
vi.mock('../../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../SettingsContent', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./WizardLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
    INBOX_WIZARD_ROUTES: { CHANNEL: 'channel' },
}));

import NewChannelList from './NewChannelList';
import type { ChannelConnection } from './channelConnection';

// Màn "Thêm kênh" vẽ đúng các lối vào backend gửi xuống, theo đúng thứ tự — không tự
// thêm kênh, không có thẻ "sắp ra mắt", SMS không xuất hiện khi backend không gửi.
const entry = (key: string, method: ChannelConnection['method']): ChannelConnection => ({
    key,
    method,
    available: true,
    preset: null,
    guide_url: null,
    start_url: null,
    options: [],
});

beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
});

describe('NewChannelList', () => {
    it('chỉ hiện kênh ưu tiên backend gửi xuống, đúng thứ tự', () => {
        render(<NewChannelList channels={[entry('zalo', 'qr'), entry('email', 'form'), entry('telegram', 'token')]} />);

        const titles = screen.getAllByRole('button').map(button => button.querySelector('h3')?.textContent);
        expect(titles).toStrictEqual(['Zalo', 'Email']);
        expect(screen.queryByText('SMS')).toBeNull();
        expect(screen.queryByText(/Coming soon/i)).toBeNull();
    });

    it('bấm thẻ thì sang bước 2 của đúng kênh', () => {
        render(<NewChannelList channels={[entry('email', 'form')]} />);

        fireEvent.click(screen.getByRole('button', { name: /Email/ }));

        expect(window.location.href).toBe('/app/accounts/4/settings/inboxes/new/email');
    });
});
