import { decodeFrameMessage, encodeFrameMessage, type FrameMessage } from '../../sdk/constants/frameEvents';
import { LEGACY_EVENT_PREFIX, LEGACY_FRAME_MESSAGE_PREFIX } from '../../shared/legacyContracts';
import { hostSpeaksCurrentFrameProtocol } from './urlParams';

// Giao thức postMessage giữa trang khách (SDK) và app trong iframe. Tên sự kiện + tiền tố
// là hợp đồng chung: nguồn chuỗi nằm ở sdk/constants/frameEvents.ts, không chép lại.

export type { FrameMessage };

// SDK đời trước chỉ nghe tiền tố cũ và bắn nguyên `eventIdentifier` nó nhận, nên gửi cho nó
// đúng dạng nó chờ. Đọc URL một lần lúc nạp: widget có thể tự dọn tham số khỏi URL sau đó.
const toLegacyFrameMessage = (message: Record<string, unknown>): Record<string, unknown> =>
    message.event === 'onEvent' && typeof message.eventIdentifier === 'string'
        ? { ...message, eventIdentifier: `${LEGACY_EVENT_PREFIX}:${message.eventIdentifier}` }
        : message;

export const createParentMessenger =
    (search: string) =>
    (message: Record<string, unknown>): void => {
        const frameMessage = hostSpeaksCurrentFrameProtocol(search)
            ? encodeFrameMessage(message)
            : encodeFrameMessage(toLegacyFrameMessage(message), LEGACY_FRAME_MESSAGE_PREFIX);

        window.parent.postMessage(frameMessage, '*');
    };

export const sendMessageToParent = createParentMessenger(window.location.search);

export const IFrameHelper = {
    isIFrame: (): boolean => window.self !== window.top,
    sendMessage: sendMessageToParent,
    // Chỉ trang nhúng widget (SDK) được điều khiển widget, không phải frame khác cùng trang.
    isAValidEvent: (event: MessageEvent): boolean =>
        event.source === window.parent && decodeFrameMessage(event.data) !== null,
    getMessage: (event: MessageEvent): FrameMessage => decodeFrameMessage(event.data) as FrameMessage,
};

// Nhãn đọc màn hình + tooltip của launcher theo ngôn ngữ widget (SDK không tự giữ chữ).
export interface LauncherLabels {
    label: string;
    openLabel: string;
    closeLabel: string;
}

// Gửi kèm channelConfig + authToken để SDK ghi cookie `cw_conversation`, và nhãn launcher
// để SDK gắn ngay lúc dựng bong bóng (bong bóng dựng khi nhận chính tin này).
export const loadedEventConfig = (authToken: string, channelConfig: unknown, launcherLabels: LauncherLabels) => ({
    event: 'loaded',
    config: { authToken, channelConfig, launcherLabels },
});

// Chiều cao cần thêm cho khung khi hiện màn tin chưa đọc (48px bù padding).
export const getExtraSpaceToScroll = (): number => {
    const unreadMessageWrap = document.querySelector('.unread-messages');
    const unreadCloseWrap = document.querySelector('.close-unread-wrap');
    const readViewWrap = document.querySelector('.open-read-view-wrap');

    if (!unreadMessageWrap) return 0;

    let extraHeight = 48 + unreadMessageWrap.scrollHeight;
    if (unreadCloseWrap) extraHeight += unreadCloseWrap.scrollHeight;
    if (readViewWrap) extraHeight += readViewWrap.scrollHeight;

    return extraHeight;
};

export const shouldTriggerMessageUpdateEvent = (message: {
    previous_changes?: Record<string, unknown[]>;
}): boolean => {
    const previousChanges = message.previous_changes;
    if (!previousChanges) return false;
    if (!Object.keys(previousChanges).includes('content_attributes')) return false;

    return Object.keys(
        (previousChanges.content_attributes?.[1] as Record<string, unknown>) || {},
    ).includes('submitted_values');
};
