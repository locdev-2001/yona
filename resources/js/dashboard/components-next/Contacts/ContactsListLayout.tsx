import { useRef } from 'react';
import type { ReactNode } from 'react';

import ContactListHeaderWrapper from 'dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper';
import type { ContactListHeaderWrapperHandle } from 'dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper';
import type { SortState } from 'dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu';
import PaginationFooter from 'dashboard/components-next/pagination/PaginationFooter';
import ContactsLoadMore from 'dashboard/components-next/Contacts/ContactsLoadMore';
import ContactsActiveFiltersPreview from 'dashboard/components-next/Contacts/ContactsHeader/components/ContactsActiveFiltersPreview';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import type { CustomView } from 'dashboard/composables/useCustomViews';
import type { Contact } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsListLayout.vue.
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
    isFetchingList?: boolean;
    hasAppliedFilters?: boolean;
    isLabelView?: boolean;
    isActiveView?: boolean;
    showSearch?: boolean;
    activeLabel?: string;
    segmentsId?: number;
    activeSegment?: CustomView | null;
    appliedFilters?: ConversationFilterCondition[];
    children: ReactNode;
    onPageChange: (page: number) => void;
    onSearch: (value: string) => void;
    onUpdateSort: (state: SortState) => void;
    onLoadMore?: () => void;
    onContactCreated: (contact: Contact) => void;
    onApplyFilter?: (filters: ConversationFilterCondition[]) => void;
    onClearFilters?: () => void;
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
    isFetchingList = false,
    hasAppliedFilters = false,
    isLabelView = false,
    isActiveView = false,
    showSearch = true,
    activeLabel = '',
    segmentsId = 0,
    activeSegment = null,
    appliedFilters = [],
    children,
    onPageChange,
    onSearch,
    onUpdateSort,
    onLoadMore,
    onContactCreated,
    onApplyFilter,
    onClearFilters,
}: ContactsListLayoutProps) {
    const headerRef = useRef<ContactListHeaderWrapperHandle>(null);
    const hasActiveSegments = Boolean(activeSegment && segmentsId !== 0);
    const showActiveFiltersPreview =
        (hasAppliedFilters || hasActiveSegments) && !isFetchingList && !isLabelView && !isActiveView;
    const showLoadMore = useInfiniteScroll && hasMore;
    const showPagination = !useInfiniteScroll && showPaginationFooter;

    return (
        <section className="flex w-full h-full gap-4 overflow-hidden justify-evenly bg-n-surface-1">
            <div className="flex flex-col w-full h-full transition-all duration-300">
                <ContactListHeaderWrapper
                    ref={headerRef}
                    showSearch={showSearch}
                    isLabelView={isLabelView}
                    isActiveView={isActiveView}
                    activeLabel={activeLabel}
                    searchValue={searchValue}
                    activeSort={activeSort}
                    activeOrdering={activeOrdering}
                    headerTitle={headerTitle}
                    segmentsId={segmentsId}
                    activeSegment={activeSegment}
                    appliedFilters={appliedFilters}
                    onUpdateSort={onUpdateSort}
                    onSearch={onSearch}
                    onContactCreated={onContactCreated}
                    onApplyFilter={onApplyFilter}
                    onClearFilters={onClearFilters}
                />
                <main className="flex-1 overflow-y-auto px-6">
                    <div className="w-full mx-auto max-w-5xl">
                        {showActiveFiltersPreview ? (
                            <ContactsActiveFiltersPreview
                                activeSegment={hasActiveSegments ? activeSegment : null}
                                appliedFilters={appliedFilters}
                                className="mb-1"
                                onClearFilters={() => onClearFilters?.()}
                                onOpenFilter={() => headerRef.current?.onToggleFilters()}
                            />
                        ) : null}
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
