import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            currentAccount: { id: 2 },
            currentAccountUser: { availability: 'online', auto_offline: true },
            auth: { user: { id: 7 } },
        },
    }),
}));

const { postJson, realtimeStore } = vi.hoisted(() => ({
    postJson: vi.fn(),
    realtimeStore: { setCurrentUserAvailability: vi.fn(), updateSingleAgentPresence: vi.fn() },
}));
vi.mock('dashboard/helper/apiClient', () => ({ postJson }));
vi.mock('dashboard/realtime/store', () => ({ realtimeStore }));
vi.mock('dashboard/realtime/hooks', () => ({ useCurrentUserAvailability: () => 'online' }));

import { DropdownContainer } from 'dashboard/components-next/dropdown-menu/base';
import SidebarProfileMenuStatus from './SidebarProfileMenuStatus';

// auth.js#updateAvailability: commit optimistic → API → agents/updateSingleAgentPresence;
// lỗi → commit lại trạng thái cũ, không toast (action nuốt lỗi).
async function chooseBusy() {
    const view = render(
        <DropdownContainer menu={<SidebarProfileMenuStatus />}>{({ toggle }) => <button onClick={toggle}>open</button>}</DropdownContainer>,
    );
    fireEvent.click(view.getByText('open'));
    fireEvent.click(view.getByText('Online'));
    fireEvent.click(view.getByText('Busy'));
    return view;
}

describe('SidebarProfileMenuStatus availability change', () => {
    beforeEach(() => {
        postJson.mockReset();
        realtimeStore.setCurrentUserAvailability.mockReset();
        realtimeStore.updateSingleAgentPresence.mockReset();
    });

    it('applies optimistically then syncs the agent presence map on success', async () => {
        postJson.mockResolvedValue({});
        await chooseBusy();

        expect(realtimeStore.setCurrentUserAvailability).toHaveBeenCalledWith('busy');
        expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/2/profile/availability', { availability: 'busy' });
        await waitFor(() => expect(realtimeStore.updateSingleAgentPresence).toHaveBeenCalledWith(7, 'busy'));
    });

    it('reverts silently to the previous status when the request fails', async () => {
        postJson.mockRejectedValue(new Error('network'));
        await chooseBusy();

        expect(realtimeStore.setCurrentUserAvailability.mock.calls[0]).toEqual(['busy']);
        await waitFor(() => expect(realtimeStore.setCurrentUserAvailability).toHaveBeenLastCalledWith('online'));
        expect(realtimeStore.updateSingleAgentPresence).not.toHaveBeenCalled();
    });
});
