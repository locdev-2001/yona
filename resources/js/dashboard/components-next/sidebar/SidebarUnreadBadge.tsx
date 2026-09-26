// Port từ sidebar/SidebarUnreadBadge.vue
export default function SidebarUnreadBadge({ count = 0 }: { count?: number | string }) {
    const normalizedCount = Number(count);
    if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return null;

    return (
        <span
            data-test-id="sidebar-unread-badge"
            className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-n-slate-4 px-1 text-xxs font-medium leading-3 text-n-slate-12 flex-shrink-0"
        >
            {normalizedCount > 99 ? '99+' : String(normalizedCount)}
        </span>
    );
}
