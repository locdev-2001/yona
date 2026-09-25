import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { publishWidgetUpdate, updateWidgetUpdate } from './api';
import WidgetUpdateForm from './WidgetUpdateForm';
import type { WidgetUpdate, WidgetUpdateFormValues } from './types';

function valuesFromUpdate(update: WidgetUpdate): WidgetUpdateFormValues {
    return {
        title: update.title,
        body: update.body ?? '',
        tag: update.tag,
        coverUrl: update.cover_url ?? '',
        ctaLabel: update.cta_label ?? '',
        ctaUrl: update.cta_url ?? '',
        inboxId: update.inbox?.id ?? null,
    };
}

interface EditWidgetUpdateProps {
    accountId: number;
    update: WidgetUpdate;
    onClose: () => void;
    onUpdated: (update: WidgetUpdate) => void;
}

export default function EditWidgetUpdate({ accountId, update, onClose, onUpdated }: EditWidgetUpdateProps) {
    const [isSavingDraft, setSavingDraft] = useState(false);
    const [isPublishing, setPublishing] = useState(false);

    // "Lưu nháp" khi sửa chỉ cập nhật nội dung, không đụng vào trạng thái đăng
    // hiện có (bài đã đăng thì vẫn đăng, bài nháp thì vẫn nháp).
    const saveDraft = async (values: WidgetUpdateFormValues) => {
        setSavingDraft(true);
        try {
            const saved = await updateWidgetUpdate(accountId, update.id, values);
            onUpdated(saved);
            useAlert(t('WIDGET_UPDATES_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('WIDGET_UPDATES_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setSavingDraft(false);
        }
    };

    const publish = async (values: WidgetUpdateFormValues) => {
        setPublishing(true);
        try {
            await updateWidgetUpdate(accountId, update.id, values);
            const published = await publishWidgetUpdate(accountId, update.id);
            onUpdated(published);
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
            headerTitle={`${t('WIDGET_UPDATES_MGMT.EDIT.TITLE')} - ${update.title}`}
            initialValues={valuesFromUpdate(update)}
            isSavingDraft={isSavingDraft}
            isPublishing={isPublishing}
            onSaveDraft={values => void saveDraft(values)}
            onPublish={values => void publish(values)}
            onClose={onClose}
        />
    );
}
