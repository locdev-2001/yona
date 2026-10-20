import type { TraitOverrides } from 'blobatar';
import type { AvatarStackPerson } from './AvatarStack';

// Chuỗi dựng avatar hình khối phải bền theo danh tính, không theo tên hiển thị:
// đổi tên không được đổi hình, và cùng một người ra cùng một hình ở mọi màn.
// `group_member`: người trong nhóm chat của kênh, định danh theo mã ngoài của nền tảng.
export type AvatarSubject = 'contact' | 'user' | 'agent_bot' | 'inbox' | 'account' | 'team' | 'group_member' | 'chat';

type AvatarSubjectId = number | string | null | undefined;

export function avatarSeed(subject: AvatarSubject, id: AvatarSubjectId): string | undefined {
    if (id === null || id === undefined || id === '') return undefined;

    return `${subject}:${id}`;
}

// Người gửi tin trong payload realtime/REST khai `type` theo hai kiểu viết.
const SENDER_TYPE_SUBJECT: Record<string, AvatarSubject> = {
    user: 'user',
    contact: 'contact',
    agent_bot: 'agent_bot',
    agentbot: 'agent_bot',
};

export function senderAvatarSeed(
    sender: { id?: AvatarSubjectId; type?: string | null } | null | undefined,
): string | undefined {
    const subject = SENDER_TYPE_SUBJECT[(sender?.type ?? '').toLowerCase()];

    return subject ? avatarSeed(subject, sender?.id) : undefined;
}

// Không có định danh bền thì đành dựng theo tên; cả hai rỗng = không dựng được.
export function resolveAvatarIdentity(seed: string | undefined, name: string | null | undefined): string {
    return seed || (name ?? '').trim();
}

// Các trục hình khối đã ghim (tự chỉnh trong AvatarEditor); trục thiếu thì lấy theo seed.
export type AvatarTraits = TraitOverrides;

interface ConversationGroupAvatar {
    id: number;
    // Ảnh quản trị tải lên; có thì thắng hình khối và ảnh ghép.
    avatar_url?: string | null;
    avatar_seed?: string | null;
    avatar_traits?: AvatarTraits | null;
    avatar_members?: AvatarStackPerson[];
    member_count?: number;
}

// Avatar của một dòng hội thoại: nhóm theo hình quản trị đã chọn, chưa chọn thì theo id nhóm
// (mọi thành viên thấy cùng một hình); còn lại theo liên hệ.
function conversationAvatarSeed(group: ConversationGroupAvatar | null | undefined, contactId: AvatarSubjectId): string | undefined {
    if (!group) return avatarSeed('contact', contactId);

    return avatarSeed('chat', group.avatar_seed || `group:${group.id}`);
}

// Nhóm chưa có ảnh hay hình riêng thì ghép ảnh thành viên để khác hẳn hội thoại 1-1.
function conversationAvatarStack(
    group: ConversationGroupAvatar | null | undefined,
): { people: AvatarStackPerson[]; total: number } | null {
    if (!group || group.avatar_url || group.avatar_seed || !group.avatar_members?.length) return null;

    return { people: group.avatar_members, total: group.member_count ?? group.avatar_members.length };
}

// Mọi chỗ hiện avatar dòng hội thoại (danh sách, đầu khung chat, panel nhóm, trang mời) lấy
// đủ ảnh, hình khối và ảnh ghép từ đây.
export function conversationAvatar(
    group: ConversationGroupAvatar | null | undefined,
    contactId: AvatarSubjectId,
    contactThumbnail?: string | null,
): {
    src: string;
    seed: string | undefined;
    traits: AvatarTraits | null;
    stack: { people: AvatarStackPerson[]; total: number } | null;
} {
    return {
        src: (group ? group.avatar_url : contactThumbnail) || '',
        seed: conversationAvatarSeed(group, contactId),
        traits: group?.avatar_seed ? (group.avatar_traits ?? null) : null,
        stack: conversationAvatarStack(group),
    };
}
