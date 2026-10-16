import { memo } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import type { AgentMeta } from './types';

// Cách gọi người phụ trách dùng chung cho thẻ danh sách và mũ khung chat.
export type AssigneeKind = 'me' | 'other' | 'none';

export const assigneeName = (assignee: Partial<AgentMeta> | null | undefined): string =>
    assignee?.available_name || assignee?.name || '';

// Bot có thể trùng số id với người dùng nên luôn là "người khác".
export function assigneeKind(
    assignee: Partial<AgentMeta> | null | undefined,
    isAgentBot: boolean,
    currentUserId: number | null,
): AssigneeKind {
    if (!assigneeName(assignee)) return 'none';
    return !isAgentBot && assignee?.id === currentUserId ? 'me' : 'other';
}

// Tên ngắn trong viên: câu đầy đủ ("Phụ trách: …") nằm ở title cho trình đọc màn hình.
export function assigneeShortName(kind: AssigneeKind, name: string): string {
    if (kind === 'none') return t('CONVERSATION.ASSIGNEE.UNASSIGNED_SHORT');
    if (kind === 'me') return t('CONVERSATION.ASSIGNEE.YOU');
    return name;
}

export function assigneeLabel(kind: AssigneeKind, name: string): string {
    if (kind === 'none') return t('CONVERSATION.ASSIGNEE.UNASSIGNED');
    if (kind === 'me') return t('CONVERSATION.ASSIGNEE.OWNED_BY_ME');
    return t('CONVERSATION.ASSIGNEE.OWNED_BY', { name });
}

interface AssigneeAvatarProps {
    assignee: Partial<AgentMeta> | null | undefined;
    isAgentBot: boolean;
    size: number;
}

// Chưa có ai thì là một ô tròn trống cùng cỡ, để chữ các dòng thẳng hàng nhau.
const AssigneeAvatar = memo(function AssigneeAvatar({ assignee, isAgentBot, size }: AssigneeAvatarProps) {
    const name = assigneeName(assignee);

    if (!name || !assignee) {
        return (
            <span
                data-testid="assignee-avatar-empty"
                className="grid flex-shrink-0 place-content-center rounded-full border border-dashed border-current"
                style={{ width: size, height: size }}
            >
                <Icon icon="i-lucide-user" className="size-2.5" />
            </span>
        );
    }

    return (
        <Avatar
            seed={avatarSeed(isAgentBot ? 'agent_bot' : 'user', assignee.id)}
            name={name}
            src={assignee.thumbnail || assignee.avatar_url}
            size={size}
            roundedFull
            className="flex-shrink-0"
        />
    );
}, isSameAvatar);

// Payload realtime thay object assignee mỗi lần; so theo giá trị hiển thị thay vì theo tham chiếu.
function isSameAvatar(previous: AssigneeAvatarProps, next: AssigneeAvatarProps): boolean {
    return (
        previous.size === next.size &&
        previous.isAgentBot === next.isAgentBot &&
        previous.assignee?.id === next.assignee?.id &&
        assigneeName(previous.assignee) === assigneeName(next.assignee) &&
        (previous.assignee?.thumbnail || previous.assignee?.avatar_url) === (next.assignee?.thumbnail || next.assignee?.avatar_url)
    );
}

const PILL_TONE: Record<AssigneeKind, string> = {
    me: 'border-n-blue-7 bg-n-blue-2 text-n-blue-11',
    other: 'border-n-slate-6 bg-n-solid-1 text-n-slate-12',
    none: 'border-dashed border-n-amber-7 bg-n-amber-2 text-n-amber-11',
};

interface AssigneePillProps {
    assignee: Partial<AgentMeta> | null | undefined;
    isAgentBot: boolean;
    kind: AssigneeKind;
    className?: string;
}

// Một kiểu hiển thị người phụ trách cho mọi nơi: icon bắt tay rồi viên bo tròn (avatar + tên).
function AssigneePill({ assignee, isAgentBot, kind, className = '' }: AssigneePillProps) {
    const name = assigneeName(assignee);

    return (
        <span
            data-assignee={kind}
            title={assigneeLabel(kind, name)}
            className={`flex items-center gap-1 min-w-0 text-xs font-medium leading-4 ${className}`}
        >
            <Icon icon="i-lucide-handshake" className="size-3.5 flex-shrink-0 text-n-slate-10" />
            <span className={`inline-flex items-center gap-1.5 min-w-0 rounded-full border py-0.5 ps-0.5 pe-2.5 ${PILL_TONE[kind]}`}>
                <AssigneeAvatar assignee={assignee} isAgentBot={isAgentBot} size={16} />
                <span className="truncate">{assigneeShortName(kind, name)}</span>
            </span>
        </span>
    );
}

export { AssigneeAvatar, AssigneePill };
