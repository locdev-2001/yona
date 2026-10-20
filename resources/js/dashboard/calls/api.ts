import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { CallMediaKind, DirectCallView, OpenRoomSummary } from './types';

// Vé vào phòng nhận từ máy chủ; lớp media dùng `server_url` + `token` để kết nối.
export interface CallTicket {
    server_url: string;
    token: string;
    expires_at: string;
}

export interface CallJoinResponse {
    call: { id: number; kind: string; media: string; status: string; started_at: string | null };
    ticket: CallTicket | null;
    awaiting_approval: boolean;
}

// Cuộc gọi 1-1 nhìn từ phía mình, cùng hình với sự kiện realtime `direct_call.updated`.
export interface DirectCallPayload {
    account_id: number;
    call: DirectCallView;
}

export interface DirectCallJoinResponse extends CallJoinResponse {
    direct_call: DirectCallPayload;
}

const groupCallUrl = (accountId: number, groupId: number) => `/api/v1/accounts/${accountId}/yona/groups/${groupId}/call`;

export const joinGroupRoom = (accountId: number, groupId: number) => postJson<CallJoinResponse>(groupCallUrl(accountId, groupId), {});

export const fetchGroupRoom = (accountId: number, groupId: number) =>
    getJson<{ voice_room: OpenRoomSummary | null }>(groupCallUrl(accountId, groupId));

export const muteGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    postJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}/mute`, {});

export const removeGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    deleteJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}`);

const yonaUrl = (accountId: number) => `/api/v1/accounts/${accountId}/yona`;

export const fetchDirectCallEligibility = (accountId: number, conversationId: number) =>
    getJson<{ callable: boolean }>(`${yonaUrl(accountId)}/conversations/${conversationId}/call`);

export const startDirectCall = (accountId: number, conversationId: number, media: CallMediaKind) =>
    postJson<DirectCallJoinResponse>(`${yonaUrl(accountId)}/conversations/${conversationId}/call`, { media });

// Cuộc gọi 1-1 còn sống của mình (tải lại trang giữa lúc đổ chuông).
export const fetchCurrentDirectCall = (accountId: number) =>
    getJson<{ direct_call: DirectCallPayload | null }>(`${yonaUrl(accountId)}/calls/current`);

export const acceptDirectCall = (accountId: number, callId: number, media: CallMediaKind) =>
    postJson<DirectCallJoinResponse>(`${yonaUrl(accountId)}/calls/${callId}/accept`, { media });

export const hangUpDirectCall = (accountId: number, callId: number) => deleteJson(`${yonaUrl(accountId)}/calls/${callId}`);
