import { useCallback, useEffect, useRef, useState } from 'react';

import { t } from '../../i18n';
import Dashboard from '../Dashboard';
import Loader from 'shared/components/loader/Loader';
import PaginationFooter from 'dashboard/components-next/pagination/PaginationFooter';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import NewYonaChatDialog from 'dashboard/conversation/people/NewYonaChatDialog';
import { mergeContactPresence } from 'dashboard/components-next/Contacts/Pages/ContactsList';
import { useContactPresenceOverlay } from 'dashboard/components-next/avatar/presence';
import { fetchActiveContacts, fetchContacts, searchContacts } from 'dashboard/contacts/api';
import { mergeContactUpdateIntoList, useContactUpdates } from 'dashboard/contacts/contactUpdates';
import type { Contact, ContactsMeta } from 'dashboard/contacts/types';
import FriendRow from './components/FriendRow';
import { usePage } from '@inertiajs/react';
import type { DashboardPageProps } from '../types';

const SORT_BY_LAST_ACTIVITY = '-last_activity_at';
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 15;

// "Đang chờ xử lý" = người mới nhắn tới, chưa định danh (liên hệ nháp); xem docs/ux-decisions.md.
const FRIEND_TABS = ['online', 'all', 'pending'] as const;
type FriendTab = (typeof FRIEND_TABS)[number];

const TAB_LABEL_KEYS: Record<FriendTab, string> = {
    online: 'CONTACTS_LAYOUT.FRIENDS.TABS.ONLINE',
    all: 'CONTACTS_LAYOUT.FRIENDS.TABS.ALL',
    pending: 'CONTACTS_LAYOUT.FRIENDS.TABS.PENDING',
};

const EMPTY_KEYS: Record<FriendTab, string> = {
    online: 'CONTACTS_LAYOUT.FRIENDS.EMPTY.ONLINE',
    all: 'CONTACTS_LAYOUT.FRIENDS.EMPTY.ALL',
    pending: 'CONTACTS_LAYOUT.FRIENDS.EMPTY.PENDING',
};

function fetchTab(accountId: number, tab: FriendTab, page: number) {
    if (tab === 'online') return fetchActiveContacts(accountId, page, SORT_BY_LAST_ACTIVITY);
    return fetchContacts(accountId, page, SORT_BY_LAST_ACTIVITY, tab === 'pending' ? 'unidentified' : 'all');
}

interface FriendsIndexProps {
    isActiveView?: boolean;
}

