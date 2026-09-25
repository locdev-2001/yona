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
    ON_CAMPAIGN_MESSAGE_CLICK: 'ON_CAMPAIGN_MESSAGE_CLICK',
    EXECUTE_CAMPAIGN: 'EXECUTE_CAMPAIGN',
    SNOOZE_CAMPAIGNS: 'SNOOZE_CAMPAIGNS',
    ON_UNREAD_MESSAGE_CLICK: 'ON_UNREAD_MESSAGE_CLICK',
    ON_UNREAD_VIEW_CLOSE: 'ON_UNREAD_VIEW_CLOSE',
    ON_CONVERSATION_CREATED: 'ON_CONVERSATION_CREATED',
    SHOW_ALERT: 'SHOW_ALERT',
    TOGGLE_REPLY_TO_MESSAGE: 'TOGGLE_REPLY_TO_MESSAGE',
} as const;

// Bộ đếm typing của bản gốc (ResizableTextArea + ActionCableConnector).
export const TYPING_INDICATOR_IDLE_TIME = 4000;
export const AGENT_TYPING_TIMEOUT = 30000;

// store/modules/campaign.js — danh sách campaign nhớ đệm 1 giờ theo website token;
// bấm "đóng" ở bong bóng campaign thì tạm ngưng 1 giờ (SDK giữ mốc trong cookie).
export const CAMPAIGN_CACHE_KEY_PREFIX = 'yona_campaigns_';
export const CAMPAIGN_CACHE_EXPIRY = 60 * 60 * 1000;
export const CAMPAIGN_SNOOZE_DURATION = 60 * 60 * 1000;

// Tin có khung riêng không gom nhóm với tin khác: mỗi tin tự đứng một khối.
export const STANDALONE_CONTENT_TYPES: readonly string[] = [
    'input_csat',
    'input_email',
    'input_select',
    'form',
    'article',
    'cards',
    'integrations',
];

// Ba mức đánh giá khi kết thúc hội thoại, quy về thang CSAT 1–5 mà báo cáo dùng.
export const CONVERSATION_END_RATINGS = [
    { key: 'POOR', value: 1 },
    { key: 'OKAY', value: 3 },
    { key: 'GREAT', value: 5 },
] as const;

export type ConversationEndRating = (typeof CONVERSATION_END_RATINGS)[number];

// Điểm chấm từ thang 5 mức cũ (2, 4) hiện về mức gần nghĩa nhất.
export const conversationEndRatingFor = (rating: number): ConversationEndRating => {
    const [poor, okay, great] = CONVERSATION_END_RATINGS;
    if (rating < okay.value) return poor;

    return rating > okay.value ? great : okay;
};
