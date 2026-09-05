import { t } from '../../../../i18n';
import type { MultiselectOption } from 'shared/components/ui/MultiselectDropdown';
import type { ConversationPriority } from '../../types';

export interface PriorityOption extends MultiselectOption {
    id: ConversationPriority | null;
    name: string;
    icon: string;
}

// Port từ ConversationAction.vue `priorityOptions` — thứ tự None/Urgent/High/Medium/Low.
export function buildPriorityOptions(): PriorityOption[] {
    return [
        { id: null, name: t('CONVERSATION.PRIORITY.OPTIONS.NONE'), icon: 'i-woot-priority-empty' },
        { id: 'urgent', name: t('CONVERSATION.PRIORITY.OPTIONS.URGENT'), icon: 'i-woot-priority-urgent' },
        { id: 'high', name: t('CONVERSATION.PRIORITY.OPTIONS.HIGH'), icon: 'i-woot-priority-high' },
        { id: 'medium', name: t('CONVERSATION.PRIORITY.OPTIONS.MEDIUM'), icon: 'i-woot-priority-medium' },
        { id: 'low', name: t('CONVERSATION.PRIORITY.OPTIONS.LOW'), icon: 'i-woot-priority-low' },
    ];
}

// `assignedPriority` getter: không khớp → rơi về option đầu (None).
export function findPriorityOption(
    options: PriorityOption[],
    priority: ConversationPriority | null,
): PriorityOption {
    return options.find(option => option.id === priority) || options[0];
}

// `onClickAssignPriority`: bấm lại đúng mức đang chọn → gỡ về None.
export function resolvePrioritySelection(
    options: PriorityOption[],
    current: PriorityOption,
    selected: PriorityOption,
): PriorityOption {
    return current.id === selected.id ? options[0] : selected;
}
