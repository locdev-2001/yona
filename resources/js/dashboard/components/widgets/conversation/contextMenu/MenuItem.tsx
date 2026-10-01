
// Port từ widgets/conversation/contextMenu/menuItem.vue (variant="icon") —
// class scoped `.menu` / `.menu-label` viết thẳng ra utility.
interface MenuItemProps {
    label: string;
    icon: string;
    className?: string;
    onClick: () => void;
}

export default function MenuItem({ label, icon, className = 'w-[12.5rem]', onClick }: MenuItemProps) {
    return (
        <div
            className={`menu group text-n-slate-12 min-h-7 min-w-0 flex items-center flex-nowrap p-1 rounded-md overflow-hidden cursor-pointer hover:bg-n-brand hover:text-white ${className}`}
            role="button"
            onClick={event => {
                event.stopPropagation();
                onClick();
            }}
        >
            <span className={`${icon} size-3.5 flex-shrink-0`} aria-hidden="true" />
            <p className="menu-label my-0 mx-2 text-xs flex-shrink-0 truncate min-w-0 flex-1">{label}</p>
        </div>
    );
}
