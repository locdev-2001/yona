import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import type { AttributeInputProps } from './types';

// Port từ components-next/CustomAttributes/DateAttribute.vue
const toDateInputValue = (value: unknown): string => {
    if (!value) return '';
    const parsed = new Date(String(value));

    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export default function DateAttribute({ attribute, isEditingView = false, onUpdate, onDelete }: AttributeInputProps) {
    const [isEditingValue, setEditingValue] = useState(false);
    const [editedValue, setEditedValue] = useState(() => toDateInputValue(attribute.value));
    const [touched, setTouched] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useClickAway(containerRef, () => setEditingValue(false), isEditingValue);

    const hasError = touched && (!editedValue || Number.isNaN(new Date(editedValue).getTime()));
    const formattedDate = attribute.value
        ? new Date(String(attribute.value)).toLocaleDateString()
        : t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.INPUT');

    const startEditing = () => {
        setTouched(false);
        setEditedValue(toDateInputValue(attribute.value) || new Date().toISOString().slice(0, 10));
        setEditingValue(true);
    };

    const handleInputUpdate = () => {
        setTouched(true);
        if (!editedValue || Number.isNaN(new Date(editedValue).getTime())) return;
        onUpdate(new Date(editedValue).toISOString());
        setEditingValue(false);
    };

    return (
        <div className={`flex items-center w-full min-w-0 gap-2 ${isEditingView ? 'justify-start' : 'justify-end'}`}>
            {!isEditingValue ? (
                <span
                    className={`min-w-0 text-sm ${
                        isEditingView
                            ? 'text-n-slate-12 truncate'
                            : 'cursor-pointer text-n-slate-11 hover:text-n-slate-12 py-2 select-none font-medium'
                    }`}
                    onClick={() => {
                        if (!isEditingView) startEditing();
                    }}
                >
                    {formattedDate}
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
                        type="date"
                        className="w-full [&>p]:absolute [&>p]:mt-0.5 [&>p]:top-8 ltr:[&>p]:left-0 rtl:[&>p]:right-0"
                        message={hasError ? t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_DATE') : ''}
                        messageType={hasError ? 'error' : 'info'}
                        autoFocus
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
