import Popover from 'dashboard/components-next/popover/Popover';
import { formatUnreadCount } from 'dashboard/helper/notificationTray';
import { t } from '../../../i18n';
import { INBOX_DISPLAY_BY, INBOX_SORT_BY } from '../helpers';
import { NotificationsProvider } from '../NotificationsContext';
import type { FixedNotificationFilters } from '../NotificationsContext';
import { useNotificationsUnreadCount } from '../useUnreadCount';
import NotificationBellPanel from './NotificationBellPanel';

// Gồm cả thông báo đã đọc để danh sách không trống trơn ngay sau khi đọc hết;
// không gồm thông báo đang tạm ẩn.
const BELL_FILTERS: FixedNotificationFilters = {
    status: '',
    type: INBOX_DISPLAY_BY.READ,
    sortOrder: INBOX_SORT_BY.NEWEST,
};

const TRIGGER_BASE_CLASS =
    'relative flex items-center justify-center rounded-lg outline outline-1 outline-n-weak bg-n-button-color text-n-slate-11 transition-all duration-100 ease-out hover:bg-n-alpha-2 dark:hover:bg-n-slate-9/30';

interface NotificationBellProps {
    isCollapsed: boolean;
    // Mở một thông báo hay sang trang đầy đủ thì ngăn kéo sidebar trên điện thoại cũng đóng.
    onNavigate?: () => void;
}

export default function NotificationBell({ isCollapsed, onNavigate }: NotificationBellProps) {
    const count = useNotificationsUnreadCount();
    const label = t('INBOX.BELL.OPEN_LABEL', { count });

    return (
        <Popover
            align="start"
            trigger={() => (
                <button
                    type="button"
                    data-test-id="notification-bell"
                    aria-label={label}
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
                <NotificationsProvider fixedFilters={BELL_FILTERS}>
                    <NotificationBellPanel
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
