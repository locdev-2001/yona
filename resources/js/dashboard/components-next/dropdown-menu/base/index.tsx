import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { useDropdownPosition } from 'dashboard/composables/useDropdownPosition';

// Port từ dashboard/components-next/dropdown-menu/base/* (Container/Body/Section/Item/Separator)

interface DropdownContextValue {
    isOpen: boolean;
    toggle: () => void;
    closeMenu: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

// provideDropdownTeleport của gốc: mọi dropdown bên dưới render menu ra <body>,
// dành cho cây nằm trong vùng cuộn/cắt (side panel) sẽ che mất menu.
const DropdownTeleportContext = createContext(false);

export function DropdownTeleportProvider({ children }: { children: ReactNode }) {
    return <DropdownTeleportContext.Provider value>{children}</DropdownTeleportContext.Provider>;
}

// Port từ base/DropdownFloating.vue — menu fixed cạnh trigger, teleport ra body.
function DropdownFloating({ getTrigger, children }: { getTrigger: () => Element | null; children: ReactNode }) {
    const menuRef = useRef<HTMLDivElement>(null);
    const fixedPosition = useDropdownPosition(getTrigger, menuRef, true, { align: 'start' });

    return createPortal(
        <div data-dropdown-menu className={`overflow-y-auto ${fixedPosition.className}`} style={fixedPosition.style}>
            <div ref={menuRef} className="[&>*]:!static">
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function useDropdownContext(): DropdownContextValue {
    const context = useContext(DropdownContext);
    if (!context) throw new Error('Component is missing a parent <DropdownContainer /> component.');
    return context;
}

interface DropdownContainerProps {
    className?: string;
    onClose?: () => void;
    children: (context: { isOpen: boolean; toggle: () => void }) => ReactNode;
    menu: ReactNode;
}

export function DropdownContainer({ className = '', onClose, children, menu }: DropdownContainerProps) {
    const [isOpen, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const teleport = useContext(DropdownTeleportContext);
    // Getter thay vì memo: trigger đổi phần tử theo state (multi select đổi
    // placeholder thành nút chips khi đã chọn).
    const getTrigger = useCallback(() => containerRef.current?.firstElementChild ?? null, []);

    const toggle = () => setOpen(open => !open);
    const closeMenu = () => {
        setOpen(open => {
            if (open) onClose?.();
            return false;
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        // Menu teleport nằm ngoài container nên click trong menu đọc như click ngoài.
        const onClickOutside = (event: globalThis.MouseEvent) => {
            const target = event.target as Element;
            if (target.closest?.('[data-dropdown-menu]')) return;
            if (containerRef.current && !containerRef.current.contains(target)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <DropdownContext.Provider value={{ isOpen, toggle, closeMenu }}>
            <div ref={containerRef} className={`relative space-y-2 ${className}`}>
                {children({ isOpen, toggle })}
                {isOpen ? teleport ? <DropdownFloating getTrigger={getTrigger}>{menu}</DropdownFloating> : <div className="absolute">{menu}</div> : null}
            </div>
        </DropdownContext.Provider>
    );
}

// `strong`: dropdown lồng trong dropdown khác — viền đậm + lớp blur phụ
// (hack cho giới hạn stacked backdrop-blur của Chrome, như DropdownBody.vue).
export function DropdownBody({
    className = '',
    strong = false,
    children,
}: {
    className?: string;
    strong?: boolean;
    children: ReactNode;
}) {
    const borderClass = strong ? 'border-n-strong' : 'border-n-weak';
    const beforeClass = strong
        ? "before:content-['\u00A0'] before:absolute before:bottom-0 before:left-0 before:w-full before:h-full before:rounded-xl before:backdrop-contrast-70 before:backdrop-blur-sm before:z-0 [&>*]:relative"
        : '';

    return (
        <div className={`absolute ${className}`}>
            <ul
                className={`text-sm bg-n-alpha-3 backdrop-blur-[100px] border rounded-xl shadow-sm py-2 n-dropdown-body gap-2 grid list-none px-2 reset-base relative ${borderClass} ${beforeClass}`}
            >
                {children}
            </ul>
        </div>
    );
}

export function DropdownSection({
    title = '',
    className = '',
    height = 'max-h-96',
    children,
}: {
    title?: string;
    className?: string;
    height?: string;
    children: ReactNode;
}) {
    return (
        <div className={`-mx-2 n-dropdown-section ${className}`}>
            {title ? (
                <div className="px-4 mb-3 mt-1 leading-4 font-medium tracking-[0.2px] text-n-slate-10 text-xs">
                    {title}
                </div>
            ) : null}
            <ul className={`gap-2 grid reset-base list-none px-2 overflow-y-auto ${height}`}>{children}</ul>
        </div>
    );
}

export function DropdownSeparator() {
    return <div className="h-0 border-b border-n-strong -mx-2" />;
}

interface DropdownItemProps {
    label?: string;
    icon?: string | ReactNode;
    link?: string;
    nativeLink?: boolean;
    target?: string;
    onClick?: (event: MouseEvent) => void;
    preserveOpen?: boolean;
    disabled?: boolean;
    className?: string;
    children?: ReactNode;
}

export function DropdownItem({
    label = '',
    icon = '',
    link = '',
    nativeLink = false,
    target,
    onClick,
    preserveOpen = false,
    disabled = false,
    className = '',
    children,
}: DropdownItemProps) {
    const { closeMenu } = useDropdownContext();

    const triggerClick = (event: MouseEvent) => {
        onClick?.(event);
        if (!preserveOpen) closeMenu();
    };

    const sharedClasses = `flex text-left rtl:text-right items-center p-2 reset-base text-sm text-n-slate-12 w-full border-0 ${
        !children ? 'hover:bg-n-alpha-2 rounded-lg w-full gap-3' : ''
    } ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`;

    const content = children ?? (
        <>
            {icon ? <Icon icon={icon} className="size-4 text-n-slate-11" /> : null}
            {label}
        </>
    );

    return (
        <li className="n-dropdown-item">
            {link ? (
                nativeLink ? (
                    <a href={link} target={target} className={sharedClasses} onClick={triggerClick}>
                        {content}
                    </a>
                ) : (
                    <Link href={link} className={sharedClasses} onClick={triggerClick}>
                        {content}
                    </Link>
                )
            ) : onClick ? (
                <button type="button" className={sharedClasses} onClick={triggerClick}>
                    {content}
                </button>
            ) : (
                <div className={sharedClasses}>{content}</div>
            )}
        </li>
    );
}
