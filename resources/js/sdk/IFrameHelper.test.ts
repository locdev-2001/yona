import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IFrameHelper } from './IFrameHelper';
import { chatBubble, closeBubble, onBubbleClick, widgetHolder } from './bubbleHelpers';
import { APP_FRAME_ID, FRAME_MESSAGE_PREFIX, NEW_SESSION_URL_PARAM, RESET_SESSION_EVENT } from './constants/frameEvents';
import { setCookieWithDomain } from './cookieHelpers';
import { getCookie } from './helpers/cookies';
import type { SdkInstance } from './types';
import { LEGACY_EVENT_PREFIX, LEGACY_FRAME_MESSAGE_PREFIX } from '../shared/legacyContracts';

const mountAppFrame = () => {
    const iframe = document.createElement('iframe');
    iframe.id = APP_FRAME_ID;
    document.body.appendChild(iframe);

    return iframe;
};

beforeEach(() => {
    window.$yona = {
        baseUrl: 'https://app.yona.vn',
        websiteToken: 'website-token',
        position: 'right',
        widgetStyle: 'standard',
        hideMessageBubble: false,
        isOpen: false,
    } as SdkInstance;
});

afterEach(() => {
    document.getElementById(APP_FRAME_ID)?.remove();
    document.getElementById('cw-widget-holder')?.remove();
    document.getElementById('quang-cao-ben-thu-ba')?.remove();
    document.cookie = 'cw_conversation=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.onmessage = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const WIDGET_ORIGIN = 'https://app.yona.vn';

const frameMessage = (payload: Record<string, unknown>) => `${FRAME_MESSAGE_PREFIX}${JSON.stringify(payload)}`;

const postFromWidget = (payload: Record<string, unknown>) => {
    const appFrame = IFrameHelper.getAppFrame() ?? mountAppFrame();

    window.onmessage?.({
        data: frameMessage(payload),
        origin: WIDGET_ORIGIN,
        source: appFrame.contentWindow,
    } as MessageEvent);
};

const postFrom = (source: MessageEventSource | null, origin: string, payload: Record<string, unknown>) =>
    window.onmessage?.({ data: frameMessage(payload), origin, source } as MessageEvent);

const mountStrangerFrame = () => {
    const stranger = document.createElement('iframe');
    stranger.id = 'quang-cao-ben-thu-ba';
    document.body.appendChild(stranger);

    return stranger;
};

const loadedMessage = (authToken: string) => ({
    event: 'loaded',
    config: { authToken, channelConfig: { widgetColor: '#1f93ff' } },
});

describe('getUrl', () => {
    it('dựng URL iframe từ baseUrl và websiteToken', () => {
        expect(IFrameHelper.getUrl({ baseUrl: 'https://app.yona.vn', websiteToken: 'abc123' })).toBe(
            'https://app.yona.vn/widget?website_token=abc123&sdk_protocol=2',
        );
    });

    it('gắn ngôn ngữ trang nhúng chọn để máy chủ render đúng ngôn ngữ ngay lần đầu', () => {
        expect(IFrameHelper.getUrl({ baseUrl: 'https://app.yona.vn', websiteToken: 'abc123', locale: 'vi' })).toBe(
            'https://app.yona.vn/widget?website_token=abc123&sdk_protocol=2&locale=vi',
        );
    });

    it('giữ nguyên baseUrl có cổng và không thêm dấu / thừa', () => {
        expect(IFrameHelper.getUrl({ baseUrl: 'http://localhost:8000', websiteToken: 'abc123' })).toBe(
            'http://localhost:8000/widget?website_token=abc123&sdk_protocol=2',
        );
    });
});

describe('sendMessage', () => {
    it('gửi chuỗi có tiền tố và payload JSON phẳng, chỉ tới đúng origin của widget', () => {
        const iframe = mountAppFrame();
        const postMessage = vi.fn();
        Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true });

        IFrameHelper.sendMessage('set-label', { label: 'vip' });

        expect(postMessage).toHaveBeenCalledWith(
            `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'set-label', label: 'vip' })}`,
            WIDGET_ORIGIN,
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

        postFromWidget({ event: 'updateIframeHeight', extraHeight: 42, isFixedHeight: true });

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

        expect(() => postFromWidget({ event: 'khong-ton-tai' })).not.toThrow();
    });
});

describe('chỉ nhận tin từ chính iframe widget', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
        vi.spyOn(IFrameHelper, 'onLoad').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        setCookieWithDomain('cw_conversation', 'visitor-token');
        mountAppFrame();
        IFrameHelper.initPostMessageCommunication();
    });

    const setAuthCookieMessage = (widgetAuthToken: string) => ({ event: 'setAuthCookie', data: { widgetAuthToken } });
    const forgedAuthCookie = setAuthCookieMessage('attacker-token');

    it('iframe lạ trên trang khách gửi setAuthCookie giả thì cookie phiên không đổi', () => {
        const stranger = mountStrangerFrame();

        postFrom(stranger.contentWindow, 'https://ads.example.com', forgedAuthCookie);
        postFrom(stranger.contentWindow, 'https://ads.example.com', loadedMessage('attacker-token'));

        expect(getCookie('cw_conversation')).toBe('visitor-token');
    });

    it('frame lạ mạo đúng origin của widget vẫn bị bỏ qua vì không phải iframe widget', () => {
        const stranger = mountStrangerFrame();

        postFrom(stranger.contentWindow, WIDGET_ORIGIN, forgedAuthCookie);

        expect(getCookie('cw_conversation')).toBe('visitor-token');
    });

    it('iframe widget đã bị điều hướng sang origin khác thì tin của nó bị bỏ qua', () => {
        postFrom(IFrameHelper.getAppFrame()!.contentWindow, 'https://ads.example.com', forgedAuthCookie);

        expect(getCookie('cw_conversation')).toBe('visitor-token');
    });

    it('frame lạ không điều khiển được widget: không mở khung, không xoá phiên', () => {
        const toggleBubble = vi.spyOn(IFrameHelper.events, 'toggleBubble');
        const stranger = mountStrangerFrame();
        const appFrame = IFrameHelper.getAppFrame();

        postFrom(stranger.contentWindow, 'https://ads.example.com', { event: 'toggleBubble' });
        postFrom(stranger.contentWindow, 'https://ads.example.com', { event: RESET_SESSION_EVENT });
        postFrom(window, window.location.origin, { event: RESET_SESSION_EVENT });

        expect(toggleBubble).not.toHaveBeenCalled();
        expect(IFrameHelper.getAppFrame()).toBe(appFrame);
        expect(getCookie('cw_conversation')).toBe('visitor-token');
    });

    it('tin đúng từ iframe widget vẫn ghi cookie phiên', () => {
        postFromWidget(setAuthCookieMessage('rotated-visitor-token'));

        expect(getCookie('cw_conversation')).toBe('rotated-visitor-token');
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
            'https://app.yona.vn/widget?website_token=website-token&sdk_protocol=2&cw_conversation=visitor-token',
        );
    });

    it('iframe nạp lại lúc khung chat đang mở thì báo cho widget biết khung đang mở', () => {
        const iframe = mountAppFrame();
        const postMessage = vi.fn();
        Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true });
        window.$yona.isOpen = true;
        IFrameHelper.initPostMessageCommunication();

        postFromWidget(loadedMessage('visitor-token'));

        expect(postMessage).toHaveBeenCalledWith(
            `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: 'toggle-open', isOpen: true })}`,
            WIDGET_ORIGIN,
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
        expect(freshFrame.src).toMatch(/^https:\/\/app\.yona\.vn\/widget\?website_token=website-token&sdk_protocol=2&new_session=/);
        expect(freshFrame.src).not.toContain('cw_conversation');
        expect(window.$yona.resetTriggered).toBe(true);
    });

    it('khung dựng lại cho phiên mới giữ ngôn ngữ trang nhúng đã chọn', () => {
        window.$yona.locale = 'vi';
        mountAppFrame();

        IFrameHelper.startNewSession();

        expect(new URL(IFrameHelper.getAppFrame()!.src).searchParams.get('locale')).toBe('vi');
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

    it('widget xin xoá phiên qua postMessage thì SDK đi đúng đường xoá phiên đó', () => {
        setCookieWithDomain('cw_conversation', 'visitor-token');
        mountAppFrame();
        IFrameHelper.initPostMessageCommunication();

        postFromWidget({ event: RESET_SESSION_EVENT });

        expect(getCookie('cw_conversation')).toBeUndefined();
        expect(newSessionIdOf(IFrameHelper.getAppFrame()!.src)).toBeTruthy();
    });
});

