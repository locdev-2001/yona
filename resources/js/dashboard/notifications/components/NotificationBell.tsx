import { useState } from 'react';
import type { ReactNode } from 'react';

import Popover from 'dashboard/components-next/popover/Popover';
import { formatUnreadCount } from 'dashboard/helper/notificationTray';
import { t } from '../../../i18n';
import { INBOX_DISPLAY_BY, INBOX_SORT_BY } from '../helpers';
import { NotificationsProvider } from '../NotificationsContext';
import type { FixedNotificationFilters } from '../NotificationsContext';
import { useNotificationsUnreadCount } from '../useUnreadCount';
import NotificationBellPanel from './NotificationBellPanel';

export type BellTab = 'unread' | 'all';

// Mặc định chỉ thông báo chưa đọc; tab "Tất cả" gồm cả đã đọc. Không gồm thông báo đang tạm ẩn.
const BELL_FILTERS: Record<BellTab, FixedNotificationFilters> = {
    unread: { status: '', type: '', sortOrder: INBOX_SORT_BY.NEWEST },
    all: { status: '', type: INBOX_DISPLAY_BY.READ, sortOrder: INBOX_SORT_BY.NEWEST },
};

const TRIGGER_BASE_CLASS =
    'relative flex flex-shrink-0 items-center justify-center rounded-lg bg-n-surface-field text-n-slate-11 transition-all duration-100 ease-out hover:bg-n-surface-field-hover';

export interface NotificationBellTriggerContext {
    isOpen: boolean;
    count: number;
    label: string;
}

interface NotificationBellProps {
    isCollapsed?: boolean;
    // Nút mở khác nút chuông của sidebar (ô Thông báo trên thanh tab điện thoại); bảng thông báo giữ nguyên.
    renderTrigger?: (context: NotificationBellTriggerContext) => ReactNode;
    triggerClassName?: string;
    // Mở một thông báo hay sang trang đầy đủ thì ngăn kéo sidebar trên điện thoại cũng đóng.
    onNavigate?: () => void;
}

export default function NotificationBell({ isCollapsed = false, renderTrigger, triggerClassName, onNavigate }: NotificationBellProps) {
    const count = useNotificationsUnreadCount();
    const [bellTab, setBellTab] = useState<BellTab>('unread');
    // Giữ bộ lọc kênh khi đổi tab Chưa đọc / Tất cả và khi đóng mở lại chuông.
    const [selectedInboxIds, setSelectedInboxIds] = useState<number[]>([]);
    const label = t('INBOX.BELL.OPEN_LABEL', { count });

    return (
        <Popover
            align="start"
            triggerClassName={triggerClassName}
            trigger={({ isOpen }) => renderTrigger ? renderTrigger({ isOpen, count, label }) : (
                <button
                    type="button"
                    data-test-id="notification-bell"
                    aria-label={label}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    title={label}
                    className={`${TRIGGER_BASE_CLASS} ${isCollapsed ? 'size-8' : 'h-7 w-8'}`}
                >
                    <span className="i-lucide-bell size-4" />
                    {count > 0 ? (
                        <span
                            data-test-id="notification-bell-count"
                            className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 min-w-4 h-4 px-1 rounded-full bg-n-ruby-9 text-white text-xxs leading-4 font-medium text-center"
                        >
                            {formatUnreadCount(count)}
                        </span>
                    ) : null}
                </button>
            )}
            content={({ hide }) => (
                <NotificationsProvider key={bellTab} fixedFilters={BELL_FILTERS[bellTab]} inboxIds={selectedInboxIds}>
                    <NotificationBellPanel
                        activeTab={bellTab}
                        onTabChange={setBellTab}
                        selectedInboxIds={selectedInboxIds}
                        onSelectedInboxIdsChange={setSelectedInboxIds}
                        onNavigate={() => {
                            hide();
                            onNavigate?.();
                        }}
                    />
                </NotificationsProvider>
            )}
        />
    );
}
