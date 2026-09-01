import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import Spinner from 'dashboard/components-next/spinner/Spinner';

// Port từ dashboard/components-next/dropdown-menu/DropdownMenu.vue — nhánh
// menuItems phẳng + showSearch lọc theo label (menuSections vào khi màn nào cần).
export interface DropdownMenuItem {
    label: string;
    value: number | string;
    action: string;
    icon?: string;
    disabled?: boolean;
    isSelected?: boolean;
    thumbnail?: { name: string; src: string };
    [key: string]: unknown;
}

interface DropdownMenuProps {
    menuItems: DropdownMenuItem[];
    thumbnailSize?: number;
    isLoading?: boolean;
    showSearch?: boolean;
    searchPlaceholder?: string;
    className?: string;
    onAction: (item: DropdownMenuItem) => void;
}

export default function DropdownMenu({
    menuItems,
    thumbnailSize = 20,
    isLoading = false,
    showSearch = false,
    searchPlaceholder = '',
    className = '',
    onAction,
}: DropdownMenuProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showSearch) searchInputRef.current?.focus();
    }, [showSearch]);

    const visibleItems = searchQuery
        ? menuItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : menuItems;

    return (
        <div
            className={`bg-n-alpha-3 backdrop-blur-[100px] border-0 outline outline-1 outline-n-container absolute rounded-xl z-50 flex flex-col min-w-[136px] shadow-lg pt-2 overflow-hidden ${className}`}
        >
            {showSearch ? (
                <div className="relative shrink-0 px-2 mb-2">
                    <span className="absolute i-lucide-search size-3.5 top-2 ltr:left-5 rtl:right-5" />
                    <input
                        ref={searchInputRef}
                        value={searchQuery}
                        type="search"
                        placeholder={searchPlaceholder || t('DROPDOWN_MENU.SEARCH_PLACEHOLDER')}
                        className="reset-base w-full h-8 py-2 ltr:pl-10 ltr:pr-2 rtl:pl-2 rtl:pr-10 text-sm focus:outline-none border-none rounded-lg bg-n-alpha-black2 dark:bg-n-solid-1 text-n-slate-12"
                        onChange={event => setSearchQuery(event.target.value)}
                    />
                </div>
            ) : null}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 px-2 pb-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-2">
                        <Spinner size={24} />
                    </div>
                ) : null}
                {visibleItems.map((item, index) => (
                    <button
                        key={`${item.value}-${index}`}
                        type="button"
                        className={[
                            'inline-flex items-center justify-start w-full h-8 min-w-0 gap-2 px-2 py-1.5 transition-all duration-200 ease-in-out border-0 rounded-lg z-60 hover:bg-n-alpha-1 dark:hover:bg-n-alpha-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50',
                            item.isSelected ? 'bg-n-alpha-1 dark:bg-n-solid-active' : '',
                            item.action === 'delete' ? 'text-n-ruby-11' : 'text-n-slate-12',
                        ].join(' ')}
                        disabled={item.disabled}
                        onClick={() => onAction(item)}
                    >
                        {item.thumbnail ? (
                            <Avatar
                                name={item.thumbnail.name}
                                src={item.thumbnail.src}
                                size={thumbnailSize}
                                roundedFull
                            />
                        ) : null}
                        {item.icon ? <Icon icon={item.icon} className="flex-shrink-0 size-3.5" /> : null}
                        {item.label ? (
                            <span className="min-w-0 text-sm font-420 truncate">{item.label}</span>
                        ) : null}
                    </button>
                ))}
                {!isLoading && !visibleItems.length ? (
                    <div className="text-sm text-n-slate-11 px-2 py-1.5">{t('DROPDOWN_MENU.EMPTY_STATE')}</div>
                ) : null}
            </div>
        </div>
    );
}
