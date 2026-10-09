import { formatUnreadCount } from 'dashboard/helper/notificationTray';

// Port từ sidebar/SidebarUnreadBadge.vue
export default function SidebarUnreadBadge({ count = 0 }: { count?: number | string }) {
    const normalizedCount = Number(count);
    if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return null;

    return (
        <span
            data-test-id="sidebar-unread-badge"
            className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-n-ruby-9 px-1 text-xxs font-medium leading-4 text-white flex-shrink-0"
        >
            {formatUnreadCount(normalizedCount)}
        </span>
    );
}
