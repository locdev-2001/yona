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

const PICKED_AVATAR_PREFIX = 'pick-';

// Lựa chọn thứ `index` trong lưới chọn hình (máy chủ chỉ nhận dạng `pick-{số}`).
export function pickedAvatarChoice(index: number): string {
    return `${PICKED_AVATAR_PREFIX}${index}`;
}

export function pickedAvatarIndex(choice: string): number | null {
    if (!choice.startsWith(PICKED_AVATAR_PREFIX)) return null;
    const index = Number(choice.slice(PICKED_AVATAR_PREFIX.length));

    return Number.isInteger(index) && index > 0 ? index : null;
}

// Avatar của một dòng hội thoại: nhóm theo hình quản trị đã chọn, chưa chọn thì theo id nhóm
// (mọi thành viên thấy cùng một hình); còn lại theo liên hệ.
export function conversationAvatarSeed(
    group: { id: number; avatar_seed?: string | null } | null | undefined,
    contactId: AvatarSubjectId,
): string | undefined {
    if (!group) return avatarSeed('contact', contactId);

    return avatarSeed('chat', group.avatar_seed || `group:${group.id}`);
}
