import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../../i18n';
import WeeklyAvailability from './WeeklyAvailability';
import type { Inbox } from '../types';

const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
    router: { on: () => () => undefined },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    parseApiErrorMessage: () => '',
    patchJson: (...args: unknown[]) => patchJson(...args),
}));

// Vài mục của danh sách máy chủ cấp (App\Support\Timezones).
const TIME_ZONE_OPTIONS = [
    { label: 'UTC (UTC+00:00)', value: 'UTC' },
    { label: 'Bangkok (GMT+07:00)', value: 'Asia/Bangkok' },
    { label: 'Hanoi (GMT+07:00)', value: 'Asia/Ho_Chi_Minh' },
];

const renderWeeklyAvailability = (inbox: Inbox) =>
    render(<WeeklyAvailability inbox={inbox} timeZoneOptions={TIME_ZONE_OPTIONS} uiSettings={{}} onInboxUpdated={() => undefined} />);

const submittedPayload = async () => {
    fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));
    await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));

    return patchJson.mock.calls[0][1] as Record<string, unknown>;
};

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

// Chỉ bật giờ làm việc, không đụng tới múi giờ: múi giờ đang lưu phải đi nguyên vẹn.
const saveWithoutTouchingTimeZone = async (inbox: Inbox) => {
    patchJson.mockResolvedValue(inbox);
    renderWeeklyAvailability(inbox);
    fireEvent.click(screen.getByRole('switch'));

    return submittedPayload();
};

describe('WeeklyAvailability — lưu mà không đổi múi giờ', () => {
    beforeEach(() => {
        setLocale('vi');
        patchJson.mockReset();
    });

    it('giữ nguyên múi giờ UTC của hộp thư cũ', async () => {
        expect((await saveWithoutTouchingTimeZone(inboxWith({ timezone: 'UTC' }))).timezone).toBe('UTC');
    });

    it('giữ nguyên múi giờ Việt Nam', async () => {
        expect((await saveWithoutTouchingTimeZone(inboxWith({ timezone: 'Asia/Ho_Chi_Minh' }))).timezone).toBe(
            'Asia/Ho_Chi_Minh',
        );
    });

    it('giữ nguyên múi giờ không có trong danh sách chọn', async () => {
        expect((await saveWithoutTouchingTimeZone(inboxWith({ timezone: 'Pacific/Kiritimati' }))).timezone).toBe(
            'Pacific/Kiritimati',
        );
    });
});

describe('WeeklyAvailability — đổi múi giờ', () => {
    beforeEach(() => {
        setLocale('vi');
        patchJson.mockReset();
    });

    it('chọn mục UTC thì gửi đúng giá trị của danh sách', async () => {
        const inbox = inboxWith({ working_hours_enabled: true, timezone: 'Asia/Bangkok' });
        patchJson.mockResolvedValue(inbox);
        renderWeeklyAvailability(inbox);

        fireEvent.click(screen.getByRole('button', { name: /Bangkok.*\(GMT\+07:00\)/ }));
        fireEvent.click(screen.getByRole('option', { name: 'Giờ quốc tế (UTC) (GMT+00:00)' }));

        expect((await submittedPayload()).timezone).toBe('UTC');
    });
});

describe('WeeklyAvailability — mô hình lưu chung', () => {
    beforeEach(() => {
        setLocale('vi');
        patchJson.mockReset();
    });

    it('chưa sửa gì thì nút lưu tắt; bật giờ làm việc rồi Huỷ thì về như cũ, không gửi gì', () => {
        renderWeeklyAvailability(inboxWith({}));
        const saveButton = screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') });
        expect(saveButton).toBeDisabled();

        fireEvent.click(screen.getByRole('switch'));
        expect(saveButton).not.toBeDisabled();
        expect(screen.getByText(t('SETTINGS_DRAFT.UNSAVED'))).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.CANCEL') }));
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
        expect(saveButton).toBeDisabled();
        expect(patchJson).not.toHaveBeenCalled();
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
        renderWeeklyAvailability(inboxWith({ working_hours_enabled: true, working_hours: [0, 1, 2, 3, 4, 5, 6].map(weekday) }));

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
