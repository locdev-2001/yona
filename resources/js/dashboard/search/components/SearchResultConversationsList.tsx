import { t } from '../../../i18n';
import SearchResultConversationItem from './SearchResultConversationItem';
import SearchResultSection from './SearchResultSection';
import type { SearchContact, SearchConversation } from '../types';

// Port từ dashboard/modules/search/components/SearchResultConversationsList.vue.
interface SearchResultConversationsListProps {
    conversations: SearchConversation[];
    accountId: number;
    query?: string;
    isFetching?: boolean;
    showTitle?: boolean;
    className?: string;
}

export default function SearchResultConversationsList({
    conversations,
    accountId,
    query = '',
    isFetching = false,
    showTitle = true,
    className = '',
}: SearchResultConversationsListProps) {
    return (
        <SearchResultSection
            title={t('SEARCH.SECTION.CONVERSATIONS')}
            empty={!conversations.length}
            query={query}
            showTitle={showTitle}
            isFetching={isFetching}
            className={className}
        >
            {conversations.length ? (
                <ul className="space-y-3 list-none">
                    {conversations.map(conversation => {
                        const contact = conversation.contact as SearchContact;

                        return (
                            <li key={conversation.id}>
                                <SearchResultConversationItem
                                    id={conversation.id}
                                    name={contact?.name}
                                    email={contact?.email}
                                    accountId={accountId}
                                    inbox={conversation.inbox}
                                    createdAt={conversation.createdAt}
                                    emailSubject={
                                        (conversation.additionalAttributes?.mail_subject as string | undefined) ?? ''
                                    }
                                />
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </SearchResultSection>
    );
}
