import { ICONS } from 'dashboard/icons';
import { STATUS_TYPE } from '../constants';
import type { ConversationStatus } from '../types';

export type StatusMenuAction = 'open' | 'resolve' | 'snooze' | 'pending' | 'unread';

export interface StatusMenuEntry {
    action: StatusMenuAction;
    labelKey: string;
    icon: string;
    // Chỉ phím tắt đang chạy thật trong ResolveAction.
    shortcut?: string[];
}

// Mục trùng trạng thái hiện tại không hiện; nhóm cuối là thao tác không đổi trạng thái.
export function buildStatusMenuSections(status: ConversationStatus | undefined): StatusMenuEntry[][] {
    const statusEntries: (StatusMenuEntry | false)[] = [
        status !== STATUS_TYPE.OPEN && {
            action: 'open',
            labelKey: status === STATUS_TYPE.RESOLVED ? 'CONVERSATION.HEADER.REOPEN_ACTION' : 'CONVERSATION.HEADER.OPEN_ACTION',
            icon: 'i-lucide-rotate-ccw',
        },
        status !== STATUS_TYPE.RESOLVED && {
            action: 'resolve',
            labelKey: 'CONVERSATION.HEADER.RESOLVE_ACTION',
            icon: 'i-lucide-circle-check',
            shortcut: ['alt', 'E'],
        },
        status !== STATUS_TYPE.SNOOZED && {
            action: 'snooze',
            labelKey: 'CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL',
            icon: 'i-lucide-alarm-clock',
        },
        status !== STATUS_TYPE.PENDING && {
            action: 'pending',
            labelKey: 'CONVERSATION.RESOLVE_DROPDOWN.MARK_PENDING',
            icon: 'i-lucide-circle-dot-dashed',
        },
    ];

    return [
        statusEntries.filter((entry): entry is StatusMenuEntry => entry !== false),
        [{ action: 'unread', labelKey: 'CONVERSATION.RESOLVE_DROPDOWN.MARK_UNREAD', icon: ICONS.markUnread }],
    ];
}
