import { useId, useState, type FormEvent } from 'react';

import { useMessageHost } from '../host';
import type { FormField, FormFieldType, StructuredMessage } from '../model';
import { records, text } from '../parse';
import { defineMessageType } from '../registry';
import { ArrowRight, Check, ClipboardList, Mail, Phone } from '../kit/icons';
import { KitRoot, kt } from '../kit/primitives';
import { useSubmission } from '../kit/useSubmission';

// Form trong tin. Ngắn (≤ 3 ô, không ô dài) thì điền ngay trong thẻ; dài hơn thì
// thẻ chỉ có nút "Điền thông tin" mở trang công khai (cùng luật FormType phía server).
// Gửi xong thẻ đổi thành bản tóm tắt thông tin đã nhận.

const FIELD_TYPES: FormFieldType[] = ['text', 'text_area', 'email', 'phone', 'select', 'date'];
const INLINE_MAX_FIELDS = 3;

interface FormModel {
    fields: FormField[];
    inline: boolean;
}

const INPUT_TYPE: Record<FormFieldType, string> = {
    text: 'text',
    text_area: 'text',
    email: 'email',
    phone: 'tel',
    select: 'text',
    date: 'date',
};

const valid = (field: FormField, value: string): boolean => {
    if (value === '') return !field.required;
    if (field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (field.type === 'phone') return /^\+?[0-9][0-9 .-]{7,18}[0-9]$/.test(value);

    return true;
};

const FIELD_ICON: Partial<Record<FormFieldType, typeof Phone>> = { phone: Phone, email: Mail };

function Header({ title, done, fieldType }: { title: string; done?: boolean; fieldType?: FormFieldType }) {
    const FieldIcon = (fieldType && FIELD_ICON[fieldType]) || ClipboardList;

    return (
        <div className="mk-row">
            <span className={`mk-tile ${done ? 'mk-tile--good' : 'mk-tile--accent'}`}>{done ? <Check /> : <FieldIcon />}</span>
            <span className="mk-title">{title}</span>
        </div>
    );
}

function FormView({ model, message }: { model: FormModel; message: StructuredMessage }) {
    const host = useMessageHost();
    const baseId = useId();
    const { values: answered, failed, submit, interactive } = useSubmission(message);
    const [values, setValues] = useState<Record<string, string>>({});
    const [invalid, setInvalid] = useState<string | null>(null);
    const title = message.content || model.fields[0].label;

    if (answered) {
        return (
            <KitRoot>
                <div className="mk-card mk-pad">
                    <Header title={kt('form_received')} done />
                    <div className="mk-summary">
                        {answered.map(entry => (
                            <span key={entry.name ?? entry.title} className="mk-summary-row">
                                {entry.title}: <b>{entry.value}</b>
                            </span>
                        ))}
                    </div>
                </div>
            </KitRoot>
        );
    }

    if (!model.inline) {
        return (
            <KitRoot>
                <div className="mk-card mk-pad">
                    <Header title={title} />
                    <button
                        type="button"
                        className="mk-pill mk-pill--primary mk-pill--block"
                        disabled={!interactive}
                        onClick={() => host.act({ kind: 'webview', label: kt('form_open'), page: 'form' }, { message })}
                    >
                        {kt('form_open')}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </KitRoot>
        );
    }

    // Một ô (xin SĐT, email): ô nhập và nút mũi tên chung một hàng như design.
    const single = model.fields.length === 1 && model.fields[0].type !== 'text_area';

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const wrong = model.fields.find(field => !valid(field, (values[field.name] ?? '').trim()));

        if (wrong) {
            setInvalid(wrong.name);

            return;
        }

        setInvalid(null);
        void submit(model.fields.flatMap(field => ((values[field.name] ?? '').trim() ? [{ name: field.name, value: values[field.name].trim() }] : [])));
    };

    return (
        <KitRoot>
            <form className="mk-card mk-pad" onSubmit={onSubmit} noValidate>
                <Header title={title} fieldType={single ? model.fields[0].type : undefined} />
                {model.fields.map(field => {
                    const id = `${baseId}-${field.name}`;
                    const common = {
                        id,
                        className: 'mk-input',
                        placeholder: field.placeholder,
                        required: field.required,
                        disabled: !interactive,
                        'aria-invalid': invalid === field.name,
                        'aria-describedby': invalid === field.name ? `${id}-error` : undefined,
                        value: values[field.name] ?? '',
                        onChange: (event: { target: { value: string } }) => setValues(current => ({ ...current, [field.name]: event.target.value })),
                    };

                    return (
                        <div key={field.name} className="mk-field">
                            <label className="mk-label" htmlFor={id}>
                                {field.label}
                            </label>
                            {field.type === 'select' ? (
                                <select {...common}>
                                    <option value="" />
                                    {field.options?.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : field.type === 'text_area' ? (
                                <textarea {...common} />
                            ) : single ? (
                                <span className="mk-inline-field">
                                    <input {...common} type={INPUT_TYPE[field.type]} inputMode={field.type === 'phone' ? 'tel' : undefined} />
                                    <button type="submit" className="mk-go" aria-label={kt('submit_field', { field: field.label.toLowerCase() })} disabled={!interactive}>
                                        <ArrowRight />
                                    </button>
                                </span>
                            ) : (
                                <input {...common} type={INPUT_TYPE[field.type]} inputMode={field.type === 'phone' ? 'tel' : undefined} />
                            )}
                            {invalid === field.name ? (
                                <span id={`${id}-error`} className="mk-error">
                                    {kt('check_field', { field: field.label })}
                                </span>
                            ) : null}
                        </div>
                    );
                })}
                {single ? null : (
                    <button type="submit" className="mk-pill mk-pill--primary mk-pill--block" disabled={!interactive}>
                        {kt('submit')}
                    </button>
                )}
                {failed ? <p className="mk-error">{kt('send_failed')}</p> : null}
            </form>
        </KitRoot>
    );
}

export default defineMessageType<FormModel>({
    contentType: 'form',
    content: 'view',
    side: 'agent',
    parse: attributes => {
        const fields = (records(attributes.items) ?? []).flatMap(raw => {
            const name = text(raw.name);
            const label = text(raw.label);
            const type = raw.type as FormFieldType;

            if (!name || !label || !FIELD_TYPES.includes(type)) return [];

            return [
                {
                    name,
                    label,
                    type,
                    placeholder: text(raw.placeholder),
                    required: raw.required === true,
                    options: (records(raw.options) ?? []).flatMap(option =>
                        text(option.label) && text(option.value) ? [{ label: String(option.label), value: String(option.value) }] : [],
                    ),
                },
            ];
        });

        if (fields.length === 0) return null;

        return { fields, inline: fields.length <= INLINE_MAX_FIELDS && !fields.some(field => field.type === 'text_area') };
    },
    View: FormView,
});
