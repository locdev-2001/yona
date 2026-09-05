import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Port từ dashboard/components-next/textarea/TextArea.vue — bỏ nhánh chữ ký
// (signature/allowSignature) vì màn dùng nó chưa bật cờ đó.
type MessageType = 'info' | 'error' | 'success';

const MESSAGE_CLASSES: Record<MessageType, string> = {
    error: 'text-n-ruby-9 dark:text-n-ruby-9',
    success: 'text-n-teal-10 dark:text-n-teal-10',
    info: 'text-n-slate-11 dark:text-n-slate-11',
};

interface TextAreaProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    maxLength?: number;
    id?: string;
    disabled?: boolean;
    customTextAreaClass?: string;
    customTextAreaWrapperClass?: string;
    showCharacterCount?: boolean;
    autoHeight?: boolean;
    resize?: boolean;
    minHeight?: string;
    maxHeight?: string;
    autofocus?: boolean;
    message?: string;
    messageType?: MessageType;
    className?: string;
    children?: ReactNode;
}

export default function TextArea({
    value,
    onChange,
    label = '',
    placeholder = '',
    maxLength = 200,
    id = '',
    disabled = false,
    customTextAreaClass = '',
    customTextAreaWrapperClass = '',
    showCharacterCount = false,
    autoHeight = false,
    resize = false,
    minHeight = '4rem',
    maxHeight = '12rem',
    autofocus = false,
    message = '',
    messageType = 'info',
    className = '',
    children,
}: TextAreaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setFocused] = useState(false);

    useEffect(() => {
        if (!autoHeight || !textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, [autoHeight, value]);

    useEffect(() => {
        if (autofocus) textareaRef.current?.focus();
    }, [autofocus]);

    const borderClasses = disabled
        ? 'cursor-not-allowed opacity-50 !bg-n-alpha-black2 disabled:border-n-weak dark:disabled:border-n-weak'
        : isFocused
          ? 'border-n-brand dark:border-n-brand'
          : messageType === 'error'
            ? 'border-n-ruby-8 dark:border-n-ruby-8 hover:border-n-ruby-9 dark:hover:border-n-ruby-9'
            : 'hover:border-n-slate-6 dark:hover:border-n-slate-6 border-n-weak dark:border-n-weak';

    return (
        <div className={`relative flex flex-col gap-1 ${className}`.trim()}>
            {label ? (
                <label htmlFor={id} className="mb-0.5 text-sm font-medium text-n-slate-12">
                    {label}
                </label>
            ) : null}
            <div
                className={`flex flex-col gap-2 px-3 pt-3 pb-3 transition-all duration-500 ease-in-out border rounded-lg bg-n-alpha-black2 ${customTextAreaWrapperClass} ${borderClasses}`}
            >
                {children}
                <textarea
                    id={id || undefined}
                    ref={textareaRef}
                    value={value}
                    placeholder={placeholder}
                    maxLength={showCharacterCount ? maxLength : undefined}
                    className={`flex w-full reset-base text-sm p-0 !rounded-none !bg-transparent dark:!bg-transparent !border-0 !outline-0 !mb-0 placeholder:text-n-slate-10 dark:placeholder:text-n-slate-10 text-n-slate-12 dark:text-n-slate-12 disabled:cursor-not-allowed disabled:opacity-50 ${customTextAreaClass} ${resize ? '' : 'resize-none'}`}
                    style={{
                        minHeight: autoHeight ? minHeight : undefined,
                        maxHeight: autoHeight ? maxHeight : undefined,
                    }}
                    disabled={disabled}
                    rows={1}
                    onChange={event => onChange(event.target.value)}
                    onFocus={() => !disabled && setFocused(true)}
                    onBlur={() => !disabled && setFocused(false)}
                />
                {showCharacterCount ? (
                    <div className="flex items-center justify-end h-4 mt-1 bottom-3 ltr:right-3 rtl:left-3">
                        <span className="text-xs tabular-nums text-n-slate-10">
                            {value.length} / {maxLength}
                        </span>
                    </div>
                ) : null}
            </div>
            {message ? (
                <p
                    className={`min-w-0 mt-1 mb-0 text-xs truncate transition-all duration-500 ease-in-out ${MESSAGE_CLASSES[messageType]}`}
                >
                    {message}
                </p>
            ) : null}
        </div>
    );
}
