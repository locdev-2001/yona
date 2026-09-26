import { useId, useState, type FormEvent } from 'react';

import { records, text } from 'shared/messaging/parse';
import type { FormField, FormFieldType } from 'shared/messaging/model';

import { t } from '../../i18n';
import { submitFlow } from '../api';
import type { FlowPageProps } from '../registry';

// Trang "form" (form dài, quá 3 ô hoặc có ô nhiều dòng — cùng luật FormType phía
// máy chủ). Kiểm hợp lệ giống thẻ form trong tin (shared/messaging/types/form.tsx)
// vì đây chính là "phiên bản trang" của cùng loại tin đó.
const FIELD_TYPES: FormFieldType[] = ['text', 'text_area', 'email', 'phone', 'select', 'date'];

const INPUT_TYPE: Record<FormFieldType, string> = {
    text: 'text',
    text_area: 'text',
    email: 'email',
    phone: 'tel',
    select: 'text',
    date: 'date',
};

function parseFields(data: Record<string, unknown>): FormField[] {
    return (records(data.items) ?? []).flatMap(raw => {
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
}

const valid = (field: FormField, value: string): boolean => {
    if (value === '') return !field.required;
    if (field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (field.type === 'phone') return /^\+?[0-9][0-9 .-]{7,18}[0-9]$/.test(value);

    return true;
};

export default function FormFlow({ flow, token, onSubmitted }: FlowPageProps) {
    const fields = parseFields(flow.data);
    const baseId = useId();
    const formId = `${baseId}-form`;
    const [values, setValues] = useState<Record<string, string>>({});
    const [invalid, setInvalid] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const wrong = fields.find(field => !valid(field, (values[field.name] ?? '').trim()));

        if (wrong) {
            setInvalid(wrong.name);

            return;
        }

        setInvalid(null);
        setSending(true);
        setError('');

        const submitted = fields.flatMap(field =>
            (values[field.name] ?? '').trim() ? [{ name: field.name, value: values[field.name].trim() }] : [],
        );

        try {
            await submitFlow(token, { submitted_values: submitted });
            onSubmitted();
        } catch {
            setError(t('FLOWS.send_failed'));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <form id={formId} className="flow-body" onSubmit={onSubmit} noValidate>
                {flow.subtitle ? <p className="flow-note">{flow.subtitle}</p> : null}
                {fields.map(field => {
                    const id = `${baseId}-${field.name}`;
                    const common = {
                        id,
                        className: 'mk-input',
                        placeholder: field.placeholder,
                        required: field.required,
                        disabled: sending,
                        'aria-invalid': invalid === field.name,
                        value: values[field.name] ?? '',
                        onChange: (event: { target: { value: string } }) =>
                            setValues(current => ({ ...current, [field.name]: event.target.value })),
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
                            ) : (
                                <input {...common} type={INPUT_TYPE[field.type]} inputMode={field.type === 'phone' ? 'tel' : undefined} />
                            )}
                            {invalid === field.name ? <span className="mk-error">{t('FLOWS.form.check_field', { field: field.label })}</span> : null}
                        </div>
                    );
                })}
                {error ? <p className="mk-error">{error}</p> : null}
            </form>
            <div className="flow-footer">
                <button type="submit" form={formId} className="mk-pill mk-pill--primary mk-pill--block" disabled={sending}>
                    {t('FLOWS.form.submit')}
                </button>
            </div>
        </>
    );
}
