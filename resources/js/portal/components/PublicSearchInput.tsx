import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

// Port từ portal/components/PublicSearchInput.vue.
export interface SearchInputHandle {
    focusInput: () => void;
    blurInput: () => void;
}

interface PublicSearchInputProps {
    searchTerm: string;
    searchPlaceholder: string;
    size?: 'small' | 'default';
    kbd?: string;
    onUpdateSearchTerm: (value: string) => void;
    onFocus?: () => void;
}

const PublicSearchInput = forwardRef<SearchInputHandle, PublicSearchInputProps>(function PublicSearchInput(
    { searchTerm, searchPlaceholder, size = 'default', kbd = '', onUpdateSearchTerm, onFocus },
    ref,
) {
    const [isFocused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focusInput: () => inputRef.current?.focus(),
        blurInput: () => inputRef.current?.blur(),
    }));

    const sizeClasses =
        size === 'small'
            ? { wrapper: 'h-9 px-3 py-1', input: 'text-sm py-0' }
            : { wrapper: 'h-12 px-5 py-2', input: 'text-base py-2' };

    return (
        <div
            className={`w-full flex items-center gap-2 rounded-lg border-solid border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 transition-all duration-500 ease-out ${sizeClasses.wrapper} ${
                isFocused
                    ? 'shadow border-n-portal ring-4 ring-n-portal-soft'
                    : 'border-slate-50 dark:border-slate-800 shadow-sm ring-0 ring-transparent'
            }`}
        >
            <FluentIcon icon="search" />
            <input
                ref={inputRef}
                value={searchTerm}
                type="text"
                className={`flex-1 min-w-0 focus:outline-none h-full bg-transparent px-2 text-slate-700 dark:text-slate-100 placeholder-slate-500 ${sizeClasses.input}`}
                placeholder={searchPlaceholder}
                role="search"
                onChange={(event: ChangeEvent<HTMLInputElement>) => onUpdateSearchTerm(event.target.value)}
                onFocus={() => {
                    setFocused(true);
                    onFocus?.();
                }}
                onBlur={() => setFocused(false)}
            />
            {kbd ? (
                <kbd className="shrink-0 inline-flex items-center text-xs font-medium text-n-slate-11 bg-n-alpha-2 border border-solid border-n-weak rounded px-1.5 py-0.5 font-inter">
                    {kbd}
                </kbd>
            ) : null}
        </div>
    );
});

export default PublicSearchInput;
