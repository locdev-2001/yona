import { useState } from 'react';
import type { ReactNode } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import WootInput from 'dashboard/components/widgets/forms/Input';
import { t } from '../../../i18n';
import { ATTRIBUTE_TYPES, ATTRIBUTE_TYPE_LIST, ATTRIBUTE_TYPE_TEXT } from './constants';

// Thân form dùng chung của AddAttribute.vue và EditAttribute.vue (hai file gốc
// lặp gần như nguyên khối: tên, mô tả, kiểu, danh sách giá trị, regex).
// Khác gốc theo lệnh founder: KHÔNG có ô "Key" — backend tự sinh key từ tên.
export interface AttributeFormValue {
    displayName: string;
    description: string;
    attributeType: number;
    values: string[];
    regexEnabled: boolean;
    regexPattern: string;
    regexCue: string;
}

export const emptyAttributeForm = (): AttributeFormValue => ({
    displayName: '',
    description: '',
    attributeType: ATTRIBUTE_TYPE_TEXT,
    values: [],
    regexEnabled: false,
    regexPattern: '',
    regexCue: '',
});

interface AttributeFormProps {
    value: AttributeFormValue;
    onChange: (value: AttributeFormValue) => void;
    // Bản Edit khoá ô kiểu (select disabled) và đổi nhãn danh sách giá trị.
    typeDisabled?: boolean;
    listLabel: string;
    showErrors: boolean;
    // Ô "Applies to" chỉ có ở màn thêm mới.
    modelField?: ReactNode;
}

export const isAttributeFormInvalid = (value: AttributeFormValue): boolean =>
    !value.displayName.trim() ||
    !value.description.trim() ||
    (value.attributeType === ATTRIBUTE_TYPE_LIST && value.values.length === 0);

