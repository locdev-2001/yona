import { apiDelete, apiGet, apiPatch, apiPost, buildSearch } from './client';
import { postFormWithProgress } from './upload';
import { buildSendAttachmentsFormData, buildSendMessagePayload } from '../helpers/messageHelpers';
import type {
    AvailableAgent,
    ConversationAttributes,
    WidgetCampaign,
    WidgetConfigResponse,
    WidgetContact,
    WidgetMessage,
} from '../types';

// Port từ widget/api/* — mỗi hàm giữ đúng đường dẫn và payload của bản gốc.

const BASE = '/api/v1/widget';

const referrerUrl = () => (window as { referrerURL?: string }).referrerURL || '';

// api/events.js#generateEventParams — cùng bộ tham số cho mọi sự kiện widget.
const eventParams = () => ({
    initiated_at: { timestamp: new Date().toString() },
    referer: referrerUrl(),
});

type ConfigListener = (config: WidgetConfigResponse) => void;
const configListeners = new Set<ConfigListener>();

// Tầng trên nghe cấu hình vừa tải (vd. chính sách nhắn tin của kênh) mà không
// phải chen vào luồng khởi động của app.
export const onConfigLoaded = (listener: ConfigListener): (() => void) => {
    configListeners.add(listener);
    return () => configListeners.delete(listener);
};

export const fetchConfig = async (): Promise<WidgetConfigResponse> => {
    const config = await apiPost<WidgetConfigResponse>(`${BASE}/config${buildSearch()}`);
    configListeners.forEach(listener => listener(config));
    return config;
};

export const fetchConversationAttributes = (): Promise<{
    id?: ConversationAttributes['id'];
    status?: string;
    created_at?: number | null;
    assignee?: ConversationAttributes['assignee'];
    contact_last_seen_at?: number;
    agent_last_seen_at?: number;
}> => apiGet(`${BASE}/conversations${buildSearch()}`);

// endPoints.js#createConversation — tin đầu tiên đi kèm ngay trong yêu cầu tạo.
export const createConversation = (params: {
    fullName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    message?: string;
    contactCustomAttributes?: Record<string, unknown>;
    customAttributes?: Record<string, unknown>;
}): Promise<{ messages?: WidgetMessage[] }> =>
    apiPost(`${BASE}/conversations${buildSearch()}`, {
        contact: {
            name: params.fullName,
            email: params.emailAddress,
            phone_number: params.phoneNumber,
            custom_attributes: params.contactCustomAttributes,
        },
        message: {
            content: params.message,
            timestamp: new Date().toString(),
            referer_url: referrerUrl(),
        },
        custom_attributes: params.customAttributes,
    });

export const fetchMessages = ({
    before,
    after,
}: { before?: number | string; after?: number | string } = {}): Promise<{
    payload: WidgetMessage[];
    meta: { contact_last_seen_at?: number };
}> => apiGet(`${BASE}/messages${buildSearch({ before, after })}`);

export const sendMessage = (
    content: string,
    replyTo: number | string | null = null,
    { customAttributes, labels }: { customAttributes?: Record<string, unknown>; labels?: string[] } = {},
): Promise<WidgetMessage> =>
    apiPost(
        `${BASE}/messages${buildSearch()}`,
        buildSendMessagePayload({ content, replyTo, referrerURL: referrerUrl(), customAttributes, labels }),
    );

