import type { ReactNode, Ref } from 'react';

import ContactListHeaderWrapper from 'dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper';
import type { ContactListHeaderWrapperHandle } from 'dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper';
import type { SortState } from 'dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu';
import PaginationFooter from 'dashboard/components-next/pagination/PaginationFooter';
import ContactsLoadMore from 'dashboard/components-next/Contacts/ContactsLoadMore';
import type { Contact } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsListLayout.vue.
// ContactsActiveFiltersPreview (segments/filters — nhóm C) chưa render:
// điều kiện hiện của nó không bao giờ đúng khi chưa có filter.
interface ContactsListLayoutProps {
    searchValue?: string;
    headerTitle?: string;
    showPaginationFooter?: boolean;
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    activeSort?: string;
    activeOrdering?: string;
    useInfiniteScroll?: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    headerRef?: Ref<ContactListHeaderWrapperHandle>;
    children: ReactNode;
    onPageChange: (page: number) => void;
    onSearch: (value: string) => void;
    onUpdateSort: (state: SortState) => void;
    onLoadMore?: () => void;
    onContactCreated: (contact: Contact) => void;
}

export default function ContactsListLayout({
    searchValue = '',
    headerTitle = '',
    showPaginationFooter = true,
    currentPage = 1,
    totalItems = 100,
    itemsPerPage = 15,
    activeSort = '',
    activeOrdering = '',
    useInfiniteScroll = false,
    hasMore = false,
    isLoadingMore = false,
    headerRef,
    children,
    onPageChange,
    onSearch,
    onUpdateSort,
    onLoadMore,
    onContactCreated,
}: ContactsListLayoutProps) {
    const showLoadMore = useInfiniteScroll && hasMore;
    const showPagination = !useInfiniteScroll && showPaginationFooter;

    return (
        <section className="flex w-full h-full gap-4 overflow-hidden justify-evenly bg-n-surface-1">
            <div className="flex flex-col w-full h-full transition-all duration-300">
                <ContactListHeaderWrapper
                    ref={headerRef}
                    showSearch
                    searchValue={searchValue}
                    activeSort={activeSort}
                    activeOrdering={activeOrdering}
                    headerTitle={headerTitle}
                    onUpdateSort={onUpdateSort}
                    onSearch={onSearch}
                    onContactCreated={onContactCreated}
                />
                <main className="flex-1 overflow-y-auto px-6">
                    <div className="w-full mx-auto max-w-5xl">
                        {children}
                        {showLoadMore ? (
                            <ContactsLoadMore isLoading={isLoadingMore} onLoadMore={() => onLoadMore?.()} />
                        ) : null}
                    </div>
                </main>
                {showPagination ? (
                    <footer className="sticky bottom-0 z-0">
                        <PaginationFooter
                            currentPageInfo="CONTACTS_LAYOUT.PAGINATION_FOOTER.SHOWING"
                            currentPage={currentPage}
                            totalItems={totalItems}
                            className="max-w-[67rem]"
                            itemsPerPage={itemsPerPage}
                            onPageChange={onPageChange}
                        />
                    </footer>
                ) : null}
            </div>
        </section>
    );
}
