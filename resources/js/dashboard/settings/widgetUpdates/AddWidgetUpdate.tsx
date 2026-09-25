import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { createWidgetUpdate, publishWidgetUpdate } from './api';
import WidgetUpdateForm from './WidgetUpdateForm';
import type { WidgetUpdate, WidgetUpdateFormValues } from './types';

const EMPTY_VALUES: WidgetUpdateFormValues = {
    title: '',
    body: '',
    tag: 'notice',
    coverUrl: '',
    ctaLabel: '',
    ctaUrl: '',
    inboxId: null,
};

interface AddWidgetUpdateProps {
    accountId: number;
    onClose: () => void;
    onCreated: (update: WidgetUpdate) => void;
}

export default function AddWidgetUpdate({ accountId, onClose, onCreated }: AddWidgetUpdateProps) {
    const [isSavingDraft, setSavingDraft] = useState(false);
    const [isPublishing, setPublishing] = useState(false);

    const saveDraft = async (values: WidgetUpdateFormValues) => {
        setSavingDraft(true);
        try {
            const update = await createWidgetUpdate(accountId, values);
            onCreated(update);
            useAlert(t('WIDGET_UPDATES_MGMT.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('WIDGET_UPDATES_MGMT.ADD.API.ERROR_MESSAGE'));
        } finally {
            setSavingDraft(false);
        }
    };

    const publish = async (values: WidgetUpdateFormValues) => {
        setPublishing(true);
        try {
            const created = await createWidgetUpdate(accountId, values);
            const published = await publishWidgetUpdate(accountId, created.id);
            onCreated(published);
            useAlert(t('WIDGET_UPDATES_MGMT.PUBLISH.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('WIDGET_UPDATES_MGMT.PUBLISH.API.ERROR_MESSAGE'));
        } finally {
            setPublishing(false);
        }
    };

    return (
        <WidgetUpdateForm
            headerTitle={t('WIDGET_UPDATES_MGMT.ADD.TITLE')}
            headerContent={t('WIDGET_UPDATES_MGMT.ADD.DESC')}
            initialValues={EMPTY_VALUES}
            isSavingDraft={isSavingDraft}
            isPublishing={isPublishing}
            onSaveDraft={values => void saveDraft(values)}
            onPublish={values => void publish(values)}
            onClose={onClose}
        />
    );
}
