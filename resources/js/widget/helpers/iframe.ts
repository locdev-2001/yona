import { FRAME_MESSAGE_PREFIX } from '../../sdk/constants/frameEvents';

// Port từ widget/helpers/utils.js (IFrameHelper/RNHelper) — giao thức postMessage
// giữa trang khách (SDK) và app trong iframe. Tên sự kiện + tiền tố là hợp đồng
// chung: nguồn chuỗi nằm ở sdk/constants/frameEvents.ts, không chép lại.

export interface FrameMessage extends Record<string, unknown> {
    event: string;
}

export const sendMessageToParent = (message: Record<string, unknown>): void => {
    window.parent.postMessage(`${FRAME_MESSAGE_PREFIX}${JSON.stringify({ ...message })}`, '*');
};

export const IFrameHelper = {
    isIFrame: (): boolean => window.self !== window.top,
    sendMessage: sendMessageToParent,
    // Chỉ trang nhúng widget (SDK) được điều khiển widget, không phải frame khác cùng trang.
    isAValidEvent: (event: MessageEvent): boolean =>
        event.source === window.parent &&
        typeof event.data === 'string' &&
        event.data.indexOf(FRAME_MESSAGE_PREFIX) === 0,
    getMessage: (event: MessageEvent): FrameMessage =>
        JSON.parse((event.data as string).replace(FRAME_MESSAGE_PREFIX, '')),
};

// Bản gốc gửi kèm channelConfig + authToken để SDK ghi cookie `cw_conversation`.
export const loadedEventConfig = (authToken: string, channelConfig: unknown) => ({
    event: 'loaded',
    config: { authToken, channelConfig },
});

// Chiều cao cần thêm cho khung khi hiện màn tin chưa đọc (bản gốc: 48px bù padding).
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
