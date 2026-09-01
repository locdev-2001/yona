import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { putJson } from 'dashboard/helper/apiClient';
import Dashboard from '../Dashboard';
import ContactsListLayout from 'dashboard/components-next/Contacts/ContactsListLayout';
import ContactEmptyState from 'dashboard/components-next/Contacts/EmptyState/ContactEmptyState';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import ContactsList from 'dashboard/components-next/Contacts/Pages/ContactsList';
import type { SortState } from 'dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu';
import { fetchContacts, searchContacts } from 'dashboard/contacts/api';
import type { Contact, ContactsMeta } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../types';

// Port từ dashboard/routes/dashboard/contacts/pages/ContactsIndex.vue.
// Bỏ ở B2 (ghi trong trace): segments/labels/filter/active view (nhóm C hoặc
// tính năng riêng), ContactsBulkActionBar + bulk delete (nhóm C).
const DEFAULT_SORT_FIELD = 'last_activity_at';
const DEBOUNCE_DELAY = 300;

const parseSortSettings = (sortString = '') => {
    const hasDescending = sortString.startsWith('-');
    const sortField = hasDescending ? sortString.slice(1) : sortString;

    return {
        sort: sortField || DEFAULT_SORT_FIELD,
        order: hasDescending ? '-' : '',
    };
};

const readQueryParam = (name: string) => new URLSearchParams(window.location.search).get(name);

// updatePageParam của bản gốc (router.replace query) — giữ page/search trên URL.
const updatePageParam = (page: number, search = '') => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(page));
    if (search) {
        params.set('search', search);
    } else {
        params.delete('search');
    }
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
};

