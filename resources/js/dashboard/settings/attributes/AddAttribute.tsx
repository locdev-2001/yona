import { useState } from 'react';
import type { FormEvent } from 'react';

import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import { useAlert } from 'dashboard/composables/useAlert';
import { createCustomAttribute, useCustomAttributeUiFlags } from 'dashboard/composables/useCustomAttributes';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../../i18n';
import { ATTRIBUTE_MODELS } from './constants';
import AttributeForm, { AttributeFormActions, emptyAttributeForm, isAttributeFormInvalid } from './AttributeForm';
import type { AttributeFormValue } from './AttributeForm';

// Port từ routes/dashboard/settings/attributes/AddAttribute.vue.
// Khác gốc: bỏ ô "Key" (backend tự sinh key từ tên) — xem note e1-fe.
interface AddAttributeProps {
    show: boolean;
    accountId: number;
    selectedAttributeModelTab: number;
    onClose: () => void;
}

export default function AddAttribute({ show, accountId, selectedAttributeModelTab, onClose }: AddAttributeProps) {
    const uiFlags = useCustomAttributeUiFlags();
    const [form, setForm] = useState<AttributeFormValue>(emptyAttributeForm);
    const [attributeModel, setAttributeModel] = useState(selectedAttributeModelTab || 0);
    const [showErrors, setShowErrors] = useState(false);

    const addAttribute = async (event: FormEvent) => {
        event.preventDefault();
        setShowErrors(true);
        if (isAttributeFormInvalid(form)) return;

        try {
            await createCustomAttribute(accountId, {
                attribute_display_name: form.displayName,
                attribute_description: form.description,
                attribute_model: attributeModel,
                attribute_display_type: form.attributeType,
                attribute_values: form.values,
                regex_pattern: form.regexEnabled ? form.regexPattern || null : null,
                regex_cue: form.regexEnabled ? form.regexCue || null : null,
            });
            useAlert(t('ATTRIBUTES_MGMT.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('ATTRIBUTES_MGMT.ADD.API.ERROR_MESSAGE'));
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div className="flex flex-col h-auto overflow-auto">
                <ModalHeader headerTitle={t('ATTRIBUTES_MGMT.ADD.TITLE')} />
                <form className="flex w-full" onSubmit={addAttribute}>
                    <div className="w-full">
                        <AttributeForm
                            value={form}
                            onChange={setForm}
                            showErrors={showErrors}
                            listLabel={t('ATTRIBUTES_MGMT.ADD.FORM.TYPE.LIST.LABEL')}
                            modelField={
                                <label>
                                    {t('ATTRIBUTES_MGMT.ADD.FORM.MODEL.LABEL')}
                                    <select
                                        value={attributeModel}
                                        onChange={event => setAttributeModel(Number(event.target.value))}
                                    >
                                        {ATTRIBUTE_MODELS.map(model => (
                                            <option key={model.id} value={model.id}>
                                                {t(`ATTRIBUTES_MGMT.ATTRIBUTE_MODELS.${model.key}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            }
                        />
                        <AttributeFormActions
                            submitLabel={t('ATTRIBUTES_MGMT.ADD.SUBMIT')}
                            disabled={isAttributeFormInvalid(form) || uiFlags.isCreating}
                            onCancel={onClose}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );
}
