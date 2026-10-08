import { useCallback, useEffect, useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';
import MultiselectDropdownItems from './MultiselectDropdownItems';
import type { MultiselectOption } from './MultiselectDropdownItems';

export type { MultiselectOption };

// Port từ shared/components/ui/MultiselectDropdown.vue. OnClickOutside của vueuse
// thay bằng listener mousedown (cùng cách ResolveAction đã port). Nhánh badge
// AgentBot bỏ như MultiselectDropdownItems.
interface MultiselectDropdownProps {
    options: MultiselectOption[];
    selectedItem?: MultiselectOption | null;
    hasThumbnail?: boolean;
    multiselectorTitle?: string;
    multiselectorPlaceholder?: string;
    noSearchResult?: string;
    inputPlaceholder?: string;
    showEmojiIcon?: boolean;
    avatarSeedOf?: (option: MultiselectOption) => string | undefined;
    onSelect: (option: MultiselectOption) => void;
}

export default function MultiselectDropdown({
    options = [],
    selectedItem,
    hasThumbnail = true,
    multiselectorTitle = '',
    multiselectorPlaceholder = 'None',
    noSearchResult = 'No results found',
    inputPlaceholder = 'Search',
    showEmojiIcon = false,
    avatarSeedOf,
    onSelect,
}: MultiselectDropdownProps) {
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const closeDropdown = useCallback(() => setShowSearchDropdown(false), []);

    useEffect(() => {
        if (!showSearchDropdown) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) closeDropdown();
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showSearchDropdown, closeDropdown]);

    const onClickSelectItem = (option: MultiselectOption) => {
        onSelect(option);
        closeDropdown();
    };

    const hasValue = Boolean(selectedItem && selectedItem.id);
    const hasIcon = selectedItem?.icon || false;
    const selectedItemName = selectedItem?.name;
    const selectedThumbnail = selectedItem?.thumbnail || selectedItem?.avatar_url;

    return (
        <div
            ref={containerRef}
            className="relative w-full mb-2"
            onKeyUp={event => {
                if (event.key === 'Escape') closeDropdown();
            }}
        >
            <NextButton
                slate
                outline
                trailingIcon
                icon={showSearchDropdown ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'}
                className="w-full !px-2"
                onClick={() => setShowSearchDropdown(current => !current)}
            >
                <div className="flex items-center justify-between w-full min-w-0">
                    {!hasValue ? (
                        <h4 className="text-sm text-ellipsis text-n-slate-12">{multiselectorPlaceholder}</h4>
                    ) : (
                        <h4
                            className="items-center overflow-hidden text-sm leading-tight whitespace-nowrap text-ellipsis text-n-slate-12"
                            title={selectedItemName}
                        >
                            {selectedItemName}
                        </h4>
                    )}
                </div>
                {hasValue && hasThumbnail && !hasIcon ? (
                    <Avatar
                        src={selectedThumbnail}
                        status={selectedItem?.availability_status}
                        name={selectedItemName ?? ''}
                        seed={selectedItem ? avatarSeedOf?.(selectedItem) : undefined}
                        size={24}
                        hideOfflineStatus
                        roundedFull
                    />
                ) : hasValue && hasIcon && showEmojiIcon ? (
                    <div className="flex items-center justify-center flex-shrink-0 text-sm rounded-full size-6 outline outline-1 -outline-offset-1 outline-n-weak">
                        <EmojiIcon
                            value={selectedItem?.icon}
                            color={selectedItem?.icon_color}
                            className="size-3.5 !text-sm"
                        />
                    </div>
                ) : hasValue && hasIcon ? (
                    <Icon icon={selectedItem?.icon as string} className="size-5 text-n-slate-11" />
                ) : null}
            </NextButton>
            <div
                className={`${
                    showSearchDropdown ? 'block visible' : 'hidden invisible'
                } box-border top-[2.625rem] w-full border rounded-lg bg-n-alpha-3 backdrop-blur-[100px] absolute shadow-lg border-n-strong p-2 z-[9999]`}
            >
                <div className="flex items-center justify-between mb-1">
                    <h4 className="m-0 overflow-hidden text-sm text-n-slate-11 whitespace-nowrap text-ellipsis">
                        {multiselectorTitle}
                    </h4>
                    <NextButton ghost slate xs icon="i-lucide-x" onClick={closeDropdown} />
                </div>
                {showSearchDropdown ? (
                    <MultiselectDropdownItems
                        options={options}
                        selectedItems={[selectedItem]}
                        hasThumbnail={hasThumbnail}
                        inputPlaceholder={inputPlaceholder}
                        noSearchResult={noSearchResult}
                        showEmojiIcon={showEmojiIcon}
                        avatarSeedOf={avatarSeedOf}
                        onSelect={onClickSelectItem}
                    />
                ) : null}
            </div>
        </div>
    );
}
