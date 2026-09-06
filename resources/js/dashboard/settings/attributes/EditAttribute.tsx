import { useState } from 'react';
import type { FormEvent } from 'react';

import ModalHeader from 'dashboard/components/ModalHeader';
import { useAlert } from 'dashboard/composables/useAlert';
import { updateCustomAttribute } from 'dashboard/composables/useCustomAttributes';
import type { CustomAttributeDefinition } from 'dashboard/composables/useCustomAttributes';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { getRegexp, normalizeRegexPattern } from 'shared/helpers/Validators';
import { t } from '../../../i18n';
import { attributeTypeIdOf } from './constants';
import AttributeForm, { AttributeFormActions, isAttributeFormInvalid } from './AttributeForm';
import type { AttributeFormValue } from './AttributeForm';

// Port từ routes/dashboard/settings/attributes/EditAttribute.vue.
// Khác gốc: bỏ ô "Key" (ở gốc là ô readonly) — xem note e1-fe.
interface EditAttributeProps {
    accountId: number;
    selectedAttribute: CustomAttributeDefinition;
    isUpdating: boolean;
    onClose: () => void;
}

const formValuesOf = (attribute: CustomAttributeDefinition): AttributeFormValue => {
    const regexPattern = attribute.regex_pattern ? getRegexp(attribute.regex_pattern).toString() : '';

    return {
        displayName: attribute.attribute_display_name,
        description: attribute.attribute_description ?? '',
        attributeType: attributeTypeIdOf(attribute.attribute_display_type),
        values: attribute.attribute_values ?? [],
        regexEnabled: Boolean(regexPattern),
        regexPattern,
        regexCue: attribute.regex_cue ?? '',
    };
};

export default function EditAttribute({ accountId, selectedAttribute, isUpdating, onClose }: EditAttributeProps) {
    const [form, setForm] = useState<AttributeFormValue>(() => formValuesOf(selectedAttribute));
    const [showErrors, setShowErrors] = useState(false);

    const editAttribute = async (event: FormEvent) => {
        event.preventDefault();
        setShowErrors(true);
        if (isAttributeFormInvalid(form)) return;

        try {
            await updateCustomAttribute(accountId, selectedAttribute.id, {
                attribute_display_name: form.displayName,
                attribute_description: form.description,
                attribute_values: form.values,
                regex_pattern: form.regexEnabled ? normalizeRegexPattern(form.regexPattern) : null,
                regex_cue: form.regexEnabled ? form.regexCue || null : null,
            });
            useAlert(t('ATTRIBUTES_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('ATTRIBUTES_MGMT.EDIT.API.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader
                headerTitle={`${t('ATTRIBUTES_MGMT.EDIT.TITLE')} - ${selectedAttribute.attribute_display_name}`}
            />
            <form className="flex flex-col w-full" onSubmit={editAttribute}>
                <div className="w-full">
                    <AttributeForm
                        value={form}
                        onChange={setForm}
                        showErrors={showErrors}
                        typeDisabled
                        listLabel={t('ATTRIBUTES_MGMT.EDIT.TYPE.LIST.LABEL')}
                    />
                </div>
                <AttributeFormActions
                    submitLabel={t('ATTRIBUTES_MGMT.EDIT.UPDATE_BUTTON_TEXT')}
                    disabled={isAttributeFormInvalid(form)}
                    isLoading={isUpdating}
                    onCancel={onClose}
                />
            </form>
        </div>
    );
}
