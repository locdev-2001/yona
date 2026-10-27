import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';
import type { ConversationGroupAvatar } from 'shared/avatar/avatarSeed';
import type { CallMediaKind, DirectCallView, GroupCallSummary, VoiceRoomSummary } from './types';

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
    // Nguồn chính sách phòng cho phát: phòng thoại nhóm không có camera.
    publishable_sources: string[];
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

export const joinGroupRoom = (accountId: number, groupId: number, roomId: number | null = null) =>
    postJson<CallJoinResponse>(groupCallUrl(accountId, groupId), roomId ? { room_id: roomId } : {});

export const fetchGroupRoom = (accountId: number, groupId: number) =>
    getJson<{ voice_rooms: VoiceRoomSummary[] }>(groupCallUrl(accountId, groupId));

const voiceRoomsUrl = (accountId: number, groupId: number) => `/api/v1/accounts/${accountId}/yona/groups/${groupId}/voice_rooms`;

export const createVoiceRoom = (accountId: number, groupId: number, name: string) =>
    postJson<{ id: number; name: string | null }>(voiceRoomsUrl(accountId, groupId), { name });

export const renameVoiceRoom = (accountId: number, groupId: number, roomId: number, name: string) =>
    patchJson<{ id: number; name: string | null }>(`${voiceRoomsUrl(accountId, groupId)}/${roomId}`, { name });

export const deleteVoiceRoom = (accountId: number, groupId: number, roomId: number) =>
    deleteJson(`${voiceRoomsUrl(accountId, groupId)}/${roomId}`);

export const muteGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    postJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}/mute`, {});

export const removeGroupRoomParticipant = (accountId: number, groupId: number, userId: number) =>
    deleteJson(`${groupCallUrl(accountId, groupId)}/participants/${userId}`);

const yonaUrl = (accountId: number) => `/api/v1/accounts/${accountId}/yona`;

// Cuộc gọi nhóm nhìn từ một thành viên, cùng hình với sự kiện realtime `group_call.updated`.
export interface GroupCallPayload {
    account_id: number;
    conversation_id: number;
    group_id: number;
    my_role: 'admin' | 'member';
    group: ConversationGroupAvatar & { name: string };
    group_call: GroupCallSummary | null;
    group_call_as_of: number;
}

const groupCallingUrl = (accountId: number, groupId: number) => `${yonaUrl(accountId)}/groups/${groupId}/group_call`;

export const joinGroupCall = (accountId: number, groupId: number, media: CallMediaKind) =>
    postJson<CallJoinResponse>(groupCallingUrl(accountId, groupId), { media });

export const declineGroupCall = (accountId: number, groupId: number) => deleteJson(groupCallingUrl(accountId, groupId));

export const fetchRingingGroupCalls = (accountId: number) => getJson<{ group_calls: GroupCallPayload[] }>(`${yonaUrl(accountId)}/group_calls/ringing`);

export const muteGroupCallParticipant = (accountId: number, groupId: number, userId: number) =>
    postJson(`${groupCallingUrl(accountId, groupId)}/participants/${userId}/mute`, {});

export const removeGroupCallParticipant = (accountId: number, groupId: number, userId: number) =>
    deleteJson(`${groupCallingUrl(accountId, groupId)}/participants/${userId}`);

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
