import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import ConversationCard from 'dashboard/components/widgets/conversation/ConversationCard';
import Loader from 'shared/components/loader/Loader';
import { conversationUrl } from 'dashboard/helper/URLHelper';

import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useConversation } from '../../ConversationContext';
import { fetchContactConversations } from '../../panelApi';
import type { Conversation } from '../../types';
import { filterPreviousConversations, shouldShowInboxName } from './previousConversations';

// Port từ routes/dashboard/conversation/ContactConversations.vue — 20 hội thoại
// gần nhất của liên hệ qua GET /contacts/{id}/conversations.
// Khác biệt cố ý: menu chuột phải (open-new-tab / copy-link) chưa port vì
// ConversationContextMenu của yona mới có nhánh đã đọc/chưa đọc (B8); SCSS scoped
// `.no-label-message` trải thẳng thành class Tailwind.
interface ContactConversationsProps {
    contactId: number;
}

export default function ContactConversations({ contactId }: ContactConversationsProps) {
    const { accountId, inboxId, teamId, label, conversationId, conversationType } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsFetching(true);
        fetchContactConversations(accountId, contactId)
            .catch(() => [] as Conversation[])
            .then(payload => {
                if (cancelled) return;
                setConversations(payload);
                setIsFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    if (isFetching) {
        return (
            <div className="flex items-center justify-center py-5">
                <Loader />
            </div>
        );
    }

    const previousConversations = filterPreviousConversations(conversations, conversationId);

    if (!previousConversations.length) {
        return (
            <div>
                <div className="px-4 p-3 text-n-slate-11 mb-4">
                    <span>{t('CONTACT_PANEL.CONVERSATIONS.NO_RECORDS_FOUND')}</span>
                </div>
            </div>
        );
    }

    const onCardClick = (conversation: Conversation, event: MouseEvent<HTMLDivElement>) => {
        const path = conversationUrl({ accountId, inboxId, teamId, label, conversationType, id: conversation.id });
        if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            window.open(path, '_blank', 'noopener,noreferrer');
            return;
        }
        router.visit(path, { preserveState: true, preserveScroll: true });
    };

    return (
        <div>
            <div className="contact-conversation--list [&>.conversation:last-child]:!border-b-0 [&>.conversation:last-child:hover]:!border-b-0 [&>.conversation:last-child]:!rounded-b-lg">
                {previousConversations.map(conversation => (
                    <ConversationCard
                        key={conversation.id}
                        chat={conversation}
                        currentContact={conversation.meta?.sender ?? { id: 0, name: null }}
                        assignee={conversation.meta?.assignee ?? {}}
                        inbox={
                            inboxes.find(item => item.id === conversation.inbox_id) ?? {
                                name: '',
                                channel_type: '',
                            }
                        }
                        isActiveChat={conversationId === conversation.id}
                        showInboxName={shouldShowInboxName(inboxId, inboxes.length)}
                        showStatus
                        hideThumbnail
                        compact
                        onClick={event => onCardClick(conversation, event)}
                    />
                ))}
            </div>
        </div>
    );
}