describe('giao thức với iframe', () => {
    const recordWindowEvents = (names: string[]) => {
        const received: Array<{ name: string; detail: unknown }> = [];
        names.forEach(name =>
            window.addEventListener(name, event => received.push({ name, detail: (event as CustomEvent).detail })),
        );

        return received;
    };

    it('iframe có id mới', () => {
        IFrameHelper.createFrame({ baseUrl: 'https://app.yona.vn', websiteToken: 'website-token' });

        expect(IFrameHelper.getAppFrame()?.id).toBe('yona_live_chat_widget');
    });

    it('nhận tin iframe gửi bằng tiền tố đời trước', () => {
        setCookieWithDomain('cw_conversation', 'visitor-token');
        const appFrame = mountAppFrame();
        IFrameHelper.initPostMessageCommunication();

        window.onmessage?.({
            data: `${LEGACY_FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: RESET_SESSION_EVENT })}`,
            origin: WIDGET_ORIGIN,
            source: appFrame.contentWindow,
        } as MessageEvent);

        expect(getCookie('cw_conversation')).toBeUndefined();
    });

    it.each(['on-message', 'yona:on-message', `${LEGACY_EVENT_PREFIX}:on-message`])(
        'onEvent %s bắn cả tên mới lẫn tên cũ, cùng detail',
        eventIdentifier => {
            const received = recordWindowEvents(['yona:on-message', `${LEGACY_EVENT_PREFIX}:on-message`]);
            mountAppFrame();
            IFrameHelper.initPostMessageCommunication();

            postFromWidget({ event: 'onEvent', eventIdentifier, data: { id: 7 } });

            expect(received).toEqual([
                { name: 'yona:on-message', detail: { id: 7 } },
                { name: `${LEGACY_EVENT_PREFIX}:on-message`, detail: { id: 7 } },
            ]);
        },
    );
});

