import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { useDashboardApps } from 'dashboard/composables/useDashboardApps';
import Tabs from 'dashboard/components/ui/Tabs';
import DashboardAppFrame from 'dashboard/components/widgets/DashboardApp/Frame';
import ConversationHeader from './ConversationHeader';
import EmptyState from './EmptyState';
import MessagesView from './MessagesView';
import SenderIdentityProvider from './SenderIdentityProvider';

// Port từ widgets/conversation/ConversationBox.vue. Khi account có dashboard app,
// header hội thoại mọc thêm hàng tab: tab đầu là Messages, mỗi app một tab.

export default function ConversationBox({
    isInboxView = false,
    className = '',
}: {
    isInboxView?: boolean;
    className?: string;
}) {
    const { accountId, selectedConversation, isOnExpandedLayout } = useConversation();
    const currentChat = selectedConversation;
    const { apps: dashboardApps } = useDashboardApps(accountId);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => setActiveIndex(0), [currentChat?.id]);

    const visibleDashboardApps = isProductFeatureVisible('integrations') ? dashboardApps : [];
    const showTabs = visibleDashboardApps.length > 0 && Boolean(currentChat);
    const activeTabIndex = showTabs && activeIndex <= visibleDashboardApps.length ? activeIndex : 0;
    const tabItems = [
        { key: 'messages', name: t('CONVERSATION.DASHBOARD_APP_TAB_MESSAGES') },
        ...visibleDashboardApps.map(dashboardApp => ({
            key: `dashboard-${dashboardApp.id}`,
            name: dashboardApp.title,
        })),
    ];

    return (
        <div
            className={`conversation-details-wrap flex flex-col min-w-0 w-full bg-n-surface-canvas relative ${className}`}
        >
            {currentChat && (
                <ConversationHeader
                    className={showTabs ? '' : '!pt-2'}
                    showBackButton={isOnExpandedLayout && !isInboxView}
                />
            )}
            {showTabs ? (
                <Tabs items={tabItems} index={activeTabIndex} isCompact className="h-10" onChange={setActiveIndex} />
            ) : null}
            <div className="flex h-full min-h-0 m-0" style={{ display: activeTabIndex ? 'none' : undefined }}>
                {currentChat ? (
                    <SenderIdentityProvider>
                        <MessagesView />
                    </SenderIdentityProvider>
                ) : isInboxView ? null : (
                    <EmptyState />
                )}
            </div>
            {currentChat
                ? visibleDashboardApps.map((dashboardApp, index) => (
                      <DashboardAppFrame
                          key={`${currentChat.id}-${dashboardApp.id}`}
                          accountId={accountId}
                          dashboardApp={dashboardApp}
                          conversation={currentChat}
                          isVisible={activeTabIndex - 1 === index}
                          position={index}
                      />
                  ))
                : null}
        </div>
    );
}
