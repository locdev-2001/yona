import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';

import NextButton from 'dashboard/components-next/button/Button';
import HelperTextPopup from 'dashboard/components/ui/HelperTextPopup';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { isValidURL } from 'dashboard/helper/URLHelper';
import MultiselectDropdown from 'shared/components/ui/MultiselectDropdown';
import { getRegexp } from 'shared/helpers/Validators';
import { t } from '../../i18n';

// Port từ dashboard/components/CustomAttribute.vue — dòng thuộc tính tuỳ biến
// trong panel hội thoại (xem/sửa/xoá/copy tại chỗ).
// Khác gốc: bỏ BUS_EVENTS.FOCUS_CUSTOM_ATTRIBUTE (chỉ dùng cho luồng "thuộc tính
// bắt buộc khi resolve" — tính năng trả phí chưa port, xem D3 note #2).
const DATE_FORMAT = 'yyyy-MM-dd';

export type CustomAttributeValue = string | number | boolean;

interface CustomAttributeProps {
    label: string;
    attributeKey: string;
    description?: string | null;
    values?: string[];
    value?: CustomAttributeValue;
    showActions?: boolean;
    attributeType?: string;
    attributeRegex?: string | null;
    regexCue?: string | null;
    onUpdate: (key: string, value: CustomAttributeValue) => void;
    onDelete: (key: string) => void;
    onCopy: (value: CustomAttributeValue) => void;
}

