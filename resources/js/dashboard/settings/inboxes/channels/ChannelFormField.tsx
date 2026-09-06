// Khối `<div class="flex-shrink-0 flex-grow-0"><label>…</label></div>` lặp lại ở
// mọi form kênh của Chatwoot (Telegram.vue, Line.vue, BandwidthSms.vue,
// Twilio.vue, CloudWhatsapp.vue, 360DialogWhatsapp.vue). Gom về một chỗ để đổi
// một lần là mọi kênh đổi theo.
interface ChannelFormFieldProps {
    label: string;
    value: string;
    placeholder?: string;
    helpText?: string;
    errorMessage?: string;
    hasError?: boolean;
    onChange: (value: string) => void;
    onBlur?: () => void;
}

export default function ChannelFormField({
    label,
    value,
    placeholder,
    helpText,
    errorMessage,
    hasError = false,
    onChange,
    onBlur,
}: ChannelFormFieldProps) {
    return (
        <div className="flex-shrink-0 flex-grow-0">
            <label className={hasError ? 'error' : ''}>
                {label}
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={event => onChange(event.target.value)}
                    onBlur={onBlur}
                />
                {hasError && errorMessage ? <span className="message">{errorMessage}</span> : null}
            </label>
            {helpText ? <p className="help-text">{helpText}</p> : null}
        </div>
    );
}
