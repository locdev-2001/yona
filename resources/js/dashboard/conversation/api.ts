import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import type { ConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import { deleteJson, getJson, postForm, postJson } from '../helper/apiClient';
import type { RequestOptions } from '../helper/apiClient';
import type { ConversationType } from './constants';
import type {
    AgentMeta,
    Conversation,
    ConversationListMeta,
    ConversationMessage,
    ConversationPriority,
    ConversationStatus,
    ContactMeta,
    TeamMeta,
} from './types';

// Endpoint dashboard API (web_api session) — xem ConversationsController.

// Trang lấy bằng cursor chỉ mang next_cursor; số đếm tab lấy riêng ở fetchConversationMeta.
export interface ConversationListPageMeta extends Partial<ConversationListMeta> {
    next_cursor?: string | null;
}

interface ConversationListResponse {
    data: {
        meta: ConversationListPageMeta;
        payload: Conversation[];
    };
}

export function tabCountsOf(meta: ConversationListPageMeta): ConversationListMeta | null {
    const { mine_count, assigned_count, unassigned_count, all_count } = meta;
    if (mine_count === undefined || assigned_count === undefined || unassigned_count === undefined || all_count === undefined) {
        return null;
    }

    return { mine_count, assigned_count, unassigned_count, all_count };
}

interface MessagesResponse {
    meta: {
        labels: string[];
        additional_attributes: Record<string, unknown>;
        contact: ContactMeta;
        agent_last_seen_at: string | null;
        assignee_last_seen_at: string | null;
    };
    payload: ConversationMessage[];
}

export interface FetchConversationsParams {
    accountId: number;
    assigneeType: string;
    status: string;
    // `cursor` (meta.next_cursor của trang trước) thắng `page` khi có cả hai.
    page?: number;
    cursor?: string;
    sortBy: string;
    inboxId?: number;
    teamId?: number;
    // conversationFilters.labels của ChatList.vue — trang lọc theo nhãn (B7).
    labels?: string[];
    // conversationFilters.conversationType: tab Mentions/Participating/Unattended.
    conversationType?: ConversationType;
    // Từ khoá ô tìm trong cột danh sách: chỉ thu hẹp danh sách, mọi bộ lọc khác giữ nguyên.
    searchQuery?: string;
    updatedWithin?: number;
}

// conversationFilters của ChatList.vue — cùng một bộ tham số cho danh sách và
// bộ đếm, nên chỉ dựng ở một chỗ (`page`/`cursor`/`updated_within` chỉ danh sách mới có).
function buildConversationQuery(params: FetchConversationsParams): string {
    const query = new URLSearchParams({
        assignee_type: params.assigneeType,
        status: params.status,
        sort_by: params.sortBy,
    });
    if (params.cursor) {
        query.set('cursor', params.cursor);
    } else if (params.page) {
        query.set('page', String(params.page));
    }
    if (params.inboxId) {
        query.set('inbox_id', String(params.inboxId));
    }
    if (params.teamId) {
        query.set('team_id', String(params.teamId));
    }
    params.labels?.forEach(label => query.append('labels[]', label));
    if (params.conversationType) {
        query.set('conversation_type', params.conversationType);
    }
    if (params.searchQuery) {
        query.set('q', params.searchQuery);
    }
    if (params.updatedWithin) {
        query.set('updated_within', String(params.updatedWithin));
    }

    return query.toString();
}

export function fetchConversations(params: FetchConversationsParams): Promise<ConversationListResponse> {
    return getJson(`/api/v1/accounts/${params.accountId}/conversations?${buildConversationQuery(params)}`);
}

export function fetchFilteredConversations(
    accountId: number,
    payload: ConversationFilterPayload[],
    page: number,
    searchQuery = '',
): Promise<ConversationListResponse> {
    const query = new URLSearchParams({ page: String(page), ...(searchQuery ? { q: searchQuery } : {}) });

    return postJson(`/api/v1/accounts/${accountId}/conversations/filter?${query}`, { payload });
}

export function fetchConversationMeta(
    params: Omit<FetchConversationsParams, 'page' | 'cursor'>,
): Promise<{ meta: ConversationListMeta }> {
    return getJson(`/api/v1/accounts/${params.accountId}/conversations/meta?${buildConversationQuery(params)}`);
}

export function fetchConversation(accountId: number, conversationId: number): Promise<Conversation> {
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}`);
}

// ConversationApi.getAllAttachments → action fetchAllAttachments: trang đầu (15
// tệp mới nhất) của hội thoại, nguồn cho accordion Attachments.
export function fetchConversationAttachments(
    accountId: number,
    conversationId: number,
): Promise<MessageAttachment[]> {
    return getJson<{ payload?: MessageAttachment[] }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/attachments`,
    ).then(response => response.payload ?? []);
}