describe('khung xem trước tin mới giữ launcher đóng và badge số chưa đọc', () => {
    const isHidden = (element: HTMLElement) => element.classList.contains('woot--hide');

    beforeEach(() => {
        widgetHolder.className = 'woot-widget-holder woot--hide';
        chatBubble.className = 'woot-widget-bubble';
        closeBubble.className = 'woot-widget-bubble woot--close woot--hide';
        delete chatBubble.dataset.unreadCount;
        document.body.append(widgetHolder, chatBubble, closeBubble);
        IFrameHelper.initPostMessageCommunication();
    });

    afterEach(() => {
        chatBubble.remove();
        closeBubble.remove();
    });

    const agentSendsTwoMessagesWhileClosed = () => {
        postFromWidget({ event: 'setUnreadMode' });
        postFromWidget({ event: 'handleNotificationDot', unreadMessageCount: 2 });
    };

    it('hiện khung xem trước mà launcher vẫn là bong bóng mang badge đúng số', () => {
        agentSendsTwoMessagesWhileClosed();

        expect(isHidden(widgetHolder)).toBe(false);
        expect(widgetHolder.classList.contains('has-unread-view')).toBe(true);
        expect(window.$yona.isOpen).toBe(false);
        expect(isHidden(chatBubble)).toBe(false);
        expect(isHidden(closeBubble)).toBe(true);
        expect(chatBubble.dataset.unreadCount).toBe('2');
        expect(chatBubble.classList.contains('unread-notification')).toBe(true);
    });

    it('đóng khung xem trước thì khung ẩn còn badge ở lại trên bong bóng', () => {
        agentSendsTwoMessagesWhileClosed();

        postFromWidget({ event: 'resetUnreadMode' });

        expect(isHidden(widgetHolder)).toBe(true);
        expect(widgetHolder.classList.contains('has-unread-view')).toBe(false);
        expect(isHidden(chatBubble)).toBe(false);
        expect(chatBubble.dataset.unreadCount).toBe('2');
    });

    it('bấm bong bóng lúc khung xem trước đang hiện thì mở khung chat thật với launcher mũi tên', () => {
        agentSendsTwoMessagesWhileClosed();

        onBubbleClick();
        postFromWidget({ event: 'resetUnreadMode' });

        expect(window.$yona.isOpen).toBe(true);
        expect(isHidden(widgetHolder)).toBe(false);
        expect(isHidden(chatBubble)).toBe(true);
        expect(isHidden(closeBubble)).toBe(false);
    });

    it('widget xin mở khung chat từ khung xem trước thì mở đúng, không lật trạng thái', () => {
        agentSendsTwoMessagesWhileClosed();

        postFromWidget({ event: 'toggleBubble', state: 'open' });
        postFromWidget({ event: 'toggleBubble', state: 'open' });

        expect(window.$yona.isOpen).toBe(true);
        expect(isHidden(widgetHolder)).toBe(false);
        expect(isHidden(closeBubble)).toBe(false);
    });
});

