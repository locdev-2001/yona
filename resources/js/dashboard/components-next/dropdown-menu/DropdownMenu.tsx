import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
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

export interface DropdownMenuSection {
    title?: string;
    items: DropdownMenuItem[];
    isLoading?: boolean;
    emptyState?: string;
}

interface DropdownMenuProps {
    menuItems?: DropdownMenuItem[];
    // Nhánh menuSections của bản gốc: nhóm có tiêu đề, loading và empty riêng.
    menuSections?: DropdownMenuSection[];
    // Bộ lọc do caller tự làm (danh sách đã fetch theo từ khoá) — không lọc lại tại chỗ.
    disableLocalFiltering?: boolean;
    isSearching?: boolean;
    onSearch?: (query: string) => void;
    thumbnailSize?: number;
    isLoading?: boolean;
    showSearch?: boolean;
    searchPlaceholder?: string;
    className?: string;
    // Slot `footer` của bản gốc (BulkAgentActions/BulkTeamActions dùng làm khối xác nhận).
    footer?: ReactNode;
    // Slot `thumbnail` / `trailing-icon` của bản gốc (BulkLabelActions: ô màu + dấu tích).
    renderThumbnail?: (item: DropdownMenuItem) => ReactNode;
    renderTrailingIcon?: (item: DropdownMenuItem) => ReactNode;
    onAction: (item: DropdownMenuItem) => void;
}

export default function DropdownMenu({
    menuItems = [],
    menuSections,
    disableLocalFiltering = false,
    isSearching = false,
    onSearch,
    thumbnailSize = 20,
    isLoading = false,
    showSearch = false,
    searchPlaceholder = '',
    className = '',
    footer,
    renderThumbnail,
    renderTrailingIcon,
    onAction,
}: DropdownMenuProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showSearch) searchInputRef.current?.focus();
    }, [showSearch]);

    const hasSections = Boolean(menuSections?.length);

    const matchesQuery = (item: DropdownMenuItem) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase());

    const visibleItems = searchQuery && !disableLocalFiltering ? menuItems.filter(matchesQuery) : menuItems;

    const visibleSections =
        disableLocalFiltering || !searchQuery
            ? (menuSections ?? [])
            : (menuSections ?? [])
                  .map(section => ({ ...section, items: section.items.filter(matchesQuery) }))
                  .filter(section => section.items.length > 0);

    const showEmptyState = hasSections ? visibleSections.length === 0 : visibleItems.length === 0;

    const renderItem = (item: DropdownMenuItem, key: string) => (
        <button
            key={key}
            type="button"
            className={[
                'inline-flex items-center justify-start w-full h-8 min-w-0 gap-2 px-2 py-1.5 transition-all duration-200 ease-in-out border-0 rounded-lg z-60 hover:bg-n-alpha-1 dark:hover:bg-n-alpha-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50',
                item.isSelected ? 'bg-n-alpha-1 dark:bg-n-solid-active' : '',
                item.action === 'delete' ? 'text-n-ruby-11' : 'text-n-slate-12',
            ].join(' ')}
            disabled={item.disabled}
            onClick={() => onAction(item)}
        >
            {renderThumbnail
                ? renderThumbnail(item)
                : item.thumbnail ? (
                      <Avatar name={item.thumbnail.name} src={item.thumbnail.src} size={thumbnailSize} roundedFull />
                  ) : null}
            {item.icon ? <Icon icon={item.icon} className="flex-shrink-0 size-3.5" /> : null}
            {item.emoji ? (
                <EmojiIcon
                    value={item.emoji as string}
                    color={item.iconColor as string}
                    className="flex-shrink-0 size-4"
                />
            ) : null}
            {item.label ? <span className="min-w-0 text-sm font-420 truncate">{item.label}</span> : null}
            {renderTrailingIcon ? renderTrailingIcon(item) : null}
        </button>
    );

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
                        onChange={event => {
                            setSearchQuery(event.target.value);
                            onSearch?.(event.target.value);
                        }}
                    />
                </div>
            ) : null}
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 px-2 pb-2">
                {hasSections
                    ? visibleSections.map((section, sectionIndex) => (
                          <div key={section.title ?? sectionIndex} className="flex flex-col gap-1">
                              {section.title ? (
                                  <p className="px-2 py-2 text-xs mb-0 font-medium text-n-slate-11 uppercase tracking-wide sticky top-0 z-10 bg-n-alpha-3 backdrop-blur-sm truncate min-w-0">
                                      {section.title}
                                  </p>
                              ) : null}
                              {section.isLoading ? (
                                  <div className="flex items-center justify-center py-2">
                                      <Spinner size={24} />
                                  </div>
                              ) : !section.items.length && section.emptyState ? (
                                  <div className="text-sm text-n-slate-11 px-2 py-1.5">{section.emptyState}</div>
                              ) : (
                                  section.items.map((item, itemIndex) => renderItem(item, `${item.value}-${itemIndex}`))
                              )}
                              {sectionIndex < visibleSections.length - 1 ? (
                                  <div className="h-px bg-n-alpha-2 mx-2 my-1" />
                              ) : null}
                          </div>
                      ))
                    : (
                          <>
                              {isLoading ? (
                                  <div className="flex items-center justify-center py-2">
                                      <Spinner size={24} />
                                  </div>
                              ) : null}
                              {visibleItems.map((item, index) => renderItem(item, `${item.value}-${index}`))}
                          </>
                      )}
                {showEmptyState && !isLoading ? (
                    <div className="text-sm text-n-slate-11 px-2 py-1.5">
                        {isSearching
                            ? t('DROPDOWN_MENU.SEARCHING')
                            : t('DROPDOWN_MENU.EMPTY_STATE')}
                    </div>
                ) : null}
            </div>
            {footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
    );
}
