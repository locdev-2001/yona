import { useEffect, useRef, useState } from 'react';

import InlineInput from 'dashboard/components-next/inline-input/InlineInput';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Port từ dashboard/components-next/taginput/TagInput.vue — nhánh dùng ở inbox
// (mode multiple, type text, chọn từ dropdown, skipLabelDedup). Các nhánh
// email/tel/allowCreate vào cùng màn cần chúng (new conversation…).
interface TagInputProps {
    value: string[];
    placeholder?: string;
    menuItems: DropdownMenuItem[];
    isLoading?: boolean;
    // Khi false dropdown không tự mở lúc mount, chỉ mở khi click/focus.
    autoOpenDropdown?: boolean;
    onAdd: (item: DropdownMenuItem) => void;
    onRemove: (index: number) => void;
}

export default function TagInput({
    value,
    placeholder = '',
    menuItems,
    isLoading = false,
    autoOpenDropdown = true,
    onAdd,
    onRemove,
}: TagInputProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [newTag, setNewTag] = useState('');
    const [isFocused, setFocused] = useState(autoOpenDropdown);

    useEffect(() => {
        if (!isFocused) return;

        const onClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setFocused(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [isFocused]);

    const query = newTag.trim().toLowerCase();
    const filteredMenuItems = query
        ? menuItems.filter(item => item.label.toLowerCase().includes(query))
        : menuItems;

    const handleFocus = () => {
        inputRef.current?.focus();
        setFocused(true);
    };

    const handleAction = (item: DropdownMenuItem) => {
        onAdd(item);
        setNewTag('');
        inputRef.current?.focus();
    };

    const showInput = isFocused || !value.length;

    return (
        <div
            ref={containerRef}
            className="flex flex-wrap w-full gap-2 border border-transparent focus:outline-none"
            tabIndex={0}
            onFocus={handleFocus}
            onClick={handleFocus}
        >
            {value.map((tag, index) => (
                <div
                    key={`${tag}-${index}`}
                    className="flex items-center justify-center max-w-full gap-1 px-3 py-1 rounded-lg h-7 bg-n-alpha-2"
                >
                    <span className="flex-grow min-w-0 text-sm truncate text-n-slate-12">{tag}</span>
                    <span
                        className="flex-shrink-0 cursor-pointer i-lucide-x size-3.5 text-n-slate-11"
                        onClick={event => {
                            event.stopPropagation();
                            onRemove(index);
                        }}
                    />
                </div>
            ))}
            {showInput || isFocused ? (
                <div className="relative flex items-center gap-2 flex-1 min-w-[200px] w-full">
                    <InlineInput
                        ref={inputRef}
                        value={newTag}
                        placeholder={placeholder}
                        className="w-full"
                        customInputClass="w-full"
                        onChange={event => setNewTag(event.target.value)}
                        onFocus={() => setFocused(true)}
                    />
                    {isFocused ? (
                        <DropdownMenu
                            menuItems={filteredMenuItems}
                            isLoading={isLoading}
                            className="ltr:left-0 rtl:right-0 z-[100] top-8 max-h-56 w-[inherit] max-w-md dark:!outline-n-slate-5"
                            onAction={handleAction}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
