import { useEffect, useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ shared/components/ui/MultiselectDropdownItems.vue. SCSS scoped của gốc
// đưa thẳng vào class Tailwind (`.dropdown-wrap`, `.search-input`). Bỏ nhánh badge
// AgentBot (Avatar chưa có slot badge — nợ B6) và điều hướng ArrowUp/ArrowDown của
// WootDropdownMenu (gốc dò `li .button`, NextButton không mang class `button` nên
// vô tác dụng ngay từ gốc).
export interface MultiselectOption {
    id: string | number | null;
    name?: string;
    icon?: string;
    icon_color?: string;
    thumbnail?: string;
    avatar_url?: string;
    availability_status?: 'online' | 'busy' | 'offline' | null;
    assignee_type?: string;
}

interface MultiselectDropdownItemsProps {
    options: MultiselectOption[];
    selectedItems: (MultiselectOption | null | undefined)[];
    hasThumbnail?: boolean;
    inputPlaceholder?: string;
    noSearchResult?: string;
    showEmojiIcon?: boolean;
    onSelect: (option: MultiselectOption) => void;
}

export default function MultiselectDropdownItems({
    options,
    selectedItems,
    hasThumbnail = true,
    inputPlaceholder = 'Search',
    noSearchResult = 'No results found',
    showEmojiIcon = false,
    onSelect,
}: MultiselectDropdownItemsProps) {
    const [search, setSearch] = useState('');
    const searchbarRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        searchbarRef.current?.focus();
    }, []);

    const filteredOptions = options.filter(option =>
        (option.name || '').toLowerCase().includes(search.toLowerCase()),
    );
    const noResult = filteredOptions.length === 0 && search !== '';

    const isActive = (option: MultiselectOption) =>
        selectedItems.some(item => {
            if (!item || option.id !== item.id) return false;

            return (option.assignee_type || 'User') === (item.assignee_type || 'User');
        });

    return (
        <div className="dropdown-wrap w-full flex flex-col max-h-[12.5rem]">
            <div className="flex-auto flex-grow-0 flex-shrink-0 mb-2 max-h-8">
                <input
                    ref={searchbarRef}
                    type="text"
                    className="search-input m-0 w-full border border-solid border-transparent h-8 text-sm text-n-slate-12 rounded-md focus:border-n-brand bg-n-background dark:bg-n-background"
                    placeholder={inputPlaceholder}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
            </div>
            <div className="flex items-start justify-start flex-auto overflow-auto mt-2">
                <div className="w-full max-h-[10rem]">
                    <ul className="dropdown menu vertical dropdown--top m-0 p-0">
                        {filteredOptions.map(option => (
                            <li
                                key={`${option.assignee_type || 'User'}-${option.id}`}
                                className="mb-1 list-none dropdown-menu__item"
                                tabIndex={-1}
                            >
                                <NextButton
                                    slate
                                    variant={isActive(option) ? 'faded' : 'ghost'}
                                    trailingIcon
                                    icon={isActive(option) ? 'i-lucide-check' : ''}
                                    className="w-full !px-2.5"
                                    onClick={() => onSelect(option)}
                                >
                                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                        <span
                                            className="my-0 overflow-hidden text-sm leading-4 whitespace-nowrap text-ellipsis"
                                            title={option.name}
                                        >
                                            {option.name}
                                        </span>
                                    </div>
                                    {hasThumbnail && !option.icon ? (
                                        <Avatar
                                            src={option.thumbnail}
                                            name={option.name ?? ''}
                                            status={option.availability_status}
                                            size={24}
                                            hideOfflineStatus
                                            roundedFull
                                        />
                                    ) : option.icon && showEmojiIcon ? (
                                        <div className="flex items-center justify-center flex-shrink-0 text-sm rounded-full size-6 outline outline-1 -outline-offset-1 outline-n-weak">
                                            <EmojiIcon
                                                value={option.icon}
                                                color={option.icon_color}
                                                className="size-3.5 !text-sm"
                                            />
                                        </div>
                                    ) : option.icon ? (
                                        <Icon icon={option.icon} className="size-5 text-n-slate-11" />
                                    ) : null}
                                </NextButton>
                            </li>
                        ))}
                    </ul>
                    {noResult ? (
                        <h4 className="w-full justify-center items-center flex text-n-slate-10 py-2 px-2.5 overflow-hidden whitespace-nowrap text-ellipsis text-sm">
                            {noSearchResult}
                        </h4>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
