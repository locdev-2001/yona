import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import WeeklyAvailability from './WeeklyAvailability';
import type { Inbox } from '../types';

const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
}));

vi.mock('dashboard/helper/apiClient', () => ({
    parseApiErrorMessage: () => '',
    patchJson: (...args: unknown[]) => patchJson(...args),
}));

const inboxWith = (overrides: Partial<Inbox>): Inbox =>
    ({
        id: 85,
        name: 'Shop Hoa Mai',
        channel_type: 'Channel::WebWidget',
        working_hours_enabled: false,
        out_of_office_message: '',
        working_hours: [],
        timezone: 'Asia/Ho_Chi_Minh',
        ...overrides,
    }) as unknown as Inbox;

const saveWithoutChanges = async (inbox: Inbox) => {
    patchJson.mockResolvedValue(inbox);
    const { container } = render(
        <WeeklyAvailability inbox={inbox} uiSettings={{}} onInboxUpdated={() => undefined} />,
    );
    fireEvent.click(container.querySelector('form button[type=submit]') as HTMLButtonElement);
    await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));

    return patchJson.mock.calls[0][1] as Record<string, unknown>;
};

describe('WeeklyAvailability — lưu mà không đổi gì', () => {
    beforeEach(() => {
        setLocale('vi');
        patchJson.mockReset();
    });

    it('giữ nguyên múi giờ UTC của hộp thư cũ', async () => {
        expect((await saveWithoutChanges(inboxWith({ timezone: 'UTC' }))).timezone).toBe('UTC');
    });

    it('giữ nguyên múi giờ Việt Nam', async () => {
        expect((await saveWithoutChanges(inboxWith({ timezone: 'Asia/Ho_Chi_Minh' }))).timezone).toBe(
            'Asia/Ho_Chi_Minh',
        );
    });

    it('giữ nguyên múi giờ không có trong danh sách chọn', async () => {
        expect((await saveWithoutChanges(inboxWith({ timezone: 'Pacific/Kiritimati' }))).timezone).toBe(
            'Pacific/Kiritimati',
        );
    });
});