describe('launcher dựng từ tin loaded', () => {
    // onLoad gắn bộ theo dõi đổi URL trang; test không cần nó chạy sau khi môi trường đã dọn.
    beforeEach(() => {
        vi.stubGlobal(
            'MutationObserver',
            class {
                observe() {}
                disconnect() {}
            },
        );
    });

    afterEach(() => {
        IFrameHelper.getBubbleHolder()[0]?.remove();
        chatBubble.removeAttribute('aria-label');
        chatBubble.removeAttribute('title');
        chatBubble.className = '';
    });

    it('có nhãn đọc màn hình và tooltip ngay lúc dựng, không đợi lượt setBubbleLabel sau', () => {
        mountAppFrame();

        IFrameHelper.onLoad({
            widgetColor: '#1B6FCC',
            launcherLabels: { label: 'Trò chuyện', openLabel: 'Mở trò chuyện', closeLabel: 'Thu nhỏ trò chuyện' },
        });

        expect(chatBubble.getAttribute('aria-label')).toBe('Mở trò chuyện');
        expect(chatBubble.title).toBe('Mở trò chuyện');
        expect(closeBubble.getAttribute('aria-label')).toBe('Thu nhỏ trò chuyện');
    });

    it('màu tenant sáng thì icon launcher dùng mực theo cùng luật tương phản với widget', () => {
        mountAppFrame();

        IFrameHelper.onLoad({ widgetColor: '#009CE0' });

        expect(chatBubble.classList.contains('woot-widget-bubble-color--lighter')).toBe(true);
    });
});

describe('cấu hình launcher và phóng to từ dashboard', () => {
    it('dashboard chọn launcher dạng viên thuốc: bong bóng có chữ, lấy nhãn của dashboard', () => {
        IFrameHelper.applyLauncherSetting({ launcher: 'pill', launcher_label: 'Chat với shop' });

        expect(window.$yona.type).toBe('expanded_bubble');
        expect(window.$yona.launcherTitle).toBe('Chat với shop');
    });

    it('mã nhúng đã đặt launcherTitle thì giữ chữ của mã nhúng', () => {
        window.$yona.launcherTitle = 'Hỏi Gốm Mộc';

        IFrameHelper.applyLauncherSetting({ launcher: 'pill', launcher_label: 'Chat với shop' });

        expect(window.$yona.launcherTitle).toBe('Hỏi Gốm Mộc');
    });

    it('launcher tròn thì không đụng tới kiểu bong bóng', () => {
        IFrameHelper.applyLauncherSetting({ launcher: 'round', launcher_label: 'x' });

        expect(window.$yona.type).toBeUndefined();
    });

    it('dashboard đặt vị trí trái: khung chứa đổi sang trái, trừ khi mã nhúng đã tự đặt', () => {
        widgetHolder.classList.add('woot-widget-holder', 'woot-elements--right');
        window.$yona.position = 'right';

        IFrameHelper.applyLauncherSetting({ launcher: 'round', position: 'left' });
        expect(window.$yona.position).toBe('left');
        expect(widgetHolder.classList.contains('woot-elements--left')).toBe(true);

        window.$yona.positionFromEmbed = true;
        IFrameHelper.applyLauncherSetting({ launcher: 'round', position: 'right' });
        expect(window.$yona.position).toBe('left');
    });

    it('widget xin phóng to/thu nhỏ: khung chứa iframe đổi lớp tương ứng', () => {
        IFrameHelper.initPostMessageCommunication();
        postFromWidget({ event: 'setExpanded', expanded: true });
        expect(widgetHolder.classList.contains('woot-widget-holder--expanded')).toBe(true);

        postFromWidget({ event: 'setExpanded', expanded: false });
        expect(widgetHolder.classList.contains('woot-widget-holder--expanded')).toBe(false);
    });
});
