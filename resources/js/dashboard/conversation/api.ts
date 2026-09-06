import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import type { ConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import { getJson, postForm, postJson } from '../helper/apiClient';
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

// Endpoint dashboard API của Chatwoot (web_api session) — xem ConversationsController.

interface ConversationListResponse {
    data: {
        meta: ConversationListMeta;
        payload: Conversation[];
    };
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
    page: number;
    sortBy: string;
    inboxId?: number;
    teamId?: number;
    // conversationFilters.labels của ChatList.vue — trang lọc theo nhãn (B7).
    labels?: string[];
    // conversationFilters.conversationType: tab Mentions/Participating/Unattended.
    conversationType?: ConversationType;
    updatedWithin?: number;
}

// conversationFilters của ChatList.vue — cùng một bộ tham số cho danh sách và
// bộ đếm, nên chỉ dựng ở một chỗ (`page`/`updated_within` chỉ danh sách mới có).
function buildConversationQuery(params: Omit<FetchConversationsParams, 'page'> & { page?: number }): string {
    const query = new URLSearchParams({
        assignee_type: params.assigneeType,
        status: params.status,
        sort_by: params.sortBy,
    });
    if (params.page) {
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
): Promise<ConversationListResponse> {
    return postJson(`/api/v1/accounts/${accountId}/conversations/filter?page=${page}`, { payload });
}

export function fetchConversationMeta(
    params: Omit<FetchConversationsParams, 'page'>,
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
    content: string;
    private: boolean;
    echo_id?: string;
    content_attributes?: Record<string, unknown>;
    files?: File[];
}

// buildCreatePayload của api/inbox/message.js: có tệp thì gửi multipart với
// `attachments[]`, không thì giữ nguyên JSON như trước.
function buildCreateForm({
    content,
    private: isPrivate,
    echo_id: echoId,
    content_attributes: contentAttributes,
    files,
}: SendMessagePayload): FormData {
    const form = new FormData();
    if (content) {
        form.append('content', content);
    }
    (files ?? []).forEach((file) => form.append('attachments[]', file));
    // '1'/'0' theo quy ước multipart của repo (Show.tsx inbox) — PHP ép chuỗi
    // 'false' thành true nên KHÔNG dùng String(boolean) như bản gốc JS.
    form.append('private', isPrivate ? '1' : '0');
    if (echoId) {
        form.append('echo_id', echoId);
    }
    if (contentAttributes) {
        form.append('content_attributes', JSON.stringify(contentAttributes));
    }
    return form;
}

export function sendMessage(
    accountId: number,
    conversationId: number,
    payload: SendMessagePayload,
): Promise<ConversationMessage> {
    const url = `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;
    const { files, ...jsonPayload } = payload;

    if (files && files.length) {
        return postForm(url, buildCreateForm(payload));
    }

    return postJson(url, { ...jsonPayload });
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

export function muteConversation(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/mute`);
}

export function unmuteConversation(accountId: number, conversationId: number): Promise<void> {
    return postWithoutBody(`/api/v1/accounts/${accountId}/conversations/${conversationId}/unmute`);
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
