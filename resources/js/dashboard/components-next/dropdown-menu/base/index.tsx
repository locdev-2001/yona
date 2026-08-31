import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components-next/dropdown-menu/base/* (Container/Body/Section/Item/Separator)

interface DropdownContextValue {
    isOpen: boolean;
    toggle: () => void;
    closeMenu: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

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

    const toggle = () => setOpen(open => !open);
    const closeMenu = () => {
        setOpen(open => {
            if (open) onClose?.();
            return false;
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        const onClickOutside = (event: globalThis.MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
                {isOpen ? <div className="absolute">{menu}</div> : null}
            </div>
        </DropdownContext.Provider>
    );
}

export function DropdownBody({ className = '', children }: { className?: string; children: ReactNode }) {
    return (
        <div className={`absolute ${className}`}>
            <ul className="text-sm bg-n-alpha-3 backdrop-blur-[100px] border border-n-weak rounded-xl shadow-sm py-2 n-dropdown-body gap-2 grid list-none px-2 reset-base relative">
                {children}
            </ul>
        </div>
    );
}

export function DropdownSection({
    title = '',
    className = '',
    children,
}: {
    title?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`-mx-2 n-dropdown-section ${className}`}>
            {title ? (
                <div className="px-4 mb-3 mt-1 leading-4 font-medium tracking-[0.2px] text-n-slate-10 text-xs">
                    {title}
                </div>
            ) : null}
            <ul className="gap-2 grid reset-base list-none px-2 overflow-y-auto max-h-96">{children}</ul>
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
    } ${className}`;

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
