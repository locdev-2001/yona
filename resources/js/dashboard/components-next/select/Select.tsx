import type { SelectHTMLAttributes } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components-next/select/Select.vue.
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectOptionGroup {
    label: string;
    options: SelectOption[];
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    options?: SelectOption[];
    // Có `groups` thì `options` bị bỏ qua, đúng nhánh v-if của bản gốc.
    groups?: SelectOptionGroup[];
    placeholder?: string;
    error?: boolean;
    onChange: (value: string) => void;
}

export default function SelectInput({
    options = [],
    groups = [],
    placeholder = '',
    error = false,
    disabled = false,
    className = '',
    onChange,
    ...attrs
}: SelectInputProps) {
    const stateClass = disabled
        ? 'cursor-not-allowed opacity-60'
        : error
          ? 'field-invalid'
          : '';

    return (
        <div className={`w-fit relative ${className}`}>
            <select
                disabled={disabled}
                className={`field-surface appearance-none bg-none rounded-lg border-0 !mb-0 py-2 px-3 pr-10 text-sm ${stateClass}`}
                onChange={event => onChange(event.target.value)}
                {...attrs}
            >
                {placeholder ? (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                ) : null}
                {groups.length > 0
                    ? groups.map(group => (
                          <optgroup key={group.label} label={group.label}>
                              {group.options.map(option => (
                                  <option key={option.value} value={option.value} disabled={option.disabled}>
                                      {option.label}
                                  </option>
                              ))}
                          </optgroup>
                      ))
                    : options.map(option => (
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
