import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

// Port từ dashboard/components-next/input/Input.vue
type InputSize = 'sm' | 'md';
type MessageType = 'info' | 'error' | 'success';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    label?: string;
    customInputClass?: string;
    size?: InputSize;
    message?: string;
    messageType?: MessageType;
    prefix?: ReactNode;
}

const MESSAGE_CLASSES: Record<MessageType, string> = {
    error: 'text-n-ruby-9',
    success: 'text-n-teal-10',
    info: 'text-n-slate-11',
};

const OUTLINE_CLASSES: Record<string, string> = {
    error: 'outline-n-ruby-8 hover:outline-n-ruby-9 disabled:outline-n-ruby-8',
    default: 'outline-n-weak hover:outline-n-slate-6 disabled:outline-n-weak focus:outline-n-brand',
};

const SIZE_CLASSES: Record<InputSize, string> = {
    sm: 'h-8 !px-3 !py-2',
    md: 'h-10 !px-3 !py-2.5',
};

export default function Input({
    id,
    label = '',
    customInputClass = '',
    size = 'md',
    message = '',
    messageType = 'info',
    prefix,
    className = '',
    type = 'text',
    onFocus,
    onBlur,
    ...attrs
}: InputProps) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [isFocused, setFocused] = useState(false);

    // Bản gốc là component Vue: `class` người gọi truyền vào rơi xuống thẻ gốc
    // (wrapper) ĐỒNG THỜI được v-bind="$attrs" gắn lên cả <input>. Giữ nguyên
    // hành vi đó để class canh chỉnh (vd flex-1) tác động đúng.
    const inputClasses = [
        className,
        customInputClass,
        OUTLINE_CLASSES[messageType === 'error' ? 'error' : 'default'],
        SIZE_CLASSES[size],
        messageType === 'error' ? 'error' : '',
        isFocused ? 'focus' : '',
        'block w-full reset-base text-sm !mb-0 outline outline-1 border-none border-0 outline-offset-[-1px] rounded-lg bg-n-alpha-black2 file:border-0 file:bg-transparent file:text-sm file:font-medium text-ellipsis placeholder:text-n-slate-10 disabled:cursor-not-allowed disabled:opacity-50 text-n-slate-12 transition-all duration-500 ease-in-out [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={`relative flex flex-col min-w-0 gap-1 ${className}`.trim()}>
            {label ? (
                <label htmlFor={inputId} className="mb-0.5 text-heading-3 text-n-slate-12">
                    {label}
                </label>
            ) : null}
            {prefix}
            <input
                id={inputId}
                type={type}
                className={inputClasses}
                onFocus={event => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                onBlur={event => {
                    setFocused(false);
                    onBlur?.(event);
                }}
                {...attrs}
            />
            {message ? (
                <p
                    className={`min-w-0 mt-1 mb-0 text-label-small truncate transition-all duration-500 ease-in-out ${MESSAGE_CLASSES[messageType]}`}
                >
                    {message}
                </p>
            ) : null}
        </div>
    );
}
