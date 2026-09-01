import { t } from '../../../../i18n';

const CONVERSATION_PRIORITY = {
    URGENT: 'urgent',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const;

const PRIORITY_ICONS: Record<string, string> = {
    [CONVERSATION_PRIORITY.URGENT]: 'i-woot-priority-urgent',
    [CONVERSATION_PRIORITY.HIGH]: 'i-woot-priority-high',
    [CONVERSATION_PRIORITY.MEDIUM]: 'i-woot-priority-medium',
    [CONVERSATION_PRIORITY.LOW]: 'i-woot-priority-low',
};

const PRIORITY_LABELS: Record<string, string> = {
    [CONVERSATION_PRIORITY.URGENT]: 'CONVERSATION.PRIORITY.OPTIONS.URGENT',
    [CONVERSATION_PRIORITY.HIGH]: 'CONVERSATION.PRIORITY.OPTIONS.HIGH',
    [CONVERSATION_PRIORITY.MEDIUM]: 'CONVERSATION.PRIORITY.OPTIONS.MEDIUM',
    [CONVERSATION_PRIORITY.LOW]: 'CONVERSATION.PRIORITY.OPTIONS.LOW',
};

// Port từ components-next/Conversation/ConversationCard/CardPriorityIcon.vue —
// v-tooltip thay bằng attr title; icon rỗng thì không render (như Icon.vue gốc).
interface CardPriorityIconProps {
    priority?: string | null;
    showEmpty?: boolean;
    className?: string;
}

export default function CardPriorityIcon({ priority = '', showEmpty = false, className = '' }: CardPriorityIconProps) {
    const iconName = priority && PRIORITY_ICONS[priority] ? PRIORITY_ICONS[priority] : showEmpty ? 'i-woot-priority-empty' : '';

    if (!iconName) return null;

    const tooltipContent =
        priority && PRIORITY_LABELS[priority]
            ? t(PRIORITY_LABELS[priority])
            : showEmpty
              ? t('CONVERSATION.PRIORITY.OPTIONS.NONE')
              : '';

    return <span title={tooltipContent} className={`${iconName} size-4 text-n-slate-5 ${className}`.trim()} />;
}
