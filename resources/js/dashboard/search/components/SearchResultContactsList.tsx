import { t } from '../../../i18n';
import SearchResultContactItem from './SearchResultContactItem';
import SearchResultSection from './SearchResultSection';
import type { SearchContact } from '../types';

// Port từ dashboard/modules/search/components/SearchResultContactsList.vue.
interface SearchResultContactsListProps {
    contacts: SearchContact[];
    accountId: number;
    query?: string;
    isFetching?: boolean;
    showTitle?: boolean;
    className?: string;
}

export default function SearchResultContactsList({
    contacts,
    accountId,
    query = '',
    isFetching = false,
    showTitle = true,
    className = '',
}: SearchResultContactsListProps) {
    return (
        <SearchResultSection
            title={t('SEARCH.SECTION.CONTACTS')}
            empty={!contacts.length}
            query={query}
            showTitle={showTitle}
            isFetching={isFetching}
            className={className}
        >
            {contacts.length ? (
                <ul className="space-y-3 list-none">
                    {contacts.map(contact => (
                        <li key={contact.id}>
                            <SearchResultContactItem
                                id={contact.id}
                                name={contact.name}
                                email={contact.email}
                                phone={contact.phoneNumber}
                                additionalAttributes={contact.additionalAttributes}
                                accountId={accountId}
                                thumbnail={contact.thumbnail}
                                updatedAt={contact.lastActivityAt}
                            />
                        </li>
                    ))}
                </ul>
            ) : null}
        </SearchResultSection>
    );
}
