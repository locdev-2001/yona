// Chuỗi dựng avatar hình khối phải bền theo danh tính, không theo tên hiển thị:
// đổi tên không được đổi hình, và cùng một người ra cùng một hình ở mọi màn.
// `group_member`: người trong nhóm chat của kênh, định danh theo mã ngoài của nền tảng.
export type AvatarSubject = 'contact' | 'user' | 'agent_bot' | 'ai_agent' | 'inbox' | 'account' | 'team' | 'group_member';

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
    ai_agent: 'ai_agent',
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