export default function ContactsIndex() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const initialSort = useMemo(
        () => parseSortSettings(String(auth.user?.ui_settings?.contacts_sort_by ?? '')),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [meta, setMeta] = useState<ContactsMeta>({ count: 0, currentPage: 1 });
    const [isFetching, setFetching] = useState(true);
    const [searchValue, setSearchValue] = useState(() => readQueryParam('search') || '');
    const [sortState, setSortState] = useState<SortState>(initialSort);
    const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const searchPageNumber = useRef(1);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const requestSeq = useRef(0);

    const sortStateRef = useRef(sortState);
    sortStateRef.current = sortState;
    const searchValueRef = useRef(searchValue);
    searchValueRef.current = searchValue;

    const buildSortAttr = () => `${sortStateRef.current.order}${sortStateRef.current.sort}`;

    const fetchList = useCallback(
        async (page = 1, options: { clearSelection?: boolean } = {}) => {
            const { clearSelection = true } = options;
            if (clearSelection) setSelectedContactIds([]);

            const seq = ++requestSeq.current;
            setFetching(true);
            try {
                const result = await fetchContacts(accountId, page, buildSortAttr());
                if (seq !== requestSeq.current) return;
                setContacts(result.contacts);
                setMeta(result.meta);
                updatePageParam(page);
            } finally {
                if (seq === requestSeq.current) setFetching(false);
            }
        },
        [accountId],
    );

    const runSearch = useCallback(
        async (value: string, page = 1, append = false) => {
            const seq = ++requestSeq.current;
            if (!append) {
                searchPageNumber.current = 1;
                setFetching(true);
            }
            try {
                const result = await searchContacts(accountId, value, page, buildSortAttr());
                if (seq !== requestSeq.current) return;
                setContacts(current => (append ? [...current, ...result.contacts] : result.contacts));
                setMeta(result.meta);
                updatePageParam(page, value);
                searchPageNumber.current = page;
            } finally {
                if (seq === requestSeq.current) setFetching(false);
            }
        },
        [accountId],
    );

    const onSearchInput = (value: string) => {
        setSearchValue(value);
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setSelectedContactIds([]);
            if (!value) {
                void fetchList(1, { clearSelection: false });
                return;
            }
            void runSearch(value, 1);
        }, DEBOUNCE_DELAY);
    };

    const loadMoreSearchResults = async () => {
        if (!meta.hasMore || isLoadingMore) return;

        setLoadingMore(true);
        await runSearch(searchValueRef.current, searchPageNumber.current + 1, true);
        setLoadingMore(false);
    };

    const handleSort = async (nextSort: SortState) => {
        setSortState(nextSort);
        sortStateRef.current = nextSort;

        // Lưu lựa chọn sort vào ui_settings như bản gốc (useUISettings).
        void putJson('/api/v1/profile', {
            ui_settings: { contacts_sort_by: `${nextSort.order}${nextSort.sort}` },
        });

        if (searchValueRef.current) {
            await runSearch(searchValueRef.current, 1);
            return;
        }
        await fetchList();
    };

    const toggleContactSelection = ({ id, value }: { id: number; value?: boolean }) => {
        setSelectedContactIds(current => {
            const isAlreadySelected = current.includes(id);
            const shouldSelect = value ?? !isAlreadySelected;

            if (shouldSelect && !isAlreadySelected) return [...current, id];
            if (!shouldSelect && isAlreadySelected) return current.filter(contactId => contactId !== id);
            return current;
        });
    };

    const refreshCurrentView = () => {
        if (searchValueRef.current) {
            void runSearch(searchValueRef.current, 1);
            return;
        }
        void fetchList(meta.currentPage || 1);
    };

    useEffect(() => {
        const initialPage = Number(readQueryParam('page')) || 1;
        if (searchValueRef.current) {
            void runSearch(searchValueRef.current, initialPage);
        } else {
            void fetchList(initialPage);
        }

        return () => clearTimeout(debounceTimer.current);
    }, [fetchList, runSearch]);

    const isSearchView = Boolean(searchValue);
    const hasContacts = contacts.length > 0;
    const headerTitle = isSearchView ? t('CONTACTS_LAYOUT.HEADER.SEARCH_TITLE') : t('CONTACTS_LAYOUT.HEADER.TITLE');
    const showEmptyStateLayout = !isSearchView && !hasContacts && (meta.currentPage || 1) === 1 && !isFetching;
    const showEmptyText = isSearchView && !hasContacts && !isFetching;

    const handleContactUpdated = (updated: Contact) => {
        setContacts(current => current.map(contact => (contact.id === updated.id ? updated : contact)));
    };

    return (
        <Dashboard>
            <div className="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-surface-1">
                <ContactsListLayout
                    searchValue={searchValue}
                    headerTitle={headerTitle}
                    currentPage={meta.currentPage}
                    totalItems={meta.count}
                    showPaginationFooter={!isFetching && hasContacts && !isSearchView}
                    activeSort={sortState.sort}
                    activeOrdering={sortState.order}
                    useInfiniteScroll={isSearchView}
                    hasMore={meta.hasMore ?? false}
                    isLoadingMore={isLoadingMore}
                    onPageChange={page => fetchList(page, { clearSelection: false })}
                    onSearch={onSearchInput}
                    onUpdateSort={handleSort}
                    onLoadMore={loadMoreSearchResults}
                    onContactCreated={refreshCurrentView}
                >
                    {isFetching && !(isSearchView && hasContacts) ? (
                        <div className="flex items-center justify-center py-10 text-n-slate-11">
                            <Spinner />
                        </div>
                    ) : showEmptyStateLayout ? (
                        <ContactEmptyState
                            className="pt-14"
                            title={t('CONTACTS_LAYOUT.EMPTY_STATE.TITLE')}
                            subtitle={t('CONTACTS_LAYOUT.EMPTY_STATE.SUBTITLE')}
                            buttonLabel={t('CONTACTS_LAYOUT.EMPTY_STATE.BUTTON_LABEL')}
                            onCreated={refreshCurrentView}
                        />
                    ) : showEmptyText ? (
                        <div className="flex items-center justify-center py-10">
                            <span className="text-base text-n-slate-11">
                                {t('CONTACTS_LAYOUT.EMPTY_STATE.SEARCH_EMPTY_STATE_TITLE')}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 pt-4 pb-6">
                            <ContactsList
                                contacts={contacts}
                                selectedContactIds={selectedContactIds}
                                onToggleContact={toggleContactSelection}
                                onContactUpdated={handleContactUpdated}
                                onContactDeleted={refreshCurrentView}
                            />
                        </div>
                    )}
                </ContactsListLayout>
            </div>
        </Dashboard>
    );
}
