import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('WeeklyAvailability — lịch tuần', () => {
    beforeEach(() => setLocale('vi'));

    const weekday = (day: number) => ({
        day_of_week: day,
        closed_all_day: day === 0,
        open_hour: day === 0 ? null : 9,
        open_minutes: day === 0 ? null : 0,
        close_hour: day === 0 ? null : 17,
        close_minutes: day === 0 ? null : 30,
        open_all_day: false,
    });

    it('hiện tên ngày tiếng Việt, thứ hai đầu tuần, giờ 24h', () => {
        render(
            <WeeklyAvailability
                inbox={inboxWith({ working_hours_enabled: true, working_hours: [0, 1, 2, 3, 4, 5, 6].map(weekday) })}
                uiSettings={{}}
                onInboxUpdated={() => undefined}
            />,
        );

        const days = screen.getAllByRole('listitem');
        const dayNames = days.map(day => within(day).getAllByRole('checkbox')[0].closest('label')?.textContent);
        expect(dayNames).toStrictEqual(['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']);

        const monday = days[0];
        expect(within(monday).getByRole('combobox', { name: 'Giờ bắt đầu Thứ hai' })).toHaveDisplayValue('09:00');
        expect(within(monday).getByRole('combobox', { name: 'Giờ kết thúc Thứ hai' })).toHaveDisplayValue('17:30');
        expect(within(monday).getByText('8 giờ 30 phút')).toBeInTheDocument();
        expect(within(days[6]).getByText('Nghỉ')).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/\b(AM|PM)\b|Sunday|Monday/);
    });
});