// Mục "Ảnh/video · Tệp" ở panel hội thoại: một trang của một loại, mới trước.
export type SharedAttachmentKind = 'media' | 'files';

export interface SharedAttachmentPage {
    attachments: MessageAttachment[];
    totalCount: number;
}

export function fetchSharedAttachments(
    accountId: number,
    conversationId: number,
    kind: SharedAttachmentKind,
    page: number,
): Promise<SharedAttachmentPage> {
    return getJson<{ payload?: MessageAttachment[]; meta?: { total_count?: number } }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/attachments?${new URLSearchParams({ kind, page: String(page) })}`,
    ).then(response => ({ attachments: response.payload ?? [], totalCount: response.meta?.total_count ?? 0 }));
}

export interface LinkMessage {
    message_id: number;
    content: string;
    created_at: number;
}

export interface SharedLinkPage {
    messages: LinkMessage[];
    hasMore: boolean;
}

export function fetchSharedLinks(accountId: number, conversationId: number, page: number): Promise<SharedLinkPage> {
    return getJson<{ payload?: LinkMessage[]; meta?: { has_more?: boolean } }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/links?page=${page}`,
    ).then(response => ({ messages: response.payload ?? [], hasMore: Boolean(response.meta?.has_more) }));
}

// Thanh tìm trong hội thoại: id mọi tin khớp, mới trước.
export function searchConversationMessages(
    accountId: number,
    conversationId: number,
    query: string,
): Promise<number[]> {
    return getJson<{ payload?: { message_ids?: number[] } }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/search/messages?${new URLSearchParams({ q: query })}`,
    ).then(response => response.payload?.message_ids ?? []);
}

// getPreviousMessages gốc: `after` chỉ gửi khi khác `before`.
export function fetchMessages(
    accountId: number,
    conversationId: number,
    before?: number,
    after?: number,
): Promise<MessagesResponse> {
    const query = new URLSearchParams();
    if (before) {
        query.set('before', String(before));
    }
    if (after && Number(after) !== Number(before)) {
        query.set('after', String(after));
    }
    const suffix = query.size ? `?${query.toString()}` : '';
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${suffix}`);
}

// ConversationApi.markMessageRead / markMessagesUnread. Khác gốc: backend trả
// 204 rỗng (hợp đồng b8-be) thay vì partial conversation → mốc seen mới do
// context tự suy ra, riêng lần đánh dấu chưa đọc thì đọc lại conversation.
export function markMessagesRead(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/update_last_seen`);
}

export function markMessagesUnread(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/unread`);
}

// Bộ đếm badge unread của sidebar (conversationUnreadCounts store). 403 khi
// account chưa bật cờ `conversation_unread_counts` — gốc nuốt lỗi, không hiện badge.
export interface ConversationUnreadCounts {
    all_count: number;
    inboxes: Record<string, number>;
    labels: Record<string, number>;
    teams: Record<string, number>;
}

