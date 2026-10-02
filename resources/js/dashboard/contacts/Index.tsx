import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { putJson } from 'dashboard/helper/apiClient';
import Dashboard from '../Dashboard';
import ContactsListLayout from 'dashboard/components-next/Contacts/ContactsListLayout';
import ContactEmptyState from 'dashboard/components-next/Contacts/EmptyState/ContactEmptyState';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import ContactsList from 'dashboard/components-next/Contacts/Pages/ContactsList';
import ContactsBulkActionBar from './components/ContactsBulkActionBar';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { processContactBulkAction } from 'dashboard/contacts/bulkApi';
import type { SortState } from 'dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu';
import {
    fetchActiveContacts,
    fetchContacts,
    fetchContactsByLabel,
    filterContacts,
    searchContacts,
} from 'dashboard/contacts/api';
import { buildConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { useCustomViews } from 'dashboard/composables/useCustomViews';
import { mergeContactUpdateIntoList, useContactUpdates } from 'dashboard/contacts/contactUpdates';
import type { Contact, ContactIdentificationFilter, ContactsMeta } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../types';

// Port từ dashboard/routes/dashboard/contacts/pages/ContactsIndex.vue.
const DEFAULT_SORT_FIELD = 'last_activity_at';
const DEBOUNCE_DELAY = 300;
const IDENTIFICATION_FILTERS: ContactIdentificationFilter[] = ['all', 'identified', 'unidentified'];

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

interface ContactsIndexProps {
    segmentId?: number;
    label?: string;
    isActiveView?: boolean;
}

export default function ContactsIndex({ segmentId = 0, label = '', isActiveView = false }: ContactsIndexProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const segments = useCustomViews(accountId, 'contact');
    const activeSegment = segmentId ? (segments.find(view => view.id === segmentId) ?? null) : null;

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
    const [isBulkActionLoading, setBulkActionLoading] = useState(false);
    const bulkDeleteDialogRef = useRef<DialogHandle>(null);
    const [appliedFilters, setAppliedFilters] = useState<ConversationFilterCondition[]>([]);
    const [identification, setIdentification] = useState<ContactIdentificationFilter>('all');
    const identificationRef = useRef(identification);
    identificationRef.current = identification;
    const appliedFiltersRef = useRef<ConversationFilterCondition[]>([]);
    appliedFiltersRef.current = appliedFilters;
    const searchPageNumber = useRef(1);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const requestSeq = useRef(0);

    const sortStateRef = useRef(sortState);
    sortStateRef.current = sortState;
    const searchValueRef = useRef(searchValue);
    searchValueRef.current = searchValue;

    const buildSortAttr = () => `${sortStateRef.current.order}${sortStateRef.current.sort}`;

    // fetchContactsBasedOnContext của gốc: segment đang mở hoặc bộ lọc vừa áp
    // dùng POST /contacts/filter, còn lại dùng GET /contacts.
    const segmentQueryRef = useRef<string>('');
    segmentQueryRef.current = activeSegment ? JSON.stringify(activeSegment.query?.payload ?? []) : '';

    const fetchList = useCallback(
        async (page = 1, options: { clearSelection?: boolean } = {}) => {
            const { clearSelection = true } = options;
            if (clearSelection) setSelectedContactIds([]);

            const filterPayload = segmentQueryRef.current
                ? JSON.parse(segmentQueryRef.current)
                : appliedFiltersRef.current.length
                  ? buildConversationFilterPayload(appliedFiltersRef.current)
                  : null;

            const seq = ++requestSeq.current;
            setFetching(true);
            try {
                // fetchContactsBasedOnContext của gốc: active > filter/segment > label > mặc định.
                const result = isActiveView
                    ? await fetchActiveContacts(accountId, page, buildSortAttr())
                    : filterPayload && !label
                      ? await filterContacts(accountId, filterPayload, page, buildSortAttr())
                      : label
                        ? await fetchContactsByLabel(accountId, label, page, buildSortAttr(), identificationRef.current)
                        : await fetchContacts(accountId, page, buildSortAttr(), identificationRef.current);
                if (seq !== requestSeq.current) return;
                setContacts(result.contacts);
                setMeta(result.meta);
                updatePageParam(page);
            } finally {
                if (seq === requestSeq.current) setFetching(false);
            }
        },
        [accountId, label, isActiveView],
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

    const clearSelection = () => setSelectedContactIds([]);

    const toggleSelectAll = (shouldSelect: boolean) => {
        setSelectedContactIds(current => {
            const selection = new Set(current);
            contacts.forEach(contact => (shouldSelect ? selection.add(contact.id) : selection.delete(contact.id)));

            return Array.from(selection);
        });
    };

    const runBulkAction = async (
        action: () => Promise<void>,
        successKey: string,
        failureKey: string,
        onDone?: () => void,
    ) => {
        if (!selectedContactIds.length) return;

        setBulkActionLoading(true);
        try {
            await action();
            useAlert(t(successKey));
            clearSelection();
            await fetchList(meta.currentPage || 1, { clearSelection: false });
            onDone?.();
        } catch {
            useAlert(t(failureKey));
        } finally {
            setBulkActionLoading(false);
        }
    };

    const assignLabels = (labels: string[]) => {
        if (!labels.length) return;
        void runBulkAction(
            () => processContactBulkAction(accountId, { ids: selectedContactIds, labels: { add: labels } }),
            'CONTACTS_BULK_ACTIONS.ASSIGN_LABELS_SUCCESS',
            'CONTACTS_BULK_ACTIONS.ASSIGN_LABELS_FAILED',
        );
    };

    const removeLabels = (labels: string[]) => {
        if (!labels.length) return;
        void runBulkAction(
            () => processContactBulkAction(accountId, { ids: selectedContactIds, labels: { remove: labels } }),
            'CONTACTS_BULK_ACTIONS.REMOVE_LABELS_SUCCESS',
            'CONTACTS_BULK_ACTIONS.REMOVE_LABELS_FAILED',
        );
    };

    const deleteContacts = () => {
        void runBulkAction(
            () => processContactBulkAction(accountId, { ids: selectedContactIds, action_name: 'delete' }),
            'CONTACTS_BULK_ACTIONS.DELETE_SUCCESS',
            'CONTACTS_BULK_ACTIONS.DELETE_FAILED',
            () => bulkDeleteDialogRef.current?.close(),
        );
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
        // segmentQueryRef đổi khi store custom view nạp xong → nạp lại đúng segment.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchList, runSearch, segmentQueryRef.current]);

    const onApplyContactFilters = (filters: ConversationFilterCondition[]) => {
        setAppliedFilters(filters);
        appliedFiltersRef.current = filters;
        void fetchList(1);
    };

    const onClearContactFilters = () => {
        setAppliedFilters([]);
        appliedFiltersRef.current = [];
        void fetchList(1);
    };

    const onIdentificationChanged = (next: ContactIdentificationFilter) => {
        setIdentification(next);
        identificationRef.current = next;
        void fetchList(1);
    };

    const isSearchView = Boolean(searchValue);
    const hasContacts = contacts.length > 0;
    const headerTitle = isSearchView
        ? t('CONTACTS_LAYOUT.HEADER.SEARCH_TITLE')
        : isActiveView
          ? t('CONTACTS_LAYOUT.HEADER.ACTIVE_TITLE')
          : label
            ? `#${label}`
            : (activeSegment?.name ?? t('CONTACTS_LAYOUT.HEADER.TITLE'));
    const hasAppliedFilters = appliedFilters.length > 0 || Boolean(activeSegment);
    const showIdentificationTabs = !isSearchView && !isActiveView && !hasAppliedFilters;
    const identificationTabs = [
        {
            value: 'all',
            label: t('CONTACTS_LAYOUT.IDENTIFICATION.ALL'),
            count:
                meta.identifiedCount === undefined || meta.unidentifiedCount === undefined
                    ? undefined
                    : meta.identifiedCount + meta.unidentifiedCount,
        },
        {
            value: 'identified',
            label: t('CONTACTS_LAYOUT.IDENTIFICATION.IDENTIFIED'),
            count: meta.identifiedCount,
        },
        {
            value: 'unidentified',
            label: t('CONTACTS_LAYOUT.IDENTIFICATION.UNIDENTIFIED'),
            count: meta.unidentifiedCount,
        },
    ];
    const isContactIndexView = !label && !isActiveView && !segmentId;
    const showEmptyStateLayout =
        !isSearchView &&
        !hasContacts &&
        isContactIndexView &&
        (meta.currentPage || 1) === 1 &&
        !isFetching &&
        !hasAppliedFilters &&
        identification === 'all';
    const showEmptyText =
        (isSearchView || hasAppliedFilters || !isContactIndexView || identification !== 'all') &&
        !hasContacts &&
        !isFetching;
    const emptyStateMessage = isActiveView
        ? t('CONTACTS_LAYOUT.EMPTY_STATE.ACTIVE_EMPTY_STATE_TITLE')
        : !isSearchView || hasAppliedFilters
          ? t('CONTACTS_LAYOUT.EMPTY_STATE.LIST_EMPTY_STATE_TITLE')
          : t('CONTACTS_LAYOUT.EMPTY_STATE.SEARCH_EMPTY_STATE_TITLE');

    const handleContactUpdated = (updated: Contact) => {
        setContacts(current => current.map(contact => (contact.id === updated.id ? updated : contact)));
    };

    useContactUpdates(update => setContacts(current => mergeContactUpdateIntoList(current, update)));

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
                    segmentsId={segmentId}
                    activeSegment={activeSegment}
                    appliedFilters={appliedFilters}
                    onApplyFilter={onApplyContactFilters}
                    onClearFilters={onClearContactFilters}
                    isFetchingList={isFetching}
                    hasAppliedFilters={hasAppliedFilters}
                    isLabelView={Boolean(label)}
                    isActiveView={isActiveView}
                    showSearch={!segmentId && !isActiveView}
                    activeLabel={label}
                >
                    {showIdentificationTabs && !showEmptyStateLayout ? (
                        <TabBar
                            className="mt-4 w-fit"
                            tabs={identificationTabs}
                            initialActiveTab={IDENTIFICATION_FILTERS.indexOf(identification)}
                            onTabChanged={tab => onIdentificationChanged(tab.value as ContactIdentificationFilter)}
                        />
                    ) : null}
                    {selectedContactIds.length > 0 && !(isFetching && !(isSearchView && hasContacts)) ? (
                        <ContactsBulkActionBar
                            visibleContactIds={contacts.map(contact => contact.id)}
                            selectedContactIds={selectedContactIds}
                            isLoading={isBulkActionLoading}
                            onToggleAll={toggleSelectAll}
                            onClearSelection={clearSelection}
                            onAssignLabels={assignLabels}
                            onRemoveLabels={removeLabels}
                            onDeleteSelected={() => {
                                if (!selectedContactIds.length || isBulkActionLoading) return;
                                bulkDeleteDialogRef.current?.open();
                            }}
                        />
                    ) : null}
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
                                {emptyStateMessage}
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
                            {selectedContactIds.length > 0 ? (
                                <Dialog
                                    ref={bulkDeleteDialogRef}
                                    type="alert"
                                    title={
                                        selectedContactIds.length > 1
                                            ? t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.TITLE')
                                            : t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.SINGULAR_TITLE')
                                    }
                                    description={
                                        selectedContactIds.length > 1
                                            ? t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.DESCRIPTION', {
                                                  count: selectedContactIds.length,
                                              })
                                            : t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.SINGULAR_DESCRIPTION')
                                    }
                                    confirmButtonLabel={
                                        selectedContactIds.length > 1
                                            ? t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.CONFIRM_MULTIPLE')
                                            : t('CONTACTS_BULK_ACTIONS.DELETE_DIALOG.CONFIRM_SINGLE')
                                    }
                                    isLoading={isBulkActionLoading}
                                    onConfirm={deleteContacts}
                                />
                            ) : null}
                        </div>
                    )}
                </ContactsListLayout>
            </div>
        </Dashboard>
    );
}
