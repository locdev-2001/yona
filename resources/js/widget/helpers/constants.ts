// Port từ widget/helpers/constants.js + widget/constants/widgetBusEvents.js.

export const MESSAGE_TYPE = {
    INCOMING: 0,
    OUTGOING: 1,
    ACTIVITY: 2,
    TEMPLATE: 3,
} as const;

export const MESSAGE_STATUS = {
    FAILED: 'failed',
    SUCCESS: 'success',
    PROGRESS: 'progress',
} as const;

export const CONVERSATION_STATUS = {
    OPEN: 'open',
    RESOLVED: 'resolved',
    PENDING: 'pending',
    SNOOZED: 'snoozed',
} as const;

// Bus nội bộ widget (thay emitter của mitt bên Vue).
export const WIDGET_BUS_EVENTS = {
    ON_AGENT_MESSAGE_RECEIVED: 'ON_AGENT_MESSAGE_RECEIVED',
    ON_UNREAD_MESSAGE_CLICK: 'ON_UNREAD_MESSAGE_CLICK',
    ON_CONVERSATION_CREATED: 'ON_CONVERSATION_CREATED',
    SHOW_ALERT: 'SHOW_ALERT',
    TOGGLE_REPLY_TO_MESSAGE: 'TOGGLE_REPLY_TO_MESSAGE',
} as const;

// Bộ đếm typing của bản gốc (ResizableTextArea + ActionCableConnector).
export const TYPING_INDICATOR_IDLE_TIME = 4000;
export const AGENT_TYPING_TIMEOUT = 30000;
