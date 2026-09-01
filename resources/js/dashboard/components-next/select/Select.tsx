import type { SelectHTMLAttributes } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components-next/select/Select.vue (nhánh options phẳng;
// optgroup vào khi màn nào cần).
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    options: SelectOption[];
    placeholder?: string;
    error?: boolean;
    onChange: (value: string) => void;
}

export default function SelectInput({
    options,
    placeholder = '',
    error = false,
    disabled = false,
    className = '',
    onChange,
    ...attrs
}: SelectInputProps) {
    const stateClass = disabled
        ? 'outline-n-weak bg-n-slate-2 cursor-not-allowed opacity-60'
        : error
          ? 'outline-n-red-9 focus:outline-n-red-9'
          : 'outline-n-weak hover:outline-n-slate-6 focus:outline-n-blue-9';

    return (
        <div className={`w-fit relative ${className}`}>
            <select
                disabled={disabled}
                className={`appearance-none bg-none rounded-lg border-0 outline-1 outline -outline-offset-1 transition-all duration-200 bg-n-surface-1 !mb-0 py-2 px-3 pr-10 text-sm ${stateClass}`}
                onChange={event => onChange(event.target.value)}
                {...attrs}
            >
                {placeholder ? (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                ) : null}
                {options.map(option => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Icon icon="i-lucide-chevron-down" className={`size-4 text-n-slate-11 ${disabled ? 'opacity-50' : ''}`} />
            </div>
        </div>
    );
}