export default function AttributeForm({
    value,
    onChange,
    typeDisabled = false,
    listLabel,
    showErrors,
    modelField,
}: AttributeFormProps) {
    const [tagInputTouched, setTagInputTouched] = useState(false);
    const [nameTouched, setNameTouched] = useState(false);
    const [descriptionTouched, setDescriptionTouched] = useState(false);

    // Vuelidate của gốc chỉ hiện lỗi sau khi ô mất focus ($touch trên @blur).
    const showNameError = (showErrors || nameTouched) && !value.displayName.trim();
    const showDescriptionError = (showErrors || descriptionTouched) && !value.description.trim();

    const isAttributeTypeList = value.attributeType === ATTRIBUTE_TYPE_LIST;
    const isAttributeTypeText = value.attributeType === ATTRIBUTE_TYPE_TEXT;
    const isTagInputEmpty = isAttributeTypeList && value.values.length === 0;
    const isTagInputInvalid = tagInputTouched && isTagInputEmpty;

    const patch = (changes: Partial<AttributeFormValue>) => onChange({ ...value, ...changes });

    // watch(attributeType) của gốc: đổi kiểu thì xoá danh sách giá trị.
    const onAttributeTypeChange = (attributeType: number) => {
        setTagInputTouched(false);
        patch({ attributeType, values: [] });
    };

    return (
        <>
            {modelField}
            <WootInput
                value={value.displayName}
                label={t('ATTRIBUTES_MGMT.ADD.FORM.NAME.LABEL')}
                type="text"
                className={showNameError ? 'error' : ''}
                error={showNameError ? t('ATTRIBUTES_MGMT.ADD.FORM.NAME.ERROR') : ''}
                placeholder={t('ATTRIBUTES_MGMT.ADD.FORM.NAME.PLACEHOLDER')}
                onChange={displayName => patch({ displayName })}
                onBlur={() => setNameTouched(true)}
            />
            <label className={showDescriptionError ? 'error' : ''}>
                {t('ATTRIBUTES_MGMT.ADD.FORM.DESC.LABEL')}
                <textarea
                    rows={typeDisabled ? 5 : 3}
                    value={value.description}
                    placeholder={t('ATTRIBUTES_MGMT.ADD.FORM.DESC.PLACEHOLDER')}
                    onChange={event => patch({ description: event.target.value })}
                    onBlur={() => setDescriptionTouched(true)}
                />
                {showDescriptionError ? (
                    <span className="message">{t('ATTRIBUTES_MGMT.ADD.FORM.DESC.ERROR')}</span>
                ) : null}
            </label>
            <label>
                {t('ATTRIBUTES_MGMT.ADD.FORM.TYPE.LABEL')}
                <select
                    value={value.attributeType}
                    disabled={typeDisabled}
                    onChange={event => onAttributeTypeChange(Number(event.target.value))}
                >
                    {ATTRIBUTE_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                            {t(`ATTRIBUTES_MGMT.ATTRIBUTE_TYPES.${type.key}`)}
                        </option>
                    ))}
                </select>
            </label>
            {isAttributeTypeList ? (
                <div className="mb-4">
                    <label className="mb-1 block">{listLabel}</label>
                    <div
                        className={`rounded-xl px-3 py-2 ${isTagInputInvalid ? 'field-invalid' : 'field-surface'}`}
                    >
                        <TagInput
                            value={value.values}
                            placeholder={t('ATTRIBUTES_MGMT.ADD.FORM.TYPE.LIST.PLACEHOLDER')}
                            allowCreate
                            showDropdown={false}
                            onCreate={tag => patch({ values: [...value.values, tag] })}
                            onRemove={index => patch({ values: value.values.filter((_, at) => at !== index) })}
                            onBlur={() => setTagInputTouched(true)}
                        />
                    </div>
                    {isTagInputInvalid ? (
                        <label className="text-n-ruby-9 text-sm font-normal mt-1">
                            {t('ATTRIBUTES_MGMT.ADD.FORM.TYPE.LIST.ERROR')}
                        </label>
                    ) : null}
                </div>
            ) : null}
            {isAttributeTypeText ? (
                <div>
                    <input
                        type="checkbox"
                        checked={value.regexEnabled}
                        onChange={() => patch({ regexEnabled: !value.regexEnabled })}
                    />{' '}
                    {t('ATTRIBUTES_MGMT.ADD.FORM.ENABLE_REGEX.LABEL')}
                </div>
            ) : null}
            {isAttributeTypeText && value.regexEnabled ? (
                <>
                    <WootInput
                        value={value.regexPattern}
                        label={t('ATTRIBUTES_MGMT.ADD.FORM.REGEX_PATTERN.LABEL')}
                        type="text"
                        placeholder={t('ATTRIBUTES_MGMT.ADD.FORM.REGEX_PATTERN.PLACEHOLDER')}
                        onChange={regexPattern => patch({ regexPattern })}
                    />
                    <WootInput
                        value={value.regexCue}
                        label={t('ATTRIBUTES_MGMT.ADD.FORM.REGEX_CUE.LABEL')}
                        type="text"
                        placeholder={t('ATTRIBUTES_MGMT.ADD.FORM.REGEX_CUE.PLACEHOLDER')}
                        onChange={regexCue => patch({ regexCue })}
                    />
                </>
            ) : null}
        </>
    );
}

// Nút Cancel + Submit của cả hai modal (cùng thứ tự, cùng biến thể như gốc).
export function AttributeFormActions({
    submitLabel,
    disabled,
    isLoading = false,
    onCancel,
}: {
    submitLabel: string;
    disabled: boolean;
    isLoading?: boolean;
    onCancel: () => void;
}) {
    return (
        <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
            <NextButton
                faded
                slate
                type="reset"
                label={t('ATTRIBUTES_MGMT.ADD.CANCEL_BUTTON_TEXT')}
                onClick={event => {
                    event.preventDefault();
                    onCancel();
                }}
            />
            <NextButton type="submit" label={submitLabel} isLoading={isLoading} disabled={disabled} />
        </div>
    );
}
