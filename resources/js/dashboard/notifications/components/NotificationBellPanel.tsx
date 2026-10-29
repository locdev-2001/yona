import { Link, router, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import { useChannelPreferences } from 'dashboard/components-next/sidebar/useChannelPreferences';
import FilterChip from 'dashboard/conversation/chatlist/FilterChip';
import InboxFilterChip from 'dashboard/conversation/chatlist/InboxFilterChip';
import Loader from 'shared/components/loader/Loader';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useNotifications } from '../NotificationsContext';
import { notificationTargetUrl } from '../helpers';
import type { NotificationRecord } from '../types';
import { useNotificationsUnreadCount, useNotificationsUnreadInboxCounts } from '../useUnreadCount';
import InboxCard from './InboxCard';
import type { BellTab } from './NotificationBell';

const BELL_TABS: BellTab[] = ['unread', 'all'];

function toggleInboxId(inboxIds: number[], inboxId: number): number[] {
    return inboxIds.includes(inboxId) ? inboxIds.filter(id => id !== inboxId) : [...inboxIds, inboxId];
}

// Danh sách rút gọn trong chuông: chỉ trang đầu (15 thông báo mới nhất), không
// cuộn nạp thêm; muốn xem hết thì sang trang thông báo đầy đủ.
interface NotificationBellPanelProps {
    activeTab: BellTab;
    onTabChange: (tab: BellTab) => void;
    // Bộ lọc kênh: rỗng = mọi kênh; "Đánh dấu đã đọc" và "Xoá" áp đúng bộ lọc này.
    selectedInboxIds: number[];
    onSelectedInboxIdsChange: (inboxIds: number[]) => void;
    onNavigate: () => void;
}

export default function NotificationBellPanel({
    activeTab,
    onTabChange,
    selectedInboxIds,
    onSelectedInboxIdsChange,
    onNavigate,
}: NotificationBellPanelProps) {
    const { accountId, notifications, isFetching, openNotification, markAsRead, markAsUnread, removeNotification, markAllRead, deleteAll } =
        useNotifications();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const { visibleInboxes } = useChannelPreferences(inboxes);
    const unreadCount = useNotificationsUnreadCount();
    const inboxUnreadCounts = useNotificationsUnreadInboxCounts();

    const isAllChannels = selectedInboxIds.length === 0;
    const scopedUnreadCount = isAllChannels
        ? unreadCount
        : selectedInboxIds.reduce((total, inboxId) => total + (inboxUnreadCounts[String(inboxId)] ?? 0), 0);
    // Tab Chưa đọc rỗng vẫn có thể còn thông báo đã đọc để xoá; chỉ tab Tất cả rỗng mới chắc là hết.
    const hasNothingToDelete = activeTab === 'all' && !isFetching && notifications.length === 0;

    const showEmptyState = !isFetching && notifications.length === 0;

    // Mở ở màn Hội thoại chính, không mở trong trang thông báo.
    const openConversation = (notification: NotificationRecord) => {
        const targetUrl = notificationTargetUrl(accountId, notification);
        if (!targetUrl) return;

        void openNotification(notification);
        router.visit(targetUrl);
        onNavigate();
    };

    return (
        <div data-test-id="notification-bell-panel" className="flex flex-col w-full md:w-[360px] max-h-[min(480px,70vh)]">
            <div className="flex items-center justify-between flex-shrink-0 gap-2 px-4 py-3">
                <h3 className="min-w-0 text-sm font-medium truncate text-n-slate-12">{t('SIDEBAR.NOTIFICATIONS')}</h3>
                <div className="flex items-center flex-shrink-0 gap-3">
                    <Button
                        type="button"
                        variant="link"
                        color="blue"
                        size="xs"
                        label={t('INBOX.BELL.MARK_READ')}
                        title={t(isAllChannels ? 'INBOX.BELL.MARK_READ_ALL_HINT' : 'INBOX.BELL.MARK_READ_CHANNELS_HINT')}
                        disabled={scopedUnreadCount === 0}
                        onClick={() => void markAllRead().catch(() => undefined)}
                    />
                    <Button
                        type="button"
                        variant="link"
                        color="ruby"
                        size="xs"
                        label={t('INBOX.BELL.DELETE')}
                        title={t(isAllChannels ? 'INBOX.BELL.DELETE_ALL_HINT' : 'INBOX.BELL.DELETE_CHANNELS_HINT')}
                        disabled={hasNothingToDelete}
                        onClick={() => void deleteAll().catch(() => undefined)}
                    />
                </div>
            </div>
            {visibleInboxes.length > 1 ? (
                <div
                    role="group"
                    aria-label={t('INBOX.BELL.CHANNEL_FILTER')}
                    className="flex flex-shrink-0 gap-1.5 min-w-0 px-4 pb-1 overflow-x-auto [&>*]:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <FilterChip isSelected={isAllChannels} aria-pressed={isAllChannels} onClick={() => onSelectedInboxIdsChange([])}>
                        {t('CHAT_LIST.FILTER_PANEL.ALL_CHANNELS')}
                    </FilterChip>
                    {visibleInboxes.map(inbox => (
                        <InboxFilterChip
                            key={inbox.id}
                            inbox={inbox}
                            isSelected={selectedInboxIds.includes(inbox.id)}
                            unreadCount={inboxUnreadCounts[String(inbox.id)] ?? 0}
                            onToggle={() => onSelectedInboxIdsChange(toggleInboxId(selectedInboxIds, inbox.id))}
                        />
                    ))}
                </div>
            ) : null}
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
            <div className="flex flex-col flex-1 min-h-0 gap-0.5 px-2 py-1 overflow-y-auto">
                {notifications.map(notification => (
                    <InboxCard
                        key={notification.id}
                        inboxItem={notification}
                        stateInbox={inboxes.find(inbox => inbox.id === notification.primary_actor?.inbox_id)}
                        className="rounded-lg hover:bg-n-surface-hover"
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
                        <Loader className="text-n-brand" />
                    </div>
                ) : null}
                {showEmptyState ? (
                    <p className="p-4 text-sm text-center text-n-slate-10">{t(activeTab === 'unread' ? 'INBOX.BELL.EMPTY_UNREAD' : 'INBOX.BELL.EMPTY')}</p>
                ) : null}
            </div>
            <div className="flex flex-shrink-0 justify-center px-4 py-2.5 bg-n-surface-canvas">
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
