import type { CSSProperties, FocusEvent } from 'react';

// Port từ dashboard/components/widgets/forms/Input.vue (woot-input legacy) —
// style input/label/error đến từ global _base.scss như gốc.
interface WootInputProps {
    label?: string;
    value: string;
    type?: string;
    placeholder?: string;
    helpText?: string;
    error?: string;
    readonly?: boolean;
    styles?: CSSProperties;
    className?: string;
    onChange: (value: string) => void;
    onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}

export default function WootInput({
    label = '',
    value,
    type = 'text',
    placeholder = '',
    helpText = '',
    error = '',
    readonly = false,
    styles,
    className = '',
    onChange,
    onBlur,
}: WootInputProps) {
    return (
        <label className={`input-container ${className}`}>
            {label ? <span className="text-heading-3">{label}</span> : null}
            <input
                value={value}
                type={type}
                placeholder={placeholder}
                readOnly={readonly}
                style={styles}
                onChange={event => onChange(event.target.value)}
                onBlur={onBlur}
            />
            {helpText ? <p className="help-text text-label-small mt-0.5 not-italic text-n-slate-11">{helpText}</p> : null}
            {error ? <span className="message !mt-0">{error}</span> : null}
        </label>
    );
}
