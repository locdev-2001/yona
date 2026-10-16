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

export { AssigneeAvatar };
