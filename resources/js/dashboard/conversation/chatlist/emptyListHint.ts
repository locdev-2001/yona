import { ASSIGNEE_TYPE } from '../constants';
import type { AssigneeTab, ConversationListMeta } from '../types';

// Quyết định UX có chủ đích (docs/ux-decisions.md): cột hội thoại
// rỗng phải nói ĐÚNG vì sao nó rỗng và chỉ ra chỗ có việc, thay vì câu chung
// "không có hoạt động trò chuyện nào" khiến người trực tưởng inbox trống trong
// khi khách đang chờ ở tab bên cạnh.

export interface EmptyListAction {
    tab: AssigneeTab;
    labelKey: string;
    count: number;
}

export interface EmptyListHint {
    messageKey: string;
    action: EmptyListAction | null;
}

const GENERIC: EmptyListHint = { messageKey: 'CHAT_LIST.LIST.404', action: null };

export function emptyListHint(
    assigneeTab: AssigneeTab,
    listMeta: ConversationListMeta,
    hasAppliedFilters: boolean,
): EmptyListHint {
    // Bộ lọc nâng cao có tiêu chí riêng của người dùng — không gợi ý đổi tab.
    if (hasAppliedFilters) return GENERIC;

    const unassignedCount = listMeta.unassigned_count || 0;
    const allCount = listMeta.all_count || 0;

    if (assigneeTab === ASSIGNEE_TYPE.ME) {
        if (unassignedCount > 0) {
            return {
                messageKey: 'CHAT_LIST.LIST.NONE_ASSIGNED_TO_ME',
                action: {
                    tab: ASSIGNEE_TYPE.UNASSIGNED,
                    labelKey: 'CHAT_LIST.LIST.VIEW_UNASSIGNED',
                    count: unassignedCount,
                },
            };
        }
        if (allCount > 0) {
            return {
                messageKey: 'CHAT_LIST.LIST.NONE_ASSIGNED_TO_ME',
                action: { tab: ASSIGNEE_TYPE.ALL, labelKey: 'CHAT_LIST.LIST.VIEW_ALL', count: allCount },
            };
        }
        return GENERIC;
    }

    if (assigneeTab === ASSIGNEE_TYPE.UNASSIGNED && allCount > 0) {
        return {
            messageKey: 'CHAT_LIST.LIST.NONE_UNASSIGNED',
            action: { tab: ASSIGNEE_TYPE.ALL, labelKey: 'CHAT_LIST.LIST.VIEW_ALL', count: allCount },
        };
    }

    return GENERIC;
}
