import { t } from '../../../../i18n';

// Port từ components-next/Conversation/ConversationCard/UnreadBadge.vue
interface UnreadBadgeProps {
    count: number;
    alignBottom?: boolean;
    className?: string;
}

export default function UnreadBadge({ count, alignBottom = false, className = '' }: UnreadBadgeProps) {
    if (count <= 0) return <span />;

    const displayCount = count > 9 ? t('CHAT_LIST.UNREAD_COUNT_OVERFLOW') : count;

    return (
        <span
            className={[
                'bg-n-ruby-9 rounded-full h-4 min-w-4 max-w-5 px-1 w-fit font-medium text-xxs leading-3 text-white inline-grid place-items-center flex-shrink-0',
                alignBottom ? 'mb-0.5' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {displayCount}
        </span>
    );
}
