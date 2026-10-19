import { useMemo } from 'react';
import { router } from '@inertiajs/react';

import Loader from 'shared/components/loader/Loader';
import { useConversation } from 'dashboard/conversation/ConversationContext';
import ConversationBox from 'dashboard/conversation/conversationbox/ConversationBox';
import ConversationSidebar from 'dashboard/conversation/conversationbox/ConversationSidebar';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../i18n';
import InboxEmptyState from './InboxEmptyState';
import InboxItemHeader from './components/InboxItemHeader';
import { useNotifications } from './NotificationsContext';
import { notificationTargetUrl } from './helpers';
import type { NotificationRecord } from './types';

// Port từ routes/dashboard/inbox/InboxView.vue — cột phải của trung tâm thông báo.
export default function InboxView({ conversationId }: { conversationId: number }) {
    const { accountId, notifications, meta, isFetching, openNotification } = useNotifications();
    const { selectedConversation, messagesLoading, uiSettings } = useConversation();

    const activeNotificationIndex = useMemo(
        () => notifications.findIndex(notification => notification.primary_actor?.id === conversationId),
        [notifications, conversationId],
    );
    const activeNotification = activeNotificationIndex === -1 ? null : notifications[activeNotificationIndex];

    const showEmptyState = !notifications.length && isFetching;
    const isContactPanelOpen = Boolean(selectedConversation && uiSettings.is_contact_sidebar_open);

    const goToInboxList = () => router.visit(accountScopedUrl(accountId, 'inbox-view'));

    const openNotificationAt = (index: number) => {
        const target = notifications[index];
        if (!target?.primary_actor) return;

        const friendsUrl = target.primary_actor_type === 'Friendship' ? notificationTargetUrl(accountId, target) : null;
        void openNotification(target).then(() =>
            router.visit(friendsUrl ?? accountScopedUrl(accountId, `inbox-view/conversation/${target.primary_actor!.id}`)),
        );
    };

    const navigate = (direction: 'prev' | 'next') => {
        const isValidPrev = direction === 'prev' && activeNotificationIndex > 0;
        const isValidNext = direction === 'next' && activeNotificationIndex < meta.count - 1;
        if (!isValidPrev && !isValidNext) return;

        openNotificationAt(direction === 'prev' ? activeNotificationIndex - 1 : activeNotificationIndex + 1);
    };

    if (showEmptyState) {
        return (
            <div className="h-full w-full min-w-0 flex-1">
                <div className="flex w-full h-full">
                    <InboxEmptyState emptyStateMessage={t('INBOX.LIST.NO_MESSAGES_AVAILABLE')} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full min-w-0 flex-1">
            <div className="flex flex-col w-full h-full">
                <InboxItemHeader
                    totalLength={meta.count}
                    currentIndex={activeNotificationIndex}
                    activeNotification={activeNotification as NotificationRecord | null}
                    onPrev={() => navigate('prev')}
                    onNext={() => navigate('next')}
                    onDeleted={goToInboxList}
                />
                {messagesLoading && !selectedConversation ? (
                    <div className="flex items-center flex-1 my-4 justify-center bg-n-solid-1">
                        <Loader className="text-n-brand" />
                    </div>
                ) : (
                    <div className="flex h-[calc(100%-48px)] min-w-0">
                        <ConversationBox isInboxView className="flex-1" />
                        {isContactPanelOpen ? <ConversationSidebar /> : null}
                    </div>
                )}
            </div>
        </div>
    );
}
