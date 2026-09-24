import { afterEach, describe, expect, it, vi } from 'vitest';

import { FRAME_MESSAGE_PREFIX } from '../../sdk/constants/frameEvents';
import { LEGACY_EVENT_PREFIX, LEGACY_FRAME_MESSAGE_PREFIX } from '../../shared/legacyContracts';
import { createParentMessenger, IFrameHelper } from './iframe';

const configSet = `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'config-set', locale: 'vi' })}`;

const messageEvent = (source: MessageEventSource | null, data: unknown) => ({ source, data }) as MessageEvent;

afterEach(() => {
    document.getElementById('frame-la')?.remove();
    vi.restoreAllMocks();
});

describe('isAValidEvent', () => {
    it('nhận tin mang tiền tố do trang nhúng widget gửi', () => {
        expect(IFrameHelper.isAValidEvent(messageEvent(window.parent, configSet))).toBe(true);
    });

    it('bỏ qua tin mang đúng tiền tố nhưng đến từ frame khác trên trang', () => {
        const stranger = document.createElement('iframe');
        stranger.id = 'frame-la';
        document.body.appendChild(stranger);

        expect(IFrameHelper.isAValidEvent(messageEvent(stranger.contentWindow, configSet))).toBe(false);
        expect(IFrameHelper.isAValidEvent(messageEvent(null, configSet))).toBe(false);
    });

    it('bỏ qua tin không mang tiền tố của widget dù đến từ trang nhúng', () => {
        expect(IFrameHelper.isAValidEvent(messageEvent(window.parent, 'other-app:{"event":"config-set"}'))).toBe(false);
        expect(IFrameHelper.isAValidEvent(messageEvent(window.parent, { event: 'config-set' }))).toBe(false);
    });
});

describe('gửi tin lên trang nhúng', () => {
    const onMessage = { event: 'onEvent', eventIdentifier: 'on-message', data: { id: 1 } };
    const sentBy = (search: string) => {
        const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
        createParentMessenger(search)(onMessage);

        return postMessage.mock.calls[0]?.[0] as string;
    };

    it('SDK hiện hành (URL có sdk_protocol=2) nhận tiền tố mới và khoá trần', () => {
        expect(sentBy('?website_token=abc&sdk_protocol=2')).toBe(`${FRAME_MESSAGE_PREFIX}${JSON.stringify(onMessage)}`);
    });

    it('SDK đời trước (URL không có tham số giao thức) nhận tiền tố và tên sự kiện nó chờ', () => {
        expect(sentBy('?website_token=abc')).toBe(
            `${LEGACY_FRAME_MESSAGE_PREFIX}${JSON.stringify({ ...onMessage, eventIdentifier: `${LEGACY_EVENT_PREFIX}:on-message` })}`,
        );
    });

    it('tin không phải onEvent giữ nguyên nội dung khi gửi cho SDK đời trước', () => {
        const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
        createParentMessenger('')({ event: 'loaded', config: { authToken: 't' } });

        expect(postMessage).toHaveBeenCalledWith(
            `${LEGACY_FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'loaded', config: { authToken: 't' } })}`,
            '*',
        );
    });
});

describe('nhận tin từ trang nhúng', () => {
    it('nhận cả tiền tố đời trước', () => {
        const legacy = `${LEGACY_FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'config-set', locale: 'vi' })}`;

        expect(IFrameHelper.isAValidEvent(messageEvent(window.parent, legacy))).toBe(true);
        expect(IFrameHelper.getMessage(messageEvent(window.parent, legacy))).toEqual({ event: 'config-set', locale: 'vi' });
    });

    it('bỏ qua tin mang tiền tố nhưng JSON hỏng', () => {
        expect(IFrameHelper.isAValidEvent(messageEvent(window.parent, `${FRAME_MESSAGE_PREFIX}{hỏng`))).toBe(false);
    });
});
