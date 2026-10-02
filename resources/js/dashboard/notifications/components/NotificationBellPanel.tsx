import { Link, router, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import { accountScopedUrl, conversationUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useNotifications } from '../NotificationsContext';
import type { NotificationRecord } from '../types';
import { useNotificationsUnreadCount } from '../useUnreadCount';
import InboxCard from './InboxCard';
import type { BellTab } from './NotificationBell';

const BELL_TABS: BellTab[] = ['unread', 'all'];

// Danh sách rút gọn trong chuông: chỉ trang đầu (15 thông báo mới nhất), không
// cuộn nạp thêm; muốn xem hết thì sang trang thông báo đầy đủ.
interface NotificationBellPanelProps {
    activeTab: BellTab;
    onTabChange: (tab: BellTab) => void;
    onNavigate: () => void;
}

export default function NotificationBellPanel({ activeTab, onTabChange, onNavigate }: NotificationBellPanelProps) {
    const { accountId, notifications, isFetching, openNotification, markAsRead, markAsUnread, removeNotification, markAllRead } =
        useNotifications();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const unreadCount = useNotificationsUnreadCount();

    const showEmptyState = !isFetching && notifications.length === 0;

    // Mở ở màn Hội thoại chính, không mở trong trang thông báo.
    const openConversation = (notification: NotificationRecord) => {
        const displayId = notification.primary_actor?.id;
        if (!displayId) return;

        void openNotification(notification);
        router.visit(conversationUrl({ accountId, id: displayId }));
        onNavigate();
    };

    return (
        <div data-test-id="notification-bell-panel" className="flex flex-col w-full md:w-[360px] max-h-[min(480px,70vh)]">
            <div className="flex items-center justify-between flex-shrink-0 gap-2 px-4 py-3 border-b border-n-weak">
                <h3 className="text-sm font-medium text-n-slate-12">{t('SIDEBAR.NOTIFICATIONS')}</h3>
                <Button
                    type="button"
                    variant="link"
                    color="blue"
                    size="xs"
                    label={t('INBOX.MENU_ITEM.MARK_ALL_READ')}
                    disabled={unreadCount === 0}
                    onClick={() => void markAllRead().catch(() => undefined)}
                />
            </div>
            <div className="flex-shrink-0 px-4 pt-2">
                <TabBar
                    tabs={[
                        { label: t('INBOX.BELL.TAB_UNREAD'), value: 'unread' },
                        { label: t('INBOX.BELL.TAB_ALL'), value: 'all' },
                    ]}
                    initialActiveTab={BELL_TABS.indexOf(activeTab)}
                    onTabChanged={tab => onTabChange(tab.value as BellTab)}
                />
            </div>
            <div className="flex flex-col flex-1 min-h-0 gap-0.5 px-2 py-1 overflow-y-auto divide-y divide-n-weak [&>*:hover]:!border-y-transparent [&>*:hover+*]:!border-t-transparent">
                {notifications.map(notification => (
                    <InboxCard
                        key={notification.id}
                        inboxItem={notification}
                        stateInbox={inboxes.find(inbox => inbox.id === notification.primary_actor?.inbox_id)}
                        className="rounded-none hover:rounded-lg hover:bg-n-alpha-1"
                        onClick={() => openConversation(notification)}
                        onMarkAsRead={() => void markAsRead(notification).catch(() => undefined)}
                        onMarkAsUnread={() => void markAsUnread(notification).catch(() => undefined)}
                        onDelete={() => void removeNotification(notification).catch(() => undefined)}
                        onContextMenuOpen={() => undefined}
                        onContextMenuClose={() => undefined}
                    />
                ))}
                {isFetching ? (
                    <div className="flex justify-center my-4">
                        <Spinner className="text-n-brand" />
                    </div>
                ) : null}
                {showEmptyState ? (
                    <p className="p-4 text-sm text-center text-n-slate-10">{t(activeTab === 'unread' ? 'INBOX.BELL.EMPTY_UNREAD' : 'INBOX.BELL.EMPTY')}</p>
                ) : null}
            </div>
            <div className="flex flex-shrink-0 justify-center px-4 py-2.5 border-t border-n-weak">
                <Link
                    href={accountScopedUrl(accountId, 'inbox-view')}
                    className="text-sm font-medium text-n-blue-11 hover:underline underline-offset-2"
                    onClick={onNavigate}
                >
                    {t('INBOX.BELL.VIEW_ALL')}
                </Link>
            </div>
        </div>
    );
}
