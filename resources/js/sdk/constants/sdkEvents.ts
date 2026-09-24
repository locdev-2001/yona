// Sự kiện window SDK bắn cho trang khách, dạng `<tiền tố>:<khoá>`. Khoá trần cũng là
// `eventIdentifier` iframe gửi lên SDK (xem dispatchSdkEvent).
export const SDK_EVENT_PREFIX = 'yona';

export const SDK_EVENTS = {
    ERROR: 'error',
    ON_MESSAGE: 'on-message',
    ON_START_CONVERSATION: 'on-start-conversation',
    POSTBACK: 'postback',
    READY: 'ready',
    OPENED: 'opened',
    CLOSED: 'closed',
} as const;
