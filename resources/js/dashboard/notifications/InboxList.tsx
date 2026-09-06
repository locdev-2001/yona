import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';

import CmdBarConversationSnooze from 'dashboard/commands/CmdBarConversationSnooze';
import { useInboxHotKeys } from 'dashboard/commands/useInboxHotKeys';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import { ConversationProvider } from 'dashboard/conversation/ConversationContext';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../i18n';
import Dashboard from '../Dashboard';
import type { DashboardPageProps } from '../types';
import InboxCard from './components/InboxCard';
import InboxEmptyState from './InboxEmptyState';
import InboxListHeader from './components/InboxListHeader';
import InboxView from './InboxView';
import { NotificationsProvider, useNotifications } from './NotificationsContext';
import type { NotificationRecord } from './types';

// Port từ routes/dashboard/inbox/InboxList.vue — cột trái (danh sách thông báo)
// bọc lấy cột chi tiết như `<router-view />` của bản gốc.

function InboxLayout({ conversationId }: { conversationId: number }) {
    const { accountId, notifications, isFetching, isAllLoaded, loadMore, openNotification, markAsRead, markAsUnread, removeNotification } =
        useNotifications();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    const [isContextMenuOpen, setContextMenuOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef(loadMore);
    loadMoreRef.current = loadMore;

    useInboxHotKeys();

    const showEndOfList = isAllLoaded && !isFetching;
    const showEmptyState = !isFetching && notifications.length === 0;
    const showSentinel = !showEndOfList && !isFetching;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!showSentinel || !sentinel) return undefined;

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) loadMoreRef.current();
            },
            { root: listRef.current, rootMargin: '100px 0px 100px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [showSentinel]);

    // scrollActiveIntoView của bản gốc.
    useEffect(() => {
        listRef.current?.querySelector('.inbox-card.active')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [conversationId]);

    const redirectToInbox = () => {
        if (!conversationId) return;
        router.visit(accountScopedUrl(accountId, 'inbox-view'), { replace: true });
    };

    const openConversation = (notification: NotificationRecord) => {
        const targetId = notification.primary_actor?.id;
        if (!targetId || targetId === conversationId) return;

        void openNotification(notification).then(() =>
            router.visit(accountScopedUrl(accountId, `inbox-view/conversation/${targetId}`)),
        );
    };

    const runAndRedirect = (action: Promise<void>) => {
        redirectToInbox();
        void action.catch(() => undefined);
    };

    return (
        <section className="flex w-full h-full min-w-0 bg-n-surface-1">
            <div
                className={`flex-col h-full w-full lg:min-w-[340px] lg:max-w-[340px] ltr:border-r rtl:border-l border-n-weak ${
                    conversationId ? 'hidden xl:flex' : 'flex'
                }`}
            >
                <InboxListHeader isContextMenuOpen={isContextMenuOpen} onRedirect={redirectToInbox} />
                <div
                    ref={listRef}
                    className="flex flex-col gap-0.5 w-full h-[calc(100%-56px)] pb-4 overflow-x-hidden px-2 overflow-y-auto divide-y divide-n-weak [&>*:hover]:!border-y-transparent [&>*.active]:!border-y-transparent [&>*:hover+*]:!border-t-transparent [&>*.active+*]:!border-t-transparent"
                >
                    {notifications.map(notification => (
                        <InboxCard
                            key={notification.id}
                            inboxItem={notification}
                            stateInbox={inboxes.find(inbox => inbox.id === notification.primary_actor?.inbox_id)}
                            className={`inbox-card rounded-none hover:rounded-lg hover:bg-n-alpha-1 dark:hover:bg-n-alpha-3 ${
                                conversationId === notification.primary_actor?.id
                                    ? 'bg-n-alpha-1 dark:bg-n-alpha-3 !rounded-lg active'
                                    : ''
                            }`}
                            onClick={() => openConversation(notification)}
                            onMarkAsRead={() => void markAsRead(notification).catch(() => undefined)}
                            onMarkAsUnread={() => runAndRedirect(markAsUnread(notification))}
                            onDelete={() => runAndRedirect(removeNotification(notification))}
                            onContextMenuOpen={() => setContextMenuOpen(true)}
                            onContextMenuClose={() => setContextMenuOpen(false)}
                        />
                    ))}
                    {isFetching ? (
                        <div className="flex justify-center my-4">
                            <Spinner className="text-n-brand" />
                        </div>
                    ) : null}
                    {showEmptyState ? (
                        <p className="p-4 text-sm font-medium text-center text-n-slate-10">
                            {t('INBOX.LIST.NO_NOTIFICATIONS')}
                        </p>
                    ) : null}
                    {showSentinel ? <div ref={sentinelRef} className="h-px w-full" /> : null}
                </div>
            </div>
            {/* routes.js: `inbox_view` dựng InboxEmptyState, `inbox_view_conversation` mới dựng InboxView. */}
            {conversationId ? <InboxView conversationId={conversationId} /> : <InboxEmptyState />}
            <CmdBarConversationSnooze />
        </section>
    );
}

export default function InboxListPage({ conversationId = 0 }: { conversationId?: number }) {
    return (
        <Dashboard>
            <NotificationsProvider>
                <ConversationProvider conversationId={conversationId} withConversationList={false}>
                    <InboxLayout conversationId={conversationId} />
                </ConversationProvider>
            </NotificationsProvider>
        </Dashboard>
    );
}