// Một hoặc nhiều tệp trong CÙNG một tin, kèm chú thích và tin được trả lời.
export const sendAttachments = (
    { files, caption = '', replyTo = null }: { files: (File | string)[]; caption?: string; replyTo?: number | string | null },
    { customAttributes, labels }: { customAttributes?: Record<string, unknown>; labels?: string[] } = {},
    onUploadProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<WidgetMessage> =>
    postFormWithProgress(
        `${BASE}/messages${buildSearch()}`,
        buildSendAttachmentsFormData({ files, caption, replyTo, referrerURL: referrerUrl(), customAttributes, labels }),
        onUploadProgress,
    );

// Sticker gửi MÃ trong danh mục của kênh; máy chủ tự tra ảnh, không nhận URL.
export const sendSticker = (stickerId: string, replyTo: number | string | null = null): Promise<WidgetMessage> =>
    apiPost(`${BASE}/messages${buildSearch()}`, {
        message: {
            content_type: 'sticker',
            content_attributes: { sticker: stickerId },
            reply_to: replyTo,
            timestamp: new Date().toString(),
            referer_url: referrerUrl(),
        },
    });

// Khách thu hồi tin của chính mình; điều kiện do máy chủ thực thi (422 kèm `code`).
export const recallMessage = (messageId: number | string): Promise<void> =>
    apiDelete(`${BASE}/messages/${messageId}${buildSearch()}`);

export const updateMessage = ({
    messageId,
    email,
    values,
}: {
    messageId: number | string;
    email?: string;
    values?: unknown;
}): Promise<{ contact: WidgetContact }> =>
    apiPatch(`${BASE}/messages/${messageId}${buildSearch()}`, {
        contact: { email },
        message: { submitted_values: values },
    });

export const toggleTyping = (typingStatus: 'on' | 'off'): Promise<void> =>
    apiPost(`${BASE}/conversations/toggle_typing${buildSearch()}`, { typing_status: typingStatus });

export const setUserLastSeenAt = (lastSeen: number): Promise<void> =>
    apiPost(`${BASE}/conversations/update_last_seen${buildSearch()}`, { contact_last_seen_at: lastSeen });

export const toggleStatus = (): Promise<void> => apiGet(`${BASE}/conversations/toggle_status${buildSearch()}`);

export const sendEmailTranscript = (): Promise<void> =>
    apiPost(`${BASE}/conversations/transcript${buildSearch()}`);

export const setConversationCustomAttributes = (customAttributes: Record<string, unknown>): Promise<void> =>
    apiPost(`${BASE}/conversations/set_custom_attributes${buildSearch()}`, { custom_attributes: customAttributes });

export const deleteConversationCustomAttribute = (customAttribute: string): Promise<void> =>
    apiPost(`${BASE}/conversations/destroy_custom_attributes${buildSearch()}`, {
        custom_attribute: [customAttribute],
    });

export const fetchContact = (): Promise<WidgetContact> => apiGet(`${BASE}/contact${buildSearch()}`);

export const updateContact = (user: Record<string, unknown>): Promise<WidgetContact> =>
    apiPatch(`${BASE}/contact${buildSearch()}`, user);

export const setContactUser = (
    identifier: string | number,
    user: Record<string, unknown>,
): Promise<WidgetContact & { widget_auth_token?: string }> =>
    apiPatch(`${BASE}/contact/set_user${buildSearch()}`, { identifier, ...user });

export const setContactCustomAttributes = (customAttributes: Record<string, unknown>): Promise<WidgetContact> =>
    apiPatch(`${BASE}/contact${buildSearch()}`, { custom_attributes: customAttributes });

export const deleteContactCustomAttribute = (customAttribute: string): Promise<WidgetContact> =>
    apiPost(`${BASE}/contact/destroy_custom_attributes${buildSearch()}`, { custom_attributes: [customAttribute] });

export const fetchAvailableAgents = (): Promise<{ payload: AvailableAgent[] }> =>
    apiGet(`${BASE}/inbox_members${buildSearch()}`);

export const createEvent = (name: string): Promise<void> =>
    apiPost(`${BASE}/events${buildSearch()}`, { name, event_info: eventParams() });

export const fetchCampaigns = (): Promise<WidgetCampaign[]> => apiGet(`${BASE}/campaigns${buildSearch()}`);

// endPoints.js#triggerCampaign — campaign chạy qua CÙNG endpoint sự kiện với
// webwidget.triggered, chỉ khác tên sự kiện + event_info.
export const triggerCampaign = (
    campaignId: number,
    customAttributes?: Record<string, unknown>,
): Promise<void> =>
    apiPost(`${BASE}/events${buildSearch()}`, {
        name: 'campaign.triggered',
        event_info: {
            campaign_id: campaignId,
            custom_attributes: customAttributes,
            ...eventParams(),
        },
    });

export const createLabel = (label: string): Promise<void> => apiPost(`${BASE}/labels${buildSearch()}`, { label });

export const destroyLabel = (label: string): Promise<void> =>
    apiDelete(`${BASE}/labels/${label}${buildSearch()}`);
