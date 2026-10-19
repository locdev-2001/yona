import type { MouseEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import InboxName from 'dashboard/components/widgets/InboxName';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import HighlightedText from 'dashboard/components-next/highlighted-text/HighlightedText';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import type { ContactMeta, Conversation } from '../types';

interface ContactMatchItemProps {
    // Hội thoại gần nhất của liên hệ trong danh sách đang xem — bấm là mở hội thoại này.
    conversation: Conversation;
    conversationType?: string;
}

// Một dòng ở mục "Liên hệ" của ô tìm: avatar, tên (tô phần khớp), kênh của hội thoại.
export default function ContactMatchItem({ conversation, conversationType = '' }: ContactMatchItemProps) {
    const { accountId, listFilters, teamId, conversationId, searchQuery } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    const contact: ContactMeta = conversation.meta?.sender ?? { id: 0, name: null };
    const contactName = contact.name ?? '';
    const inbox = inboxes.find(item => item.id === conversation.inbox_id);
    const isActiveChat = conversationId === conversation.id;
    const conversationPath = conversationUrl({ accountId, filters: listFilters, teamId, conversationType, id: conversation.id });

    const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        if (isActiveChat) return;
        router.visit(conversationPath, { preserveState: true, preserveScroll: true });
    };

    return (
        <a
            href={conversationPath}
            aria-current={isActiveChat ? 'true' : undefined}
            className={[
                'flex items-center gap-3 w-full min-w-0 px-3 py-2 rounded-lg no-underline',
                isActiveChat ? 'bg-n-surface-selected' : 'hover:bg-n-surface-hover',
            ].join(' ')}
            onClick={onClick}
        >
            <Avatar seed={avatarSeed('contact', contact.id)} name={contactName} src={contact.thumbnail} size={32} />
            <span className="flex flex-col flex-1 min-w-0 gap-0.5">
                <span className="text-sm font-medium truncate text-n-slate-12">
                    <HighlightedText text={contactName} query={searchQuery} />
                </span>
                {inbox ? <InboxName inbox={inbox} /> : null}
            </span>
        </a>
    );
}
