import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IFrameHelper } from './IFrameHelper';
import { FRAME_MESSAGE_PREFIX, NEW_SESSION_URL_PARAM } from './constants/frameEvents';
import { setCookieWithDomain } from './cookieHelpers';
import { getCookie } from './helpers/cookies';
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
    document.getElementById('cw-widget-holder')?.remove();
    document.cookie = 'cw_conversation=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.onmessage = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const postFromWidget = (payload: Record<string, unknown>) =>
    window.onmessage?.({ data: `${FRAME_MESSAGE_PREFIX}${JSON.stringify(payload)}` } as MessageEvent);

const loadedMessage = (authToken: string) => ({
    event: 'loaded',
    config: { authToken, channelConfig: { widgetColor: '#1f93ff' } },
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

describe('giữ phiên khách qua tải lại trang', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
        // Dựng bong bóng và theo dõi đổi URL không thuộc phạm vi các test này.
        vi.spyOn(IFrameHelper, 'onLoad').mockImplementation(() => {});
    });

    it('widget báo loaded thì SDK ghi token vào cookie cw_conversation', () => {
        IFrameHelper.initPostMessageCommunication();

        postFromWidget(loadedMessage('visitor-token'));

        expect(getCookie('cw_conversation')).toBe('visitor-token');
    });

    it('có cookie phiên thì URL iframe mang token để widget nhận lại đúng khách', () => {
        setCookieWithDomain('cw_conversation', 'visitor-token');

        IFrameHelper.createFrame({ baseUrl: 'https://app.yona.vn', websiteToken: 'website-token' });

        expect(IFrameHelper.getAppFrame()?.src).toBe(
            'https://app.yona.vn/widget?website_token=website-token&cw_conversation=visitor-token',
        );
    });
});

describe('xoá phiên khách', () => {
    const newSessionIdOf = (src: string) => new URL(src).searchParams.get(NEW_SESSION_URL_PARAM);

    it('xoá cookie phiên rồi dựng lại iframe mang cờ phiên mới, không mang token cũ', () => {
        setCookieWithDomain('cw_conversation', 'visitor-token');
        const oldFrame = mountAppFrame();
        oldFrame.src = 'https://app.yona.vn/widget?website_token=website-token&cw_conversation=visitor-token';

        IFrameHelper.startNewSession();

        const freshFrame = IFrameHelper.getAppFrame()!;
        expect(getCookie('cw_conversation')).toBeUndefined();
        expect(freshFrame).not.toBe(oldFrame);
        expect(oldFrame.isConnected).toBe(false);
        expect(document.querySelectorAll(`#${APP_FRAME_ID}`)).toHaveLength(1);
        expect(freshFrame.src).toMatch(/^https:\/\/app\.yona\.vn\/widget\?website_token=website-token&new_session=/);
        expect(freshFrame.src).not.toContain('cw_conversation');
        expect(window.$chatwoot.resetTriggered).toBe(true);
    });

    it('mỗi lần xoá phiên mang một mã riêng để widget chỉ xử lý mỗi lần một lần', () => {
        mountAppFrame();

        IFrameHelper.startNewSession();
        const firstId = newSessionIdOf(IFrameHelper.getAppFrame()!.src);
        IFrameHelper.startNewSession();
        const secondId = newSessionIdOf(IFrameHelper.getAppFrame()!.src);

        expect(firstId).toBeTruthy();
        expect(secondId).toBeTruthy();
        expect(secondId).not.toBe(firstId);
    });
});
