// Port từ dashboard/components-next/checkbox/Checkbox.vue
interface CheckboxProps {
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    title?: string;
    className?: string;
    onChange?: () => void;
}

export default function Checkbox({
    checked = false,
    indeterminate = false,
    disabled = false,
    title,
    className = '',
    onChange,
}: CheckboxProps) {
    return (
        <div className={`relative w-4 h-4 ${className}`.trim()}>
            <input
                checked={checked}
                ref={input => {
                    if (input) input.indeterminate = indeterminate;
                }}
                type="checkbox"
                disabled={disabled}
                title={title}
                className="peer absolute inset-0 z-10 h-4 w-4 disabled:opacity-50 appearance-none rounded border border-n-slate-6 ring-transparent transition-all duration-200 checked:border-n-brand checked:bg-n-brand indeterminate:border-n-brand indeterminate:bg-n-brand hover:enabled:bg-n-blue-border cursor-pointer"
                onChange={() => onChange?.()}
            />
            <svg
                viewBox="0 0 14 14"
                fill="none"
                className="pointer-events-none absolute w-3.5 h-3.5 z-20 stroke-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <path d="M3 8L6 11L11 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg
                viewBox="0 0 14 14"
                fill="none"
                className="pointer-events-none absolute w-3.5 h-3.5 z-20 stroke-white opacity-0 peer-indeterminate:opacity-100 transition-opacity duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <path d="M3 7L11 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}