export default function CustomAttribute({
    label,
    attributeKey,
    description = '',
    values = [],
    value = '',
    showActions = false,
    attributeType = 'text',
    attributeRegex = null,
    regexCue = null,
    onUpdate,
    onDelete,
    onCopy,
}: CustomAttributeProps) {
    const isAttributeTypeCheckbox = attributeType === 'checkbox';
    const isAttributeTypeList = attributeType === 'list';
    const isAttributeTypeLink = attributeType === 'link';
    const isAttributeTypeDate = attributeType === 'date';

    const formattedValue = isAttributeTypeDate
        ? format(value ? new Date(String(value)) : new Date(), DATE_FORMAT)
        : String(value ?? '');

    const [isEditing, setIsEditing] = useState(false);
    const [editedValue, setEditedValue] = useState(formattedValue);
    const [touched, setTouched] = useState(false);
    const editRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // watch(value) của gốc: giá trị mới từ server đóng ô sửa và nạp lại nội dung.
    useEffect(() => {
        setIsEditing(false);
        setEditedValue(formattedValue);
        setTouched(false);
    }, [formattedValue]);

    const validationError = (): string | null => {
        if (!editedValue) return t('CUSTOM_ATTRIBUTES.VALIDATIONS.REQUIRED');
        if (isAttributeTypeLink && !isValidURL(editedValue)) {
            return t('CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_URL');
        }
        if (attributeRegex) {
            try {
                if (!getRegexp(attributeRegex).test(editedValue)) {
                    return regexCue || t('CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_INPUT');
                }
            } catch {
                return regexCue || t('CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_INPUT');
            }
        }

        return null;
    };

    const errorMessage = touched ? validationError() : null;

    const closeEditing = () => {
        setTouched(false);
        setIsEditing(false);
    };

    useClickAway(editRef, closeEditing, isEditing);

    const hasValue = value !== null && value !== '';
    const displayValue = isAttributeTypeDate
        ? value
            ? new Date(String(value)).toLocaleDateString()
            : '---'
        : isAttributeTypeCheckbox
          ? value === 'false'
              ? false
              : value
          : hasValue
            ? value
            : '---';

    const submitUpdate = () => {
        setTouched(true);
        if (validationError()) return;
        setIsEditing(false);
        onUpdate(attributeKey, isAttributeTypeDate ? new Date(editedValue).toISOString() : editedValue);
    };

    return (
        <div className="px-4 py-3">
            <div className="flex items-center mb-1">
                <h4 className="flex items-center w-full m-0 text-sm error">
                    {isAttributeTypeCheckbox ? (
                        <div className="flex items-center">
                            <input
                                className="!my-0 ltr:mr-2 ltr:ml-0 rtl:mr-0 rtl:ml-2"
                                type="checkbox"
                                checked={Boolean(value) && value !== 'false'}
                                onChange={event => onUpdate(attributeKey, event.target.checked)}
                            />
                        </div>
                    ) : null}
                    <div className="flex items-center justify-between w-full">
                        <span
                            className={`w-full inline-flex gap-1.5 items-start font-medium whitespace-nowrap text-sm mb-0 ${
                                errorMessage ? 'text-n-ruby-11' : 'text-n-slate-12'
                            }`}
                        >
                            {label}
                            {description ? <HelperTextPopup message={description} className="mt-0.5" /> : null}
                        </span>
                        {showActions && hasValue ? (
                            <NextButton
                                title={t('CUSTOM_ATTRIBUTES.ACTIONS.DELETE')}
                                slate
                                sm
                                link
                                icon="i-lucide-trash-2"
                                onClick={() => {
                                    setIsEditing(false);
                                    onDelete(attributeKey);
                                }}
                            />
                        ) : null}
                    </div>
                </h4>
            </div>
            {!isAttributeTypeCheckbox && !isAttributeTypeList ? (
                <div>
                    {isEditing ? (
                        <div ref={editRef}>
                            <div className="flex items-center w-full mb-2">
                                <input
                                    ref={inputRef}
                                    value={editedValue}
                                    type={isAttributeTypeLink ? 'url' : attributeType}
                                    className={`!h-8 ltr:!rounded-r-none rtl:!rounded-l-none !mb-0 !text-sm ${
                                        errorMessage ? 'error' : ''
                                    }`}
                                    autoFocus
                                    onChange={event => setEditedValue(event.target.value)}
                                    onBlur={() => setTouched(true)}
                                    onKeyUp={event => {
                                        if (event.key === 'Enter') submitUpdate();
                                    }}
                                />
                                <div>
                                    <NextButton
                                        sm
                                        icon="i-lucide-check"
                                        className="ltr:rounded-l-none rtl:rounded-r-none h-[34px]"
                                        onClick={submitUpdate}
                                    />
                                </div>
                            </div>
                            {errorMessage ? (
                                <span className="block w-full -mt-px text-sm font-normal text-n-ruby-11">
                                    {errorMessage}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                    <div className={`flex group ${isEditing ? 'hidden' : ''} ${showActions ? 'is-editable' : ''}`}>
                        {isAttributeTypeLink ? (
                            <a
                                href={isValidURL(String(value)) ? String(value) : ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group-hover:bg-n-slate-3 inline-block rounded-sm mb-0 break-all py-0.5 px-1"
                            >
                                {isValidURL(String(value)) ? String(value) : '---'}
                            </a>
                        ) : (
                            <p className="group-hover:bg-n-slate-3 inline-block rounded-sm mb-0 break-all py-0.5 px-1">
                                {String(displayValue)}
                            </p>
                        )}
                        <div className="flex items-center max-w-[2rem] gap-1 ml-1 rtl:mr-1 rtl:ml-0">
                            {showActions && hasValue ? (
                                <NextButton
                                    title={t('CUSTOM_ATTRIBUTES.ACTIONS.COPY')}
                                    xs
                                    slate
                                    ghost
                                    icon="i-lucide-clipboard"
                                    className="hidden group-hover:flex flex-shrink-0"
                                    onClick={() => onCopy(value)}
                                />
                            ) : null}
                            {showActions ? (
                                <NextButton
                                    title={t('CUSTOM_ATTRIBUTES.ACTIONS.EDIT')}
                                    xs
                                    slate
                                    ghost
                                    icon="i-lucide-pen"
                                    className="hidden group-hover:flex flex-shrink-0"
                                    onClick={() => {
                                        setIsEditing(true);
                                        requestAnimationFrame(() => inputRef.current?.focus());
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
            {isAttributeTypeList ? (
                <div className="[&_.selector-wrap]:m-0 [&_.selector-wrap]:top-1 [&_.selector-name]:ml-0 [&_.name]:ml-0">
                    <MultiselectDropdown
                        options={values.map((item, index) => ({ id: index + 1, name: item }))}
                        selectedItem={{ id: values.indexOf(String(value)) + 1, name: String(value ?? '') }}
                        hasThumbnail={false}
                        multiselectorPlaceholder={t('CUSTOM_ATTRIBUTES.FORM.ATTRIBUTE_TYPE.LIST.PLACEHOLDER')}
                        noSearchResult={t('CUSTOM_ATTRIBUTES.FORM.ATTRIBUTE_TYPE.LIST.NO_RESULT')}
                        inputPlaceholder={t('CUSTOM_ATTRIBUTES.FORM.ATTRIBUTE_TYPE.LIST.SEARCH_INPUT_PLACEHOLDER')}
                        onSelect={option => {
                            if (option?.name) onUpdate(attributeKey, option.name);
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}
