import WithLabel from './WithLabel';

// Port từ v3/components/Form/Select.vue — caret + nền select đến từ style
// `select` global trong _base.scss (trùng data-URI với bản scoped của gốc).
export interface SelectOption {
    value: string;
    label: string;
}

interface FormSelectProps {
    id?: string;
    name: string;
    label?: string;
    value: string;
    options: SelectOption[];
    placeholder?: string;
    hasError?: boolean;
    errorMessage?: string;
    className?: string;
    onChange: (value: string) => void;
}

export default function FormSelect({
    id,
    name,
    label = '',
    value,
    options,
    placeholder = '',
    hasError = false,
    errorMessage = '',
    className = '',
    onChange,
}: FormSelectProps) {
    return (
        <WithLabel label={label} name={name} hasError={hasError} errorMessage={errorMessage}>
            <select
                id={id}
                value={value}
                name={name}
                className={[
                    value ? 'text-n-slate-12' : 'text-n-slate-9',
                    'block w-full px-3 py-2 pr-6 mb-0 border-0 shadow-sm appearance-none rounded-xl leading-6',
                    className,
                ]
                    .filter(Boolean)
                    .join(' ')}
                onChange={event => onChange(event.target.value)}
            >
                {placeholder ? (
                    <option value="" disabled className="hidden">
                        {placeholder}
                    </option>
                ) : null}
                {options.map(option => (
                    <option key={option.value || 'default'} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </WithLabel>
    );
}