// Trang Bạn bè: tab Trực tuyến / Tất cả / Đang chờ xử lý, tìm theo tên, Thêm Bạn
// mở hộp tìm người dùng Yona theo @username (dùng chung với danh sách hội thoại).
export default function FriendsIndex({ isActiveView = false }: FriendsIndexProps) {
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;
    const [activeTab, setActiveTab] = useState<FriendTab>(isActiveView ? 'online' : 'all');
    const [searchValue, setSearchValue] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [meta, setMeta] = useState<ContactsMeta>({ count: 0, currentPage: 1 });
    const [isFetching, setFetching] = useState(true);
    const requestSeq = useRef(0);
    const addFriendDialogRef = useRef<DialogHandle>(null);
    const { presenceMap, hasReceivedPresence } = useContactPresenceOverlay();

    const load = useCallback(
        async (tab: FriendTab, search: string, page: number) => {
            const seq = ++requestSeq.current;
            setFetching(true);
            try {
                const result = search
                    ? await searchContacts(accountId, search, page, SORT_BY_LAST_ACTIVITY)
                    : await fetchTab(accountId, tab, page);
                if (seq !== requestSeq.current) return;
                setContacts(result.contacts);
                setMeta(result.meta);
            } finally {
                if (seq === requestSeq.current) setFetching(false);
            }
        },
        [accountId],
    );

    useEffect(() => {
        const timer = setTimeout(() => void load(activeTab, searchValue.trim(), 1), searchValue ? SEARCH_DEBOUNCE_MS : 0);
        return () => clearTimeout(timer);
    }, [load, activeTab, searchValue]);

    useContactUpdates(update => setContacts(current => mergeContactUpdateIntoList(current, update)));

    const visibleContacts = mergeContactPresence(contacts, presenceMap, hasReceivedPresence);
    const isSearching = searchValue.trim() !== '';
    const sectionLabel = isSearching ? t('CONTACTS_LAYOUT.HEADER.SEARCH_TITLE') : t(TAB_LABEL_KEYS[activeTab]);
    const emptyMessage = isSearching ? t('CONTACTS_LAYOUT.FRIENDS.EMPTY.SEARCH') : t(EMPTY_KEYS[activeTab]);
    const reload = () => void load(activeTab, searchValue.trim(), meta.currentPage || 1);

    return (
        <Dashboard>
            <section className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-n-surface-1">
                <header className="flex flex-wrap items-center gap-x-2 gap-y-1 min-h-12 px-4 py-2 border-b border-n-weak">
                    <span className="flex items-center gap-2 pe-2 shrink-0 text-sm font-semibold text-n-slate-12">
                        <span className="i-lucide-users-round size-5 text-n-slate-11" />
                        {t('CONTACTS_LAYOUT.FRIENDS.TITLE')}
                    </span>
                    <span className="size-1 rounded-full bg-n-slate-8 shrink-0 max-md:hidden" />
                    <nav className="flex items-center gap-1 max-md:order-last max-md:w-full max-md:overflow-x-auto no-scrollbar" role="tablist">
                        {FRIEND_TABS.map(tab => {
                            const isActive = tab === activeTab && !isSearching;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                        isActive
                                            ? 'bg-n-alpha-3 text-n-slate-12'
                                            : 'text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12'
                                    }`}
                                    onClick={() => {
                                        setSearchValue('');
                                        setActiveTab(tab);
                                    }}
                                >
                                    {t(TAB_LABEL_KEYS[tab])}
                                </button>
                            );
                        })}
                    </nav>
                    <button
                        type="button"
                        className="h-8 px-3 ms-auto md:ms-1 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 bg-n-brand text-white hover:brightness-110 transition"
                        onClick={() => addFriendDialogRef.current?.open()}
                    >
                        {t('CONTACTS_LAYOUT.FRIENDS.ADD_FRIEND')}
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto px-4 sm:px-7">
                    <label className="flex items-center gap-2 h-10 px-3 mt-4 rounded-lg border border-n-weak bg-n-surface-2 focus-within:border-n-brand">
                        <span className="i-lucide-search size-4 shrink-0 text-n-slate-11" />
                        <input
                            type="search"
                            value={searchValue}
                            placeholder={t('CONTACTS_LAYOUT.FRIENDS.SEARCH_PLACEHOLDER')}
                            className="flex-1 min-w-0 !m-0 !p-0 !h-auto !border-0 !bg-transparent !shadow-none text-sm text-n-slate-12 placeholder:text-n-slate-10 focus:!ring-0"
                            onChange={event => setSearchValue(event.target.value)}
                        />
                    </label>

                    <h2 className="mt-6 mb-2 text-xs font-semibold text-n-slate-11">
                        {t('CONTACTS_LAYOUT.FRIENDS.SECTION', { label: sectionLabel, count: meta.count })}
                    </h2>

                    {isFetching && contacts.length === 0 ? (
                        <div className="flex justify-center py-10 text-n-slate-11">
                            <Loader />
                        </div>
                    ) : visibleContacts.length === 0 ? (
                        <p className="py-10 text-sm text-center text-n-slate-11">{emptyMessage}</p>
                    ) : (
                        <ul className={`m-0 p-0 list-none pb-6 ${isFetching ? 'opacity-60' : ''}`}>
                            {visibleContacts.map(contact => (
                                <FriendRow key={contact.id} contact={contact} onRemoved={reload} />
                            ))}
                        </ul>
                    )}
                </main>

                {meta.count > PAGE_SIZE ? (
                    <footer className="sticky bottom-0 z-0">
                        <PaginationFooter
                            currentPageInfo="CONTACTS_LAYOUT.PAGINATION_FOOTER.SHOWING"
                            currentPage={meta.currentPage}
                            totalItems={meta.count}
                            itemsPerPage={PAGE_SIZE}
                            onPageChange={page => void load(activeTab, searchValue.trim(), page)}
                        />
                    </footer>
                ) : null}
            </section>
            <NewYonaChatDialog ref={addFriendDialogRef} />
        </Dashboard>
    );
}
