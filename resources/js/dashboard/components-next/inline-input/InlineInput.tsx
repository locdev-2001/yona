import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

// Port từ dashboard/components-next/inline-input/InlineInput.vue
interface InlineInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    customInputClass?: string;
    customLabelClass?: string;
    onEnterPress?: () => void;
    onEscapePress?: () => void;
}

const InlineInput = forwardRef<HTMLInputElement, InlineInputProps>(function InlineInput(
    { label = '', customInputClass = '', customLabelClass = '', onEnterPress, onEscapePress, id, className = '', ...attrs },
    ref,
) {
    // `class` đặt trên component ở Vue rơi xuống thẻ gốc (fallthrough attribute),
    // KHÔNG xuống ô nhập — `customInputClass` mới là class của ô nhập.
    return (
        <div className={`relative flex items-center justify-between w-full gap-3 whitespace-nowrap ${className}`.trim()}>
            {label ? (
                <label htmlFor={id} className={`mb-0.5 text-sm font-medium text-n-slate-12 ${customLabelClass}`}>
                    {label}
                </label>
            ) : null}
            <input
                id={id}
                ref={ref}
                className={`flex w-full min-w-0 reset-base text-sm h-6 !mb-0 border-0 rounded-none outline-none outline-0 bg-transparent placeholder:text-n-slate-10 disabled:cursor-not-allowed disabled:opacity-50 text-n-slate-12 transition-all duration-500 ease-in-out ${customInputClass}`}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        onEnterPress?.();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        onEscapePress?.();
                    }
                }}
                {...attrs}
            />
        </div>
    );
});

export default InlineInput;
