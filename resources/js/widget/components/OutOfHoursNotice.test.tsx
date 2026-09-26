import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OutOfHoursNotice, { OutOfHoursBanner } from './OutOfHoursNotice';
import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact, WorkingHour } from '../types';

// Hộp thư và khách cùng múi giờ để câu chữ không phụ thuộc máy chạy test.
const VISITOR_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const MONDAY_EVENING = new Date(2026, 8, 21, 21, 0);
const WEEKDAYS_8_TO_22: WorkingHour[] = [1, 2, 3, 4, 5].map(dayOfWeek => ({
    dayOfWeek,
    openHour: 8,
    openMinutes: 0,
    closeHour: 22,
    closeMinutes: 0,
}));

const useChannel = (overrides: Partial<ChannelConfig> = {}, contact: Partial<WidgetContact> = {}) =>
    widgetStore.setChannelConfig(
        {
            websiteName: 'Yona',
            workingHoursEnabled: true,
            workingHours: WEEKDAYS_8_TO_22.map(slot => ({ ...slot, closeHour: 20 })),
            utcOffset: VISITOR_ZONE,
            timezone: VISITOR_ZONE,
            outOfOfficeMessage: null,
            ...overrides,
        } as unknown as ChannelConfig,
        {},
        { has_email: false, ...contact } as WidgetContact,
    );

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MONDAY_EVENING);
    useChannel({ workingHours: WEEKDAYS_8_TO_22.map(slot => ({ ...slot, closeHour: 20 })) });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('ngoài giờ hỗ trợ', () => {
    it('ghi khung trực và giờ mở cửa lại tính từ giờ làm việc của hộp thư', () => {
        render(<OutOfHoursNotice />);

        expect(screen.getByTestId('out-of-hours').textContent).toContain(
            'Our team is available from 8:00 AM to 8:00 PM. Leave a message and we will reply when we open at 8:00 AM tomorrow.',
        );
    });

    it('hộp thư có tin ngoài giờ tự cấu hình thì hiện tin đó, kèm giờ mở cửa lại', () => {
        useChannel({ outOfOfficeMessage: 'Shop nghỉ tối, sáng mai trả lời nha' });

        render(<OutOfHoursNotice />);

        const text = screen.getByTestId('out-of-hours').textContent;
        expect(text).toContain('Shop nghỉ tối, sáng mai trả lời nha');
        expect(text).toContain('We open again at 8:00 AM tomorrow.');
        expect(text).not.toContain('Leave a message and we will reply');
    });

    it('mở cửa lại vào ngày khác thì ghi tên ngày', () => {
        vi.setSystemTime(new Date(2026, 8, 25, 21, 0));
        useChannel({ workingHours: WEEKDAYS_8_TO_22 });

        render(<OutOfHoursNotice />);

        expect(screen.getByTestId('out-of-hours').textContent).toContain('when we open at 8:00 AM on Monday.');
    });

    it('email không bắt buộc: bỏ trống thì đưa khách xuống ô nhập, không gọi API', async () => {
        const updateContact = vi.spyOn(widgetStore, 'updateContact');
        document.body.insertAdjacentHTML('beforeend', '<textarea id="chat-input"></textarea>');

        render(<OutOfHoursNotice />);
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Leave a message' })));

        expect(updateContact).not.toHaveBeenCalled();
        expect(document.activeElement?.id).toBe('chat-input');
        document.getElementById('chat-input')?.remove();
    });

    it('email gõ sai thì báo lỗi ngay dưới ô, chưa lưu gì', async () => {
        const updateContact = vi.spyOn(widgetStore, 'updateContact');

        render(<OutOfHoursNotice />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'khach@' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Leave a message' })));

        expect(updateContact).not.toHaveBeenCalled();
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('email hợp lệ thì lưu vào hồ sơ khách', async () => {
        const updateContact = vi.spyOn(widgetStore, 'updateContact').mockResolvedValue(true);

        render(<OutOfHoursNotice />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'khach@shop.vn' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Leave a message' })));

        expect(updateContact).toHaveBeenCalledWith({ email: 'khach@shop.vn' });
    });

    it('lưu email lỗi mạng thì báo ngắn ngay trên nút, khách ở lại để thử lại', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        document.body.insertAdjacentHTML('beforeend', '<textarea id="chat-input"></textarea>');

        render(<OutOfHoursNotice />);
        const emailField = screen.getByRole('textbox', { name: 'Your email' });
        fireEvent.change(emailField, { target: { value: 'khach@shop.vn' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Leave a message' })));

        expect(screen.getByRole('alert').textContent).toBe('Your email was not saved. Please try again.');
        expect(document.activeElement?.id).not.toBe('chat-input');
        expect(emailField).toHaveValue('khach@shop.vn');
        document.getElementById('chat-input')?.remove();
    });

    it('đã có hội thoại thì chỉ còn một dòng nhắc trên ô nhập', () => {
        render(<OutOfHoursBanner />);

        expect(screen.getByRole('status').textContent).toBe(
            'We are outside support hours and will reply when we open at 8:00 AM tomorrow.',
        );
    });
});
