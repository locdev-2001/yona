import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import MessagePreview from './MessagePreview';
import CardLabels from './CardLabels';
import type { AccountLabel } from './CardLabels';
import type { Conversation } from 'dashboard/conversation/types';

// Port từ components-next/Conversation/ConversationCard/CardMessagePreviewWithMeta.vue.
// Khác biệt cố ý: SLACardLabel (EE) không port → nhánh hasSlaThreshold luôn sai,
// lưới chỉ còn 'grid-cols-[1fr_20px]'.
interface CardMessagePreviewWithMetaProps {
    conversation: Conversation;
    accountLabels: AccountLabel[];
    hasLabels?: boolean;
}

export default function CardMessagePreviewWithMeta({
    conversation,
    accountLabels,
    hasLabels = false,
}: CardMessagePreviewWithMetaProps) {
    const agent = conversation.meta?.assignee;
    const assignee = {
        seed: avatarSeed('user', agent?.id),
        name: agent?.name ?? agent?.available_name,
        thumbnail: agent?.thumbnail,
        status: agent?.availability_status as AvailabilityStatus | undefined,
    };
    const unreadMessagesCount = conversation.unread_count;

    return (
        <div className="flex flex-col w-full gap-1">
            <div className="flex items-center justify-between w-full gap-2 py-1 h-7">
                <MessagePreview
                    message={conversation.last_non_activity_message ?? {}}
                    className={`flex-1 min-w-0 ${unreadMessagesCount > 0 ? 'text-n-slate-12' : 'text-n-slate-11'}`}
                />
                {unreadMessagesCount > 0 ? (
                    <div className="inline-flex items-center justify-center flex-shrink-0 rounded-full size-5 bg-n-brand">
                        <span className="text-xs font-semibold text-white">{unreadMessagesCount}</span>
                    </div>
                ) : null}
            </div>
            <div className="grid items-center gap-2.5 h-7 grid-cols-[1fr_20px]">
                {hasLabels ? (
                    <div className="overflow-hidden">
                        <CardLabels conversationLabels={conversation.labels} accountLabels={accountLabels} />
                    </div>
                ) : null}
                {assignee.name ? (
                    <Avatar
                        seed={assignee.seed}
                        name={assignee.name}
                        src={assignee.thumbnail}
                        size={20}
                        status={assignee.status}
                        roundedFull
                    />
                ) : null}
            </div>
        </div>
    );
}
