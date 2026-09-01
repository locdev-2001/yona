// Trích wootConstants của Chatwoot (phần màn conversation dùng).
export const ASSIGNEE_TYPE = {
    ME: 'me',
    UNASSIGNED: 'unassigned',
    ALL: 'all',
} as const;

export const STATUS_TYPE = {
    OPEN: 'open',
    RESOLVED: 'resolved',
    PENDING: 'pending',
    SNOOZED: 'snoozed',
    ALL: 'all',
} as const;

export const SORT_BY_TYPE = {
    LAST_ACTIVITY_AT_DESC: 'last_activity_at_desc',
    LAST_ACTIVITY_AT_ASC: 'last_activity_at_asc',
    CREATED_AT_DESC: 'created_at_desc',
    CREATED_AT_ASC: 'created_at_asc',
    PRIORITY_DESC: 'priority_desc',
    PRIORITY_ASC: 'priority_asc',
    WAITING_SINCE_DESC: 'waiting_since_desc',
    WAITING_SINCE_ASC: 'waiting_since_asc',
    UNREAD: 'unread',
} as const;

export const MESSAGE_TYPES = {
    INCOMING: 0,
    OUTGOING: 1,
    ACTIVITY: 2,
    TEMPLATE: 3,
} as const;

export const MESSAGE_STATUS = {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    PROGRESS: 'progress',
} as const;

export const MESSAGE_VARIANTS = {
    USER: 'user',
    AGENT: 'agent',
    ACTIVITY: 'activity',
    PRIVATE: 'private',
    BOT: 'bot',
    ERROR: 'error',
    TEMPLATE: 'template',
    EMAIL: 'email',
    UNSUPPORTED: 'unsupported',
} as const;

export const ORIENTATION = {
    LEFT: 'left',
    RIGHT: 'right',
    CENTER: 'center',
} as const;

export const REPLY_EDITOR_MODES = {
    REPLY: 'REPLY',
    NOTE: 'NOTE',
} as const;

export const MESSAGE_MAX_LENGTH = {
    GENERAL: 10000,
} as const;

export const CONVERSATIONS_PER_PAGE = 25;
