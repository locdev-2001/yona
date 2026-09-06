import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { isValidURL } from 'dashboard/helper/URLHelper';
import { getRegexp } from 'shared/helpers/Validators';
import { t } from '../../../i18n';
import type { AttributeInputProps } from './types';

// Port từ components-next/CustomAttributes/OtherAttribute.vue (kiểu text/link/number).
const INPUT_TYPE_BY_ATTRIBUTE: Record<string, string> = { link: 'url', number: 'number' };

export default function OtherAttribute({ attribute, isEditingView = false, onUpdate, onDelete }: AttributeInputProps) {
    const [isEditingValue, setEditingValue] = useState(false);
    const [editedValue, setEditedValue] = useState(String(attribute.value ?? ''));
    const [touched, setTouched] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useClickAway(containerRef, () => setEditingValue(false), isEditingValue);

    const isLink = attribute.attributeDisplayType === 'link';
    const isText = attribute.attributeDisplayType === 'text';
    const isNumber = attribute.attributeDisplayType === 'number';

    const errorMessage = (): string => {
        if (!editedValue) {
            return isNumber
                ? t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_NUMBER')
                : t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.REQUIRED');
        }
        if (isLink && !isValidURL(editedValue)) {
            return t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_URL');
        }
        if (isText && attribute.regexPattern) {
            try {
                if (!getRegexp(attribute.regexPattern).test(editedValue)) {
                    return (
                        attribute.regexCue || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_INPUT')
                    );
                }
            } catch {
                return attribute.regexCue || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_INPUT');
            }
        }

        return '';
    };

    const message = touched ? errorMessage() : '';
    const hasError = Boolean(message);

    const startEditing = () => {
        setTouched(false);
        setEditedValue(String(attribute.value ?? ''));
        setEditingValue(true);
    };

    const handleInputUpdate = () => {
        setTouched(true);
        if (errorMessage()) return;
        onUpdate(editedValue);
        setEditingValue(false);
    };

    return (
        <div className={`flex items-center w-full min-w-0 gap-2 ${isEditingView ? 'justify-start' : 'justify-end'}`}>
            {!isEditingValue ? (
                <span
                    className={`min-w-0 text-sm ${
                        !isEditingView
                            ? 'cursor-pointer text-n-slate-11 hover:text-n-slate-12 py-2 select-none font-medium'
                            : isLink
                              ? 'truncate hover:text-n-brand text-n-blue-11'
                              : 'text-n-slate-12 truncate'
                    }`}
                    onClick={() => {
                        if (!isEditingView) startEditing();
                    }}
                >
                    {isLink && attribute.value && isEditingView ? (
                        <a
                            href={String(attribute.value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={event => event.stopPropagation()}
                        >
                            {String(attribute.value)}
                        </a>
                    ) : (
                        (attribute.value as string) || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.INPUT')
                    )}
                </span>
            ) : null}

            {isEditingView && !isEditingValue ? (
                <div className="flex items-center gap-1">
                    <Button
                        variant="faded"
                        color="slate"
                        icon="i-lucide-pencil"
                        size="xs"
                        className="flex-shrink-0 opacity-0 group-hover/attribute:opacity-100 hover:no-underline"
                        onClick={startEditing}
                    />
                    <Button
                        variant="faded"
                        color="ruby"
                        icon="i-lucide-trash"
                        size="xs"
                        className="flex-shrink-0 opacity-0 group-hover/attribute:opacity-100 hover:no-underline"
                        onClick={onDelete}
                    />
                </div>
            ) : null}

            {isEditingValue ? (
                <div ref={containerRef} className="flex items-center w-full">
                    <Input
                        value={editedValue}
                        placeholder={t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.INPUT')}
                        type={INPUT_TYPE_BY_ATTRIBUTE[attribute.attributeDisplayType] ?? 'text'}
                        className="w-full [&>p]:absolute [&>p]:mt-0.5 [&>p]:top-8 ltr:[&>p]:left-0 rtl:[&>p]:right-0"
                        autoFocus
                        message={message}
                        messageType={hasError ? 'error' : 'info'}
                        customInputClass="h-8 ltr:rounded-r-none rtl:rounded-l-none"
                        onChange={event => setEditedValue(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') handleInputUpdate();
                        }}
                    />
                    <Button
                        icon="i-lucide-check"
                        color={hasError ? 'ruby' : 'blue'}
                        size="sm"
                        className="flex-shrink-0 ltr:rounded-l-none rtl:rounded-r-none"
                        onClick={handleInputUpdate}
                    />
                </div>
            ) : null}
        </div>
    );
}
