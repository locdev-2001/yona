import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { OpenRoomSummary } from './types';

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

const groupCallUrl = (accountId: number, groupId: number) => `/api/v1/accounts/${accountId}/yona/groups/${groupId}/call`;

export const joinGroupRoom = (accountId: number, groupId: number) => postJson<CallJoinResponse>(groupCallUrl(accountId, groupId), {});

export const fetchGroupRoom = (accountId: number, groupId: number) =>
    getJson<{ voice_room: OpenRoomSummary | null }>(groupCallUrl(accountId, groupId));

export const muteGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    postJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}/mute`, {});

export const removeGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    deleteJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}`);
