import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import MessagePreview from './MessagePreview';
import type { Conversation } from 'dashboard/conversation/types';

// Port từ components-next/Conversation/ConversationCard/CardMessagePreview.vue.
// Bản gốc snake-case hoá lastNonActivityMessage của store; payload của yona đã
// là snake_case nên dùng thẳng.
interface CardMessagePreviewProps {
    conversation: Conversation;
}

export default function CardMessagePreview({ conversation }: CardMessagePreviewProps) {
    const agent = conversation.meta?.assignee;
    const assignee = {
        name: agent?.name ?? agent?.available_name,
        thumbnail: agent?.thumbnail,
        status: agent?.availability_status as AvailabilityStatus | undefined,
    };
    const unreadMessagesCount = conversation.unread_count;

    return (
        <div className="flex items-end w-full gap-2 pb-1">
            <MessagePreview
                message={conversation.last_non_activity_message ?? {}}
                multiLine
                className={`w-full ${unreadMessagesCount > 0 ? 'text-n-slate-12' : 'text-n-slate-11'}`}
            />
            <div className="flex items-center flex-shrink-0 gap-2 pb-2">
                {assignee.name ? (
                    <Avatar
                        name={assignee.name}
                        src={assignee.thumbnail}
                        size={20}
                        status={assignee.status}
                        roundedFull
                    />
                ) : null}
                {unreadMessagesCount > 0 ? (
                    <div className="inline-flex items-center justify-center rounded-full size-5 bg-n-brand">
                        <span className="text-xs font-semibold text-white">{unreadMessagesCount}</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