export function fetchConversationUnreadCounts(
    accountId: number,
): Promise<{ payload: ConversationUnreadCounts }> {
    return getJson(`/api/v1/accounts/${accountId}/conversations/unread_counts`);
}

export function toggleTyping(
    accountId: number,
    conversationId: number,
    status: 'on' | 'off',
    isPrivate: boolean,
): Promise<unknown> {
    return postJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_typing_status`, {
        typing_status: status,
        is_private: isPrivate,
    });
}

export interface SendMessagePayload {
    content?: string;
    private: boolean;
    echo_id?: string;
    content_attributes?: Record<string, unknown>;
    // Tin sticker: chỉ gửi mã, máy chủ tự dựng nội dung và đính kèm. Tin có cấu trúc
    // (input_select, cards…): máy chủ kiểm và chuẩn hoá content_attributes theo loại.
    content_type?: string;
    sticker_id?: string;
    files?: File[];
    // Tệp âm thanh trong `files` là bản ghi âm thu ở ô soạn (kênh có tin thoại gửi thành tin thoại).
    is_voice_message?: boolean;
    // Kênh email (buildCreatePayload gốc luôn gửi cc/bcc, to chỉ khi có).
    cc_emails?: string;
    bcc_emails?: string;
    to_emails?: string;
}

// buildCreatePayload của api/inbox/message.js: có tệp thì gửi multipart với
// `attachments[]`, không thì giữ nguyên JSON như trước.
function buildCreateForm({
    content,
    private: isPrivate,
    echo_id: echoId,
    content_attributes: contentAttributes,
    files,
    is_voice_message: isVoiceMessage,
    cc_emails: ccEmails,
    bcc_emails: bccEmails,
    to_emails: toEmails,
}: SendMessagePayload): FormData {
    const form = new FormData();
    if (content) {
        form.append('content', content);
    }
    (files ?? []).forEach((file) => form.append('attachments[]', file));
    // '1'/'0' theo quy ước multipart của repo (Show.tsx inbox) — PHP ép chuỗi
    // 'false' thành true nên KHÔNG dùng String(boolean) như bản gốc JS.
    form.append('private', isPrivate ? '1' : '0');
    if (isVoiceMessage) {
        form.append('is_voice_message', '1');
    }
    if (echoId) {
        form.append('echo_id', echoId);
    }
    if (contentAttributes) {
        form.append('content_attributes', JSON.stringify(contentAttributes));
    }
    if (ccEmails !== undefined) form.append('cc_emails', ccEmails);
    if (bccEmails !== undefined) form.append('bcc_emails', bccEmails);
    if (toEmails) form.append('to_emails', toEmails);
    return form;
}

export function sendMessage(
    accountId: number,
    conversationId: number,
    payload: SendMessagePayload,
    options?: RequestOptions,
): Promise<ConversationMessage> {
    const url = `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    const { files, ...jsonPayload } = payload;

    if (files && files.length) {
        return postForm(url, buildCreateForm(payload), options);
    }

    return postJson(url, { ...jsonPayload });
}

/**
 * Gửi lại một tin thất bại. Hợp đồng ở reports/zalo-lo3-notes.md: 200 trả về
 * chính tin (MessageResource); bấm lại khi tin không còn `failed` là no-op.
 */
export function retryMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
): Promise<ConversationMessage> {
    return postJson(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/retry`,
        {},
    );
}

/**
 * Thả / gỡ biểu cảm và thu hồi tin (reports/zalo-lo4-notes.md §2.1). Kênh không
 * khai năng lực tương ứng trả 422 `capability_not_supported` — FE gate trước.
 */
export function addMessageReaction(
    accountId: number,
    conversationId: number,
    messageId: number,
    emoji: string,
): Promise<ConversationMessage> {
    return postJson(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji },
    );
}

export function removeMessageReaction(
    accountId: number,
    conversationId: number,
    messageId: number,
): Promise<ConversationMessage> {
    return deleteJson(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/reactions`,
    );
}

