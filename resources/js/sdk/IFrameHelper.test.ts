import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IFrameHelper } from './IFrameHelper';
import { FRAME_MESSAGE_PREFIX } from './constants/frameEvents';
import type { ChatwootInstance } from './types';

const APP_FRAME_ID = 'chatwoot_live_chat_widget';

const mountAppFrame = () => {
    const iframe = document.createElement('iframe');
    iframe.id = APP_FRAME_ID;
    document.body.appendChild(iframe);

    return iframe;
};

beforeEach(() => {
    window.$chatwoot = {
        baseUrl: 'https://app.yona.vn',
        websiteToken: 'website-token',
        position: 'right',
        widgetStyle: 'standard',
        hideMessageBubble: false,
        isOpen: false,
    } as ChatwootInstance;
});

afterEach(() => {
    document.getElementById(APP_FRAME_ID)?.remove();
    window.onmessage = null;
    vi.restoreAllMocks();
});

describe('getUrl', () => {
    it('dựng URL iframe từ baseUrl và websiteToken', () => {
        expect(IFrameHelper.getUrl({ baseUrl: 'https://app.yona.vn', websiteToken: 'abc123' })).toBe(
            'https://app.yona.vn/widget?website_token=abc123',
        );
    });

    it('giữ nguyên baseUrl có cổng và không thêm dấu / thừa', () => {
        expect(IFrameHelper.getUrl({ baseUrl: 'http://localhost:8000', websiteToken: 'abc123' })).toBe(
            'http://localhost:8000/widget?website_token=abc123',
        );
    });
});

describe('sendMessage', () => {
    it('gửi chuỗi có tiền tố chatwoot-widget: và payload JSON phẳng', () => {
        const iframe = mountAppFrame();
        const postMessage = vi.fn();
        Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true });

        IFrameHelper.sendMessage('set-label', { label: 'vip' });

        expect(postMessage).toHaveBeenCalledWith(
            `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'set-label', label: 'vip' })}`,
            '*',
        );
    });

    it('không nổ khi iframe chưa dựng', () => {
        expect(() => IFrameHelper.sendMessage('set-label', { label: 'vip' })).not.toThrow();
    });
});

describe('initPostMessageCommunication', () => {
    it('gọi đúng handler theo tên sự kiện trong payload', () => {
        const handler = vi.spyOn(IFrameHelper.events, 'updateIframeHeight').mockImplementation(() => {});
        IFrameHelper.initPostMessageCommunication();

        window.onmessage?.({
            data: `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'updateIframeHeight', extraHeight: 42, isFixedHeight: true })}`,
        } as MessageEvent);

        expect(handler).toHaveBeenCalledWith({ event: 'updateIframeHeight', extraHeight: 42, isFixedHeight: true });
    });

    it('bỏ qua message không mang tiền tố của widget', () => {
        const handler = vi.spyOn(IFrameHelper.events, 'updateIframeHeight').mockImplementation(() => {});
        IFrameHelper.initPostMessageCommunication();

        window.onmessage?.({ data: 'some-other-app:{"event":"updateIframeHeight"}' } as MessageEvent);
        window.onmessage?.({ data: { event: 'updateIframeHeight' } } as unknown as MessageEvent);

        expect(handler).not.toHaveBeenCalled();
    });

    it('bỏ qua tên sự kiện không có handler', () => {
        IFrameHelper.initPostMessageCommunication();

        expect(() =>
            window.onmessage?.({
                data: `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'khong-ton-tai' })}`,
            } as MessageEvent),
        ).not.toThrow();
    });
});

describe('setFrameHeightToFitContent', () => {
    it('đặt chiều cao cố định khi isFixedHeight', () => {
        const iframe = mountAppFrame();

        IFrameHelper.setFrameHeightToFitContent(320, true);

        expect(iframe.getAttribute('style')).toBe('height: 320px !important');
    });

    it('trả về 100% khi không cố định', () => {
        const iframe = mountAppFrame();

        IFrameHelper.setFrameHeightToFitContent(320, false);

        expect(iframe.getAttribute('style')).toBe('height: 100% !important');
    });
});
