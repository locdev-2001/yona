import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2 } } }),
}));

const { postJson, parseApiErrorMessage, useAlert } = vi.hoisted(() => ({
    postJson: vi.fn(),
    parseApiErrorMessage: vi.fn(() => null),
    useAlert: vi.fn(),
}));
vi.mock('dashboard/helper/apiClient', () => ({ postJson, parseApiErrorMessage }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert }));

import LineChannelForm from './Line';
import TelegramChannelForm from './Telegram';
import TwilioChannelForm from './Twilio';

// Port hành vi của Telegram.vue / Line.vue / Twilio.vue (vuelidate → state cục bộ):
// nút gửi bị chặn khi thiếu trường bắt buộc, payload gửi lên đúng như bản gốc.

beforeEach(() => {
    postJson.mockReset();
    postJson.mockResolvedValue({ id: 9 });
    useAlert.mockReset();
    Object.defineProperty(window, 'location', {
        value: { replace: vi.fn(), search: '', href: '' },
        writable: true,
    });
});

const submit = (view: ReturnType<typeof render>, label: RegExp) =>
    fireEvent.click(view.getByRole('button', { name: label }));

describe('form Telegram', () => {
    it('không gọi API khi chưa nhập bot token', () => {
        const view = render(<TelegramChannelForm />);
        submit(view, /Create Telegram Channel/);

        expect(postJson).not.toHaveBeenCalled();
    });

    it('gửi bot_token lên endpoint tạo inbox, không có tên inbox', async () => {
        const view = render(<TelegramChannelForm />);
        fireEvent.change(view.container.querySelector('input')!, { target: { value: '123:ABC' } });
        submit(view, /Create Telegram Channel/);

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][0]).toBe('/api/v1/accounts/2/inboxes');
        expect(postJson.mock.calls[0][1]).toStrictEqual({
            channel: { type: 'telegram', bot_token: '123:ABC' },
        });
    });
});

describe('form LINE', () => {
    it('đòi đủ bốn trường trước khi gọi API', async () => {
        const view = render(<LineChannelForm />);
        const inputs = [...view.container.querySelectorAll('input')];
        fireEvent.change(inputs[0], { target: { value: '  LINE OA  ' } });
        submit(view, /Create LINE Channel/);
        expect(postJson).not.toHaveBeenCalled();

        fireEvent.change(inputs[1], { target: { value: '1657' } });
        fireEvent.change(inputs[2], { target: { value: 'secret' } });
        fireEvent.change(inputs[3], { target: { value: 'token' } });
        submit(view, /Create LINE Channel/);

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][1]).toStrictEqual({
            name: 'LINE OA',
            channel: {
                type: 'line',
                line_channel_id: '1657',
                line_channel_secret: 'secret',
                line_channel_token: 'token',
            },
        });
    });
});

describe('form Twilio', () => {
    it('gửi medium theo loại kênh và chuẩn hoá số về E.164', async () => {
        const view = render(<TwilioChannelForm type="whatsapp" />);
        const inputs = [...view.container.querySelectorAll('input[type="text"]')];
        fireEvent.change(inputs[0], { target: { value: 'Twilio WA' } });
        fireEvent.change(inputs[1], { target: { value: '+15551234567' } });
        fireEvent.change(inputs[2], { target: { value: 'AC123' } });
        fireEvent.change(inputs[3], { target: { value: 'auth' } });
        submit(view, /Create Twilio Channel/);

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][1]).toStrictEqual({
            name: 'Twilio WA',
            channel: {
                type: 'twilio',
                medium: 'whatsapp',
                account_sid: 'AC123',
                api_key_sid: '',
                auth_token: 'auth',
                messaging_service_sid: '',
                phone_number: '+15551234567',
            },
        });
    });

    it('bỏ số điện thoại và bắt buộc messaging service khi bật công tắc', async () => {
        const view = render(<TwilioChannelForm type="sms" />);
        const textInputs = () => [...view.container.querySelectorAll('input[type="text"]')];
        fireEvent.change(textInputs()[0], { target: { value: 'Twilio MS' } });
        fireEvent.click(view.container.querySelector('#useMessagingService')!);

        // Chưa nhập messaging service → chưa gọi API.
        fireEvent.change(textInputs()[2], { target: { value: 'AC123' } });
        fireEvent.change(textInputs()[3], { target: { value: 'auth' } });
        submit(view, /Create Twilio Channel/);
        expect(postJson).not.toHaveBeenCalled();

        fireEvent.change(textInputs()[1], { target: { value: 'MG123' } });
        submit(view, /Create Twilio Channel/);

        await waitFor(() => expect(postJson).toHaveBeenCalledTimes(1));
        expect(postJson.mock.calls[0][1]).toMatchObject({
            channel: { medium: 'sms', messaging_service_sid: 'MG123', phone_number: null },
        });
    });
});
