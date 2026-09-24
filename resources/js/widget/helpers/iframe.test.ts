import { afterEach, describe, expect, it } from 'vitest';

import { FRAME_MESSAGE_PREFIX } from '../../sdk/constants/frameEvents';
import { IFrameHelper } from './iframe';

const configSet = `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'config-set', locale: 'vi' })}`;

const messageEvent = (source: MessageEventSource | null, data: unknown) => ({ source, data }) as MessageEvent;

afterEach(() => {
    document.getElementById('frame-la')?.remove();
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
