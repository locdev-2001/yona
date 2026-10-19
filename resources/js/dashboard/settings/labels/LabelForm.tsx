import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import ModalHeader from 'dashboard/components/ModalHeader';
import WootInput from 'dashboard/components/widgets/forms/Input';
import ColorPicker from 'dashboard/components/widgets/ColorPicker';
import { getLabelTitleErrorMessageKey, isLabelTitleInvalid, normalizeLabelTitle } from './validations';

// Phần thân dùng chung của AddLabel.vue và EditLabel.vue (hai file gốc lặp
// nguyên khối form) — giữ nguyên DOM/class, khác nhau ở header + nhãn nút.
export interface LabelFormValues {
    title: string;
    description: string;
    color: string;
    show_on_sidebar: boolean;
}

interface LabelFormProps {
    headerTitle: string;
    headerContent?: string;
    submitLabel: string;
    initialValues: LabelFormValues;
    isSubmitting: boolean;
    onSubmit: (values: LabelFormValues) => void;
    onClose: () => void;
}

export default function LabelForm({
    headerTitle,
    headerContent = '',
    submitLabel,
    initialValues,
    isSubmitting,
    onSubmit,
    onClose,
}: LabelFormProps) {
    const [title, setTitle] = useState(initialValues.title);
    const [description, setDescription] = useState(initialValues.description);
    const [color, setColor] = useState(initialValues.color);
    const [showOnSidebar, setShowOnSidebar] = useState(initialValues.show_on_sidebar);
    const [isTitleTouched, setTitleTouched] = useState(false);

    const titleErrorKey = getLabelTitleErrorMessageKey(title);
    const titleError = isTitleTouched && titleErrorKey ? t(titleErrorKey) : '';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit({
            title: normalizeLabelTitle(title),
            description,
            color,
            show_on_sidebar: showOnSidebar,
        });
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={headerTitle} headerContent={headerContent} />
            <form className="flex flex-wrap mx-0" onSubmit={submit}>
                <WootInput
                    value={title}
                    className={`w-full ${titleError ? 'error' : ''}`}
                    label={t('LABEL_MGMT.FORM.NAME.LABEL')}
                    placeholder={t('LABEL_MGMT.FORM.NAME.PLACEHOLDER')}
                    error={titleError}
                    onChange={value => {
                        setTitle(value);
                        setTitleTouched(true);
                    }}
                    onBlur={() => setTitleTouched(true)}
                />

                <WootInput
                    value={description}
                    className="w-full"
                    label={t('LABEL_MGMT.FORM.DESCRIPTION.LABEL')}
                    placeholder={t('LABEL_MGMT.FORM.DESCRIPTION.PLACEHOLDER')}
                    onChange={setDescription}
                />

                <div className="w-full">
                    <label>
                        {t('LABEL_MGMT.FORM.COLOR.LABEL')}
                        <ColorPicker value={color} onChange={setColor} />
                    </label>
                </div>
                <div className="flex items-center w-full gap-2">
                    <input
                        type="checkbox"
                        value="true"
                        checked={showOnSidebar}
                        onChange={event => setShowOnSidebar(event.target.checked)}
                    />
                    <label htmlFor="conversation_creation">
                        {t('LABEL_MGMT.FORM.SHOW_ON_SIDEBAR.LABEL')}
                    </label>
                </div>
                <div className="flex items-center justify-end w-full gap-2 px-0 py-2">
                    <Button
                        faded
                        slate
                        type="reset"
                        label={t('LABEL_MGMT.FORM.CANCEL')}
                        onClick={event => {
                            event.preventDefault();
                            onClose();
                        }}
                    />
                    <Button
                        type="submit"
                        data-testid="label-submit"
                        label={submitLabel}
                        disabled={isLabelTitleInvalid(title) || isSubmitting}
                        isLoading={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}
