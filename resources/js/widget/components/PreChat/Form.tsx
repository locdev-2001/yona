import { useId, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import Spinner from 'shared/components/Spinner';

import {
    buildPreChatSubmission,
    enabledPreChatFields,
    findFieldType,
    firstFailingRule,
} from '../../helpers/preChatHelpers';
import type { PreChatFormValues, PreChatSubmission, ValidationRule } from '../../helpers/preChatHelpers';
import { t } from '../../i18n';
import { useWidgetState } from '../../store/hooks';
import PhoneInput from '../Form/PhoneInput';
import type { PreChatField } from '../../types';

// Port từ widget/components/PreChat/Form.vue. FormKit không có bản React nên
// cây DOM `formkit-outer > formkit-wrapper > (label + formkit-inner)` +
// `ul.formkit-messages` được dựng tay đúng như FormKit sinh ra (đã đối chiếu
// DOM oracle), CSS trong widget.scss dùng chung.
const MESSAGE_FIELD: PreChatField = {
    name: 'message',
    type: 'textarea',
    label: '',
    required: true,
    enabled: true,
    field_type: 'standard',
};

// Ô Message khai `validation="required"` thẳng trong template bản gốc, không đi
// qua getValidation.
const MESSAGE_FIELD_RULES: ValidationRule[] = ['required'];

const INPUT_CLASS = 'mt-1 rounded w-full py-2 px-3';
const LABEL_CLASS = 'formkit-label text-sm font-medium text-n-slate-12';

// `validation-messages` của bản gốc.
const ruleMessage = (rule: ValidationRule, field: PreChatField): string => {
    switch (rule) {
        case 'startsWithPlus':
            return t('PRE_CHAT_FORM.FIELDS.PHONE_NUMBER.DIAL_CODE_VALID_ERROR');
        case 'isValidPhoneNumber':
            return t('PRE_CHAT_FORM.FIELDS.PHONE_NUMBER.VALID_ERROR');
        case 'email':
            return t('PRE_CHAT_FORM.FIELDS.EMAIL_ADDRESS.VALID_ERROR');
        case 'required':
        case 'accepted':
            return field.name === MESSAGE_FIELD.name
                ? t('PRE_CHAT_FORM.FIELDS.MESSAGE.ERROR')
                : t('PRE_CHAT_FORM.REQUIRED');
        case 'matches':
            return field.regex_cue ? field.regex_cue : t('PRE_CHAT_FORM.REGEX_ERROR');
        default:
            return t('PRE_CHAT_FORM.REGEX_ERROR');
    }
};

// family của FormKit — quyết định `.formkit-outer[data-type='checkbox']` trong CSS.
const familyOf = (type: string): string | undefined => {
    if (['text', 'email', 'url', 'date', 'number', 'tel'].includes(type)) return 'text';
    if (type === 'checkbox') return 'box';

    return undefined;
};

interface PreChatFormProps {
    preChatMessage?: string;
    preChatFields: PreChatField[];
    onSubmitPreChat: (submission: PreChatSubmission) => void;
}

export default function PreChatForm({ preChatMessage, preChatFields, onSubmitPreChat }: PreChatFormProps) {
    const isCreating = useWidgetState(state => state.uiFlags.isCreating);
    const contact = useWidgetState(state => state.contact);
    const preChatFormEnabled = useWidgetState(state => Boolean(state.channelConfig?.preChatFormEnabled));
    const hasActiveCampaign = useWidgetState(state => state.activeCampaign !== null);

    const [values, setValues] = useState<PreChatFormValues>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitted, setSubmitted] = useState(false);
    const formId = useId();

    const fields = useMemo(
        () => enabledPreChatFields(preChatFormEnabled ? preChatFields : [], contact),
        [preChatFormEnabled, preChatFields, contact],
    );
    // Chiến dịch đã mang sẵn nội dung nên bản gốc bỏ ô soạn tin trong form.
    const allFields = useMemo(
        () => (hasActiveCampaign ? fields : [...fields, MESSAGE_FIELD]),
        [fields, hasActiveCampaign],
    );

    const headerMessage = preChatFormEnabled
        ? (preChatMessage ?? '')
        : hasActiveCampaign
          ? t('PRE_CHAT_FORM.CAMPAIGN_HEADER')
          : '';
    const shouldShowHeaderMessage = hasActiveCampaign || (preChatFormEnabled && Boolean(headerMessage));

    const failingRuleFor = (field: PreChatField): ValidationRule | null =>
        firstFailingRule(
            field,
            String(values[field.name] ?? ''),
            field.name === MESSAGE_FIELD.name ? MESSAGE_FIELD_RULES : undefined,
        );

    const errorFor = (field: PreChatField): string | null => {
        if (!isSubmitted && !touched[field.name]) return null;
        const rule = failingRuleFor(field);

        return rule ? ruleMessage(rule, field) : null;
    };

    const onSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitted(true);
        const hasError = allFields.some(field => failingRuleFor(field) !== null);
        if (hasError) return;

        onSubmitPreChat(buildPreChatSubmission(fields, values));
    };

    const setValue = (name: string, value: string | boolean) =>
        setValues(current => ({ ...current, [name]: value }));

    const renderField = (field: PreChatField, index: number) => {
        const type = field.name === 'phoneNumber' ? 'phoneInput' : findFieldType(field.type);
        const error = errorFor(field);
        const inputId = `${formId}-${index}`;
        const label =
            field.name === MESSAGE_FIELD.name ? t('PRE_CHAT_FORM.FIELDS.MESSAGE.LABEL') : field.label;
        const placeholder =
            field.name === MESSAGE_FIELD.name
                ? t('PRE_CHAT_FORM.FIELDS.MESSAGE.PLACEHOLDER')
                : (field.placeholder ?? '');
        const inputClass = type === 'checkbox' ? '' : INPUT_CLASS;
        const value = String(values[field.name] ?? '');

        const input =
            type === 'phoneInput' ? (
                <PhoneInput
                    placeholder={placeholder}
                    hasError={Boolean(error)}
                    onChange={next => setValue(field.name, next)}
                    onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))}
                />
            ) : type === 'select' ? (
                <select
                    className={`formkit-input ${inputClass}`.trim()}
                    name={field.name}
                    id={inputId}
                    value={value}
                    aria-required={field.required || undefined}
                    onChange={event => setValue(field.name, event.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))}
                >
                    {(field.values ?? []).map((option, optionIndex) => (
                        <option key={option} value={String(optionIndex)}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : type === 'textarea' ? (
                <textarea
                    placeholder={placeholder || undefined}
                    className={`formkit-input ${inputClass}`.trim()}
                    name={field.name}
                    id={inputId}
                    value={value}
                    aria-required={field.required || undefined}
                    onChange={event => setValue(field.name, event.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))}
                />
            ) : type === 'checkbox' ? (
                <input
                    type="checkbox"
                    className={`formkit-input ${inputClass}`.trim()}
                    name={field.name}
                    id={inputId}
                    checked={values[field.name] === true}
                    aria-required={field.required || undefined}
                    onChange={event => setValue(field.name, event.target.checked)}
                    onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))}
                />
            ) : (
                <input
                    type={type}
                    placeholder={placeholder || undefined}
                    className={`formkit-input ${inputClass}`.trim()}
                    name={field.name}
                    id={inputId}
                    value={value}
                    aria-required={field.required || undefined}
                    onChange={event => setValue(field.name, event.target.value)}
                    onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))}
                />
            );

        return (
            <div
                key={field.name}
                className="formkit-outer"
                data-family={familyOf(type)}
                data-type={type === 'phoneInput' ? undefined : type}
                data-invalid={error ? 'true' : undefined}
            >
                <div className="formkit-wrapper">
                    <label className={LABEL_CLASS} htmlFor={inputId}>
                        {label}
                    </label>
                    <div className="formkit-inner">{input}</div>
                </div>
                {error ? (
                    <ul className="formkit-messages">
                        <li className="formkit-message" data-message-type="validation">
                            {error}
                        </li>
                    </ul>
                ) : null}
            </div>
        );
    };

    return (
        <form className="formkit-form flex flex-col flex-1 w-full p-6 overflow-y-auto" onSubmit={onSubmit}>
            {shouldShowHeaderMessage ? (
                <div
                    className="mb-4 text-base leading-5 text-n-slate-12 [&>p>.link]:text-n-blue-11 [&>p>.link]:hover:underline"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(new MessageFormatter(headerMessage, false).formattedMessage),
                    }}
                />
            ) : null}
            {fields.map(renderField)}
            {hasActiveCampaign ? null : renderField(MESSAGE_FIELD, fields.length)}

            <button
                className="py-3 px-4 rounded-lg shadow-sm leading-4 cursor-pointer disabled:opacity-50 w-full mt-3 mb-5 font-medium flex items-center justify-center gap-2 bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)]"
                disabled={isCreating}
            >
                {isCreating ? <Spinner className="p-0" /> : null}
                {t('START_CONVERSATION')}
            </button>
        </form>
    );
}
