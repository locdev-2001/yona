import { t } from '../../../i18n';
import MessageContent from './MessageContent';
import SearchResultMessageItem from './SearchResultMessageItem';
import SearchResultSection from './SearchResultSection';
import type { SearchMessage } from '../types';

// Port từ dashboard/modules/search/components/SearchResultMessagesList.vue.
interface SearchResultMessagesListProps {
    messages: SearchMessage[];
    accountId: number;
    query?: string;
    isFetching?: boolean;
    showTitle?: boolean;
    className?: string;
}

export default function SearchResultMessagesList({
    messages,
    accountId,
    query = '',
    isFetching = false,
    showTitle = true,
    className = '',
}: SearchResultMessagesListProps) {
    return (
        <SearchResultSection
            title={t('SEARCH.SECTION.MESSAGES')}
            empty={!messages.length}
            query={query}
            showTitle={showTitle}
            isFetching={isFetching}
            className={className}
        >
            {messages.length ? (
                <ul className="space-y-3 list-none">
                    {messages.map(message => (
                        <li key={message.id}>
                            <SearchResultMessageItem
                                id={message.conversationId}
                                accountId={accountId}
                                inboxId={message.inboxId}
                                createdAt={message.createdAt}
                                messageId={message.id}
                                isPrivate={message.private}
                                attachments={message.attachments}
                            >
                                <MessageContent
                                    author={message.sender?.name || t('SEARCH.BOT_LABEL')}
                                    message={message}
                                    searchTerm={query}
                                />
                            </SearchResultMessageItem>
                        </li>
                    ))}
                </ul>
            ) : null}
        </SearchResultSection>
    );
}
