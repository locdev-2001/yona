import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import ConversationCard from 'dashboard/components-next/Conversation/ConversationCard/ConversationCard';
import type { AccountLabel } from 'dashboard/components-next/Conversation/ConversationCard/CardLabels';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { fetchContactConversations } from 'dashboard/conversation/panelApi';
import type { Conversation } from 'dashboard/conversation/types';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ components-next/Contacts/ContactsSidebar/ContactHistory.vue.
interface ContactHistoryProps {
    contactId: number;
    selectedContact?: Contact | null;
}

export default function ContactHistory({ contactId, selectedContact = null }: ContactHistoryProps) {
    const { currentAccount, inboxes = [] } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const accountLabels = useLabelsList(accountId) as unknown as AccountLabel[];

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isFetching, setFetching] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setFetching(true);
        fetchContactConversations(accountId, contactId)
            .catch(() => [] as Conversation[])
            .then(payload => {
                if (cancelled) return;
                setConversations(payload);
                setFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    if (isFetching) {
        return (
            <div className="flex items-center justify-center py-10 text-n-slate-11">
                <Spinner />
            </div>
        );
    }

    if (!conversations.length) {
        return (
            <p className="px-6 py-10 text-sm leading-6 text-center text-n-slate-11">
                {t('CONTACTS_LAYOUT.SIDEBAR.HISTORY.EMPTY_STATE')}
            </p>
        );
    }

    return (
        <div className="px-6 divide-y divide-n-strong [&>*:hover]:!border-y-transparent [&>*:hover+*]:!border-t-transparent">
            {conversations.map(conversation => (
                <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    contact={conversation.meta?.sender ?? selectedContact}
                    stateInbox={inboxes.find(inbox => inbox.id === conversation.inbox_id) ?? null}
                    accountLabels={accountLabels}
                    accountId={accountId}
                    className="rounded-none hover:rounded-xl hover:bg-n-alpha-1 dark:hover:bg-n-alpha-3"
                />
            ))}
        </div>
    );
}
