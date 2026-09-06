import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Khung chung của 3 nút bulk (agent / team / update): nút toggle + DropdownMenu +
// đóng khi bấm ra ngoài (v-on-click-outside gốc). Transition của Vue bỏ như các
// dropdown đã port ở B5 — trạng thái tĩnh khớp pixel.
interface BulkActionDropdownProps {
    icon: string;
    // Nhánh `type="contact"` của bản gốc: nút có nhãn, cỡ sm và class riêng.
    label?: string;
    size?: 'xs' | 'sm';
    buttonClassName?: string;
    // Nút của nhánh contact có trạng thái loading riêng; nhánh conversation chỉ
    // truyền isLoading cho menu (đúng bản gốc).
    buttonIsLoading?: boolean;
    disabled?: boolean;
    tooltip: string;
    isOpen: boolean;
    menuItems: DropdownMenuItem[];
    menuClassName: string;
    isLoading?: boolean;
    showSearch?: boolean;
    searchPlaceholder?: string;
    footer?: ReactNode;
    renderThumbnail?: (item: DropdownMenuItem) => ReactNode;
    renderTrailingIcon?: (item: DropdownMenuItem) => ReactNode;
    onToggle: () => void;
    onDismiss: () => void;
    onAction: (item: DropdownMenuItem) => void;
}

export default function BulkActionDropdown({
    icon,
    label = '',
    size = 'xs',
    buttonClassName = '',
    buttonIsLoading = false,
    disabled = false,
    tooltip,
    isOpen,
    menuItems,
    menuClassName,
    isLoading = false,
    showSearch = false,
    searchPlaceholder = '',
    footer,
    renderThumbnail,
    renderTrailingIcon,
    onToggle,
    onDismiss,
    onAction,
}: BulkActionDropdownProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) onDismiss();
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [isOpen, onDismiss]);

    return (
        <div ref={containerRef} className="relative">
            <Button
                title={tooltip}
                label={label}
                icon={icon}
                slate
                size={size}
                ghost
                isLoading={buttonIsLoading}
                disabled={disabled || buttonIsLoading}
                className={`${isOpen ? 'bg-n-alpha-2' : ''} ${buttonClassName}`.trim()}
                onClick={onToggle}
            />
            {isOpen ? (
                <DropdownMenu
                    menuItems={menuItems}
                    isLoading={isLoading}
                    showSearch={showSearch}
                    searchPlaceholder={searchPlaceholder}
                    className={menuClassName}
                    footer={footer}
                    renderThumbnail={renderThumbnail}
                    renderTrailingIcon={renderTrailingIcon}
                    onAction={onAction}
                />
            ) : null}
        </div>
    );
}
