import type { ComponentProps } from 'react';

import BottomSheet from 'dashboard/components-next/BottomSheet';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Một menu của mũ khung chat (người phụ trách, trạng thái) với hai vỏ: popover neo
// dưới nút trên máy tính, bottom sheet mục cao 48px trên điện thoại. Nội dung và
// hành động là một; caller chỉ nói đang ở vỏ nào.
type DropdownMenuProps = ComponentProps<typeof DropdownMenu>;

interface HeaderActionMenuProps extends Omit<DropdownMenuProps, 'className'> {
    isOpen: boolean;
    asSheet: boolean;
    title: string;
    popoverClassName: string;
    onClose: () => void;
}

const SHEET_MENU_CLASS = '!static !min-w-0 w-full !rounded-none !bg-transparent !shadow-none !pt-0';
const SHEET_ITEM_CLASS = '!h-12';

export default function HeaderActionMenu({
    isOpen,
    asSheet,
    title,
    popoverClassName,
    itemClassName = '',
    onClose,
    ...menuProps
}: HeaderActionMenuProps) {
    if (asSheet) {
        return (
            <BottomSheet isOpen={isOpen} title={title} onClose={onClose}>
                <DropdownMenu
                    {...menuProps}
                    autoFocusSearch={false}
                    className={SHEET_MENU_CLASS}
                    itemClassName={SHEET_ITEM_CLASS}
                />
            </BottomSheet>
        );
    }

    if (!isOpen) return null;

    return <DropdownMenu {...menuProps} className={popoverClassName} itemClassName={itemClassName} />;
}
