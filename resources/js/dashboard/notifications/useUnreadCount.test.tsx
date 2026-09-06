import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2 } } }),
}));

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', () => ({
    getJson: (url: string) => getJson(url),
}));

import { useNotificationsUnreadCount } from './useUnreadCount';

function Probe() {
    const count = useNotificationsUnreadCount();
    return <span data-testid="count">{count}</span>;
}

describe('useNotificationsUnreadCount', () => {
    beforeEach(() => {
        getJson.mockReset();
        getJson.mockResolvedValue(3);
    });

    it('reads the unread count from the API on mount', async () => {
        const { getByTestId } = render(<Probe />);

        await waitFor(() => expect(getByTestId('count').textContent).toBe('3'));
        expect(getJson).toHaveBeenCalledWith('/api/v1/accounts/2/notifications/unread_count');
    });

    it('follows the counter carried by the realtime events', async () => {
        const { getByTestId } = render(<Probe />);
        await waitFor(() => expect(getByTestId('count').textContent).toBe('3'));

        act(() => emitter.emit('notification.created', { unread_count: 4, count: 4 }));
        expect(getByTestId('count').textContent).toBe('4');

        act(() => emitter.emit('notification.updated', { unread_count: 0, count: 4 }));
        expect(getByTestId('count').textContent).toBe('0');
    });
});
