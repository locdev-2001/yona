import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import type { CreatedInviteLink, InviteLink } from './types';

// Locale mặc định của bundle test là `en`; sản phẩm chạy tiếng Việt nên assert theo vi.
beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

const { getJson, postJson, deleteJson } = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    deleteJson: vi.fn(),
}));

vi.mock('dashboard/helper/apiClient', () => ({ getJson, postJson, deleteJson }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn().mockResolvedValue(undefined) }));

import InviteLinks from './InviteLinks';

const link = (overrides: Partial<InviteLink> = {}): InviteLink => ({
    id: 1,
    role: 'agent',
    status: 'active',
    expires_at: '2026-10-02T00:00:00+00:00',
    max_uses: null,
    use_count: 0,
    revoked_at: null,
    created_by_name: 'Admin Name',
    ...overrides,
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('InviteLinks', () => {
    it('lists existing links after fetching', async () => {
        getJson.mockResolvedValue([link({ id: 7, created_by_name: 'Loc' })]);

        render(<InviteLinks accountId={5} onClose={() => undefined} />);

        await waitFor(() => expect(screen.getByText(/Loc/)).toBeInTheDocument());
        expect(getJson).toHaveBeenCalledWith('/api/v1/accounts/5/invite_links');
    });

    it('shows the empty state when there are no links', async () => {
        getJson.mockResolvedValue([]);

        render(<InviteLinks accountId={5} onClose={() => undefined} />);

        await waitFor(() => expect(screen.getByText('Chưa có đường dẫn mời nào.')).toBeInTheDocument());
    });

    it('creates a link and reveals the one-time url banner', async () => {
        getJson.mockResolvedValue([]);
        const created: CreatedInviteLink = {
            link: link({ id: 9 }),
            url: 'https://yona.vn/invite/raw-token-value',
        };
        postJson.mockResolvedValue(created);

        render(<InviteLinks accountId={5} onClose={() => undefined} />);
        await waitFor(() => expect(getJson).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Tạo đường dẫn' }));

        await waitFor(() => expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/5/invite_links', {
            role: 'agent',
            expires_in_days: 7,
            max_uses: null,
        }));
        expect(await screen.findByDisplayValue(created.url)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Chia sẻ' })).not.toBeInTheDocument();
    });

    it('shows a share button and uses the OS share sheet when available', async () => {
        getJson.mockResolvedValue([]);
        const created: CreatedInviteLink = {
            link: link({ id: 9 }),
            url: 'https://yona.vn/invite/raw-token-value',
        };
        postJson.mockResolvedValue(created);
        const share = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { ...navigator, share });

        render(<InviteLinks accountId={5} onClose={() => undefined} />);
        await waitFor(() => expect(getJson).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Tạo đường dẫn' }));
        await screen.findByDisplayValue(created.url);

        fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));

        await waitFor(() => expect(share).toHaveBeenCalledWith({ url: created.url }));
        vi.unstubAllGlobals();
    });

    it('revokes a link after confirming', async () => {
        getJson.mockResolvedValue([link({ id: 3 })]);
        deleteJson.mockResolvedValue({ message: 'ok' });

        render(<InviteLinks accountId={5} onClose={() => undefined} />);
        await waitFor(() => expect(screen.getByText('Thu hồi')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Thu hồi' }));

        const confirmButtons = await screen.findAllByRole('button', { name: 'Thu hồi' });
        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await waitFor(() => expect(deleteJson).toHaveBeenCalledWith('/api/v1/accounts/5/invite_links/3'));
    });
});