export function deleteMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
): Promise<ConversationMessage> {
    return deleteJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`);
}

/**
 * Đánh dấu thẻ chuyển khoản đã nhận tiền — idempotent, bấm lại khi đã đánh dấu
 * rồi không đổi ai/lúc nào (server chỉ ghi lần đầu).
 */
export function markBankTransferPaid(
    accountId: number,
    conversationId: number,
    messageId: number,
): Promise<ConversationMessage> {
    return postJson(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/mark_bank_transfer_paid`,
        {},
    );
}

/**
 * Dịch nội dung một tin sang ngôn ngữ đích. Tin đã có bản dịch sẵn thì máy chủ
 * trả thân rỗng — bản dịch khi đó nằm ở `content_attributes.translations`.
 */
export function translateMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
    targetLanguage: string,
): Promise<{ content?: string | null } | null> {
    return postJson(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/translate`,
        { target_language: targetLanguage },
    );
}

export interface ToggleStatusResponse {
    meta: Record<string, never>;
    payload: {
        success: boolean;
        conversation_id: number;
        current_status: ConversationStatus;
        snoozed_until: string | null;
    };
}

export function toggleStatus(
    accountId: number,
    conversationId: number,
    status: ConversationStatus,
    snoozedUntil: number | null = null,
): Promise<ToggleStatusResponse> {
    return postJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`, {
        status,
        snoozed_until: snoozedUntil,
    });
}

// toggle_priority / mute / unmute trả 200 body rỗng (head :ok gốc) → nuốt lỗi parse JSON.
function postWithoutBody(url: string, body: Record<string, unknown> = {}): Promise<void> {
    return postJson(url, body).then(
        () => undefined,
        (error: unknown) => (error instanceof SyntaxError ? undefined : Promise.reject(error)),
    );
}

export function togglePriority(
    accountId: number,
    conversationId: number,
    priority: ConversationPriority | null,
): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_priority`, {
        priority,
    });
}

// ConversationApi.updateCustomAttributes — POST /conversations/{id}/custom_attributes
export function updateConversationCustomAttributes(
    accountId: number,
    conversationId: number,
    customAttributes: Record<string, unknown>,
): Promise<Conversation> {
    return postJson<Conversation>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/custom_attributes`, {
        custom_attributes: customAttributes,
    });
}

export function muteConversation(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/mute`);
}

export function unmuteConversation(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/unmute`);
}

// Ghim là của riêng người đang đăng nhập; máy chủ trả 204.
export function setConversationPinned(accountId: number, conversationId: number, pinned: boolean): Promise<void> {
    const url = `/api/v1/accounts/${accountId}/conversations/${conversationId}/pin`;

    return (pinned ? postWithoutBody(url) : deleteJson(url)).then(() => undefined);
}

// AssignmentsController#create: agent trả partial _agent (null khi gỡ), team trả `json: @team`.
// Thân "null" là JSON hợp lệ; 200 rỗng (nếu backend đổi) rơi vào SyntaxError → coi như null.
function postAssignment<T>(url: string, body: Record<string, unknown>): Promise<T | null> {
    return postJson<T | null>(url, body).catch((error: unknown) =>
        error instanceof SyntaxError ? null : Promise.reject(error),
    );
}

export function assignAgent(
    accountId: number,
    conversationId: number,
    agentId: number | null,
    assigneeType: string | null = null,
): Promise<AgentMeta | null> {
    return postAssignment<AgentMeta>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`, {
        assignee_id: agentId,
        assignee_type: assigneeType,
    });
}

export function assignTeam(
    accountId: number,
    conversationId: number,
    teamId: number,
): Promise<TeamMeta | null> {
    return postAssignment<TeamMeta>(`/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`, {
        team_id: teamId,
    });
}

export function sendEmailTranscript(accountId: number, conversationId: number, email: string): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/transcript`, { email });
}
