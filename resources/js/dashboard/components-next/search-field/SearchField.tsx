import type { KeyboardEvent, ReactNode, Ref } from 'react';

import { t } from '../../../i18n';

interface SearchFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel?: string;
    className?: string;
    inputRef?: Ref<HTMLInputElement>;
    // Phần đứng sau ô nhập trong cùng khung (bộ đếm kết quả, nút lên/xuống).
    trailing?: ReactNode;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
    // Tắt nút xoá khi phần trailing đã có nút đóng riêng.
    clearable?: boolean;
}

// Ô tìm chuẩn của bảng điều khiển: nền field-surface, một viền focus duy nhất ở
// khung ngoài, nút xoá khi đã gõ, ESC xoá từ khoá (ô rỗng thì ESC đi tiếp ra ngoài).
export default function SearchField({
    value,
    onChange,
    placeholder,
    ariaLabel,
    className = '',
    inputRef,
    trailing,
    onKeyDown,
    clearable = true,
}: SearchFieldProps) {
    const clearLabel = t('CHAT_LIST.SEARCH.CLEAR');

    return (
        <div className={`field-surface flex min-w-0 items-center gap-2 h-9 max-md:h-10 px-2.5 rounded-lg ${className}`}>
            <span className="i-lucide-search size-[1.125rem] shrink-0 text-n-slate-10" aria-hidden="true" />
            <input
                ref={inputRef}
                type="search"
                value={value}
                placeholder={placeholder}
                aria-label={ariaLabel ?? placeholder}
                className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-[0.9375rem] bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10 [&::-webkit-search-cancel-button]:hidden"
                onChange={event => onChange(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Escape' && value) {
                        event.stopPropagation();
                        onChange('');
                        return;
                    }
                    onKeyDown?.(event);
                }}
            />
            {value && clearable ? (
                <button
                    type="button"
                    title={clearLabel}
                    aria-label={clearLabel}
                    className="grid place-content-center size-5 shrink-0 rounded text-n-slate-10 hover:text-n-slate-12 hover:bg-n-surface-hover"
                    onClick={() => onChange('')}
                >
                    <span className="i-lucide-x size-3.5" aria-hidden="true" />
                </button>
            ) : null}
            {trailing}
        </div>
    );
}
