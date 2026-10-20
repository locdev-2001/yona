import { deleteJson, getJson, patchJson, postForm, postJson } from 'dashboard/helper/apiClient';
import type { AvatarStackPerson } from 'shared/avatar/AvatarStack';

export type GroupRole = 'admin' | 'member';

export type GroupJoinedVia = 'creator' | 'added' | 'invite_link';

// Tóm tắt nhóm đi kèm dòng hội thoại nhóm (ConversationResource `group`).
export interface GroupSummary {
    id: number;
    name: string;
    // Ảnh quản trị tải lên; có thì thắng avatar_seed và ảnh ghép.
    avatar_url: string | null;
    // null: chưa chọn, dùng hình theo id nhóm.
    avatar_seed: string | null;
    // Vài thành viên cho avatar ghép khi chưa chọn avatar riêng (người khác trước).
    avatar_members: AvatarStackPerson[];
    member_count: number;
    // null: người xem đã rời nhóm.
    my_role: GroupRole | null;
}

export interface GroupMember {
    user_id: number;
    name: string;
    username: string | null;
    avatar_url: string | null;
    role: GroupRole;
    joined_via: GroupJoinedVia;
}

export interface GroupDetails extends GroupSummary {
    description: string | null;
    max_members: number;
    conversation_id: number;
    members: GroupMember[];
}

export interface GroupInviteLink {
    id: number;
    status: 'active' | 'revoked' | 'expired' | 'exhausted';
    expires_at: number | null;
    max_uses: number | null;
    use_count: number;
    created_at: number;
}

const groupsUrl = (accountId: number) => `/api/v1/accounts/${accountId}/yona/groups`;
const groupUrl = (accountId: number, groupId: number) => `${groupsUrl(accountId)}/${groupId}`;

export function createGroup(accountId: number, name: string, userIds: number[]): Promise<GroupDetails> {
    return postJson<GroupDetails>(groupsUrl(accountId), { name, user_ids: userIds });
}

export function fetchGroup(accountId: number, groupId: number): Promise<GroupDetails> {
    return getJson<GroupDetails>(groupUrl(accountId, groupId));
}

export function renameGroup(accountId: number, groupId: number, name: string): Promise<GroupSummary> {
    return patchJson<GroupSummary>(groupUrl(accountId, groupId), { name });
}

// null: quay về avatar ghép ảnh thành viên.
export function changeGroupAvatar(accountId: number, groupId: number, avatarSeed: string | null): Promise<GroupSummary> {
    return patchJson<GroupSummary>(groupUrl(accountId, groupId), { avatar_seed: avatarSeed });
}

export function uploadGroupAvatar(accountId: number, groupId: number, photo: Blob): Promise<GroupSummary> {
    const form = new FormData();
    form.append('avatar', photo, `group-avatar.${photo.type.split('/')[1] || 'png'}`);

    return postForm<GroupSummary>(`${groupUrl(accountId, groupId)}/avatar`, form);
}

export async function addGroupMembers(accountId: number, groupId: number, userIds: number[]): Promise<GroupMember[]> {
    return (await postJson<{ members: GroupMember[] }>(`${groupUrl(accountId, groupId)}/members`, { user_ids: userIds })).members;
}

export async function setGroupMemberRole(accountId: number, groupId: number, userId: number, role: GroupRole): Promise<GroupMember[]> {
    return (await patchJson<{ members: GroupMember[] }>(`${groupUrl(accountId, groupId)}/members/${userId}`, { role })).members;
}

// Xoá chính mình là rời nhóm.
export function removeGroupMember(accountId: number, groupId: number, userId: number): Promise<unknown> {
    return deleteJson(`${groupUrl(accountId, groupId)}/members/${userId}`);
}

export async function fetchGroupInviteLinks(accountId: number, groupId: number): Promise<GroupInviteLink[]> {
    return (await getJson<{ payload: GroupInviteLink[] }>(`${groupUrl(accountId, groupId)}/invite_links`)).payload;
}

export function createGroupInviteLink(accountId: number, groupId: number): Promise<GroupInviteLink & { token: string; url: string }> {
    return postJson(`${groupUrl(accountId, groupId)}/invite_links`, {});
}

export function revokeGroupInviteLink(accountId: number, groupId: number, linkId: number): Promise<unknown> {
    return deleteJson(`${groupUrl(accountId, groupId)}/invite_links/${linkId}`);
}
