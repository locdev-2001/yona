import type { MouseEvent } from 'react';
import { router } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import CardMessagePreview from './CardMessagePreview';
import CardMessagePreviewWithMeta from './CardMessagePreviewWithMeta';
import CardPriorityIcon from './CardPriorityIcon';
import type { AccountLabel } from './CardLabels';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { dynamicTime, shortTimestamp } from 'shared/helpers/timeHelper';
import type { Conversation, ContactMeta } from 'dashboard/conversation/types';

// Port từ components-next/Conversation/ConversationCard/ConversationCard.vue.
// Khác biệt cố ý: SLA (EE) không port → luôn dùng nhánh preview không meta khi
// hội thoại không có nhãn.
interface ConversationCardProps {
    conversation: Conversation;
    contact?: Partial<ContactMeta> | null;
    stateInbox?: { name?: string; channel_type?: string } | null;
    accountLabels: AccountLabel[];
    accountId: number;
    className?: string;
}

export default function ConversationCard({
    conversation,
    contact = null,
    stateInbox = null,
    accountLabels,
    accountId,
    className = '',
}: ConversationCardProps) {
    const inboxIcon = getInboxIconByType(stateInbox?.channel_type ?? '', 'fill');
    const lastActivityAt = conversation.timestamp ? shortTimestamp(dynamicTime(conversation.timestamp)) : '';
    const labelSet = new Set(conversation.labels ?? []);
    const hasVisibleLabels = (accountLabels ?? []).some(({ title }) => labelSet.has(title));

    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        const path = conversationUrl({ accountId, id: conversation.id });

        if (event.metaKey || event.ctrlKey) {
            window.open(path, '_blank', 'noopener noreferrer nofollow');
            return;
        }
        router.visit(path);
    };

    return (
        <div
            role="button"
            className={`flex w-full gap-3 px-3 py-4 transition-all duration-300 ease-in-out cursor-pointer ${className}`.trim()}
            onClick={onCardClick}
        >
            <Avatar
                name={contact?.name ?? ''}
                src={contact?.thumbnail}
                size={24}
                status={contact?.availability_status as AvailabilityStatus | undefined}
                roundedFull
            />
            <div className="flex flex-col w-full gap-1 min-w-0">
                <div className="flex items-center justify-between h-6 gap-2">
                    <h4 className="text-base font-medium truncate text-n-slate-12">{contact?.name}</h4>
                    <div className="flex items-center gap-2">
                        <CardPriorityIcon priority={conversation.priority || null} />
                        <div
                            title={stateInbox?.name}
                            className="flex items-center justify-center flex-shrink-0 rounded-full bg-n-alpha-2 size-5"
                        >
                            <Icon icon={inboxIcon} className="flex-shrink-0 text-n-slate-11 size-3" />
                        </div>
                        <span className="text-sm text-n-slate-10">{lastActivityAt}</span>
                    </div>
                </div>
                {hasVisibleLabels ? (
                    <CardMessagePreviewWithMeta
                        conversation={conversation}
                        accountLabels={accountLabels}
                        hasLabels
                    />
                ) : (
                    <CardMessagePreview conversation={conversation} />
                )}
            </div>
        </div>
    );
}
