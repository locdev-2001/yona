import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson, postJson } from 'dashboard/helper/apiClient';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import WootInput from 'dashboard/components/widgets/forms/Input';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardApp } from './types';
import { isUrlInvalid } from 'shared/helpers/Validators';

// Port từ dashboard/routes/dashboard/settings/integrations/DashboardApps/DashboardAppModal.vue.
interface DashboardAppModalProps {
    accountId: number;
    show: boolean;
    mode: 'CREATE' | 'UPDATE';
    selectedApp: DashboardApp | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function DashboardAppModal({
    accountId,
    show,
    mode,
    selectedApp,
    onClose,
    onSaved,
}: DashboardAppModalProps) {
    const [title, setTitle] = useState(mode === 'UPDATE' ? (selectedApp?.title ?? '') : '');
    const [url, setUrl] = useState(mode === 'UPDATE' ? (selectedApp?.content?.[0]?.url ?? '') : '');
    const [isTitleTouched, setTitleTouched] = useState(false);
    const [isUrlTouched, setUrlTouched] = useState(false);
    const [isLoading, setLoading] = useState(false);

    const titleError = !title.trim();
    const urlError = isUrlInvalid(url);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setTitleTouched(true);
        setUrlTouched(true);
        if (titleError || urlError) return;

        const payload = { title, content: [{ type: 'frame', url }] };
        setLoading(true);
        try {
            if (mode === 'UPDATE') {
                await patchJson(`/api/v1/accounts/${accountId}/dashboard_apps/${selectedApp!.id}`, payload);
            } else {
                await postJson(`/api/v1/accounts/${accountId}/dashboard_apps`, payload);
            }
            useAlert(t(`INTEGRATION_SETTINGS.DASHBOARD_APPS.${mode}.API_SUCCESS`));
            onSaved();
            onClose();
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) || t(`INTEGRATION_SETTINGS.DASHBOARD_APPS.${mode}.API_ERROR`),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div className="flex flex-col h-auto overflow-auto">
                <ModalHeader headerTitle={t(`INTEGRATION_SETTINGS.DASHBOARD_APPS.${mode}.HEADER`)} />
                <form className="w-full" onSubmit={event => void submit(event)}>
                    <WootInput
                        className={`w-full ${isTitleTouched && titleError ? 'error' : ''}`}
                        value={title}
                        label={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.TITLE_LABEL')}
                        placeholder={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.TITLE_PLACEHOLDER')}
                        error={isTitleTouched && titleError ? t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.TITLE_ERROR') : ''}
                        onChange={value => {
                            setTitle(value);
                            setTitleTouched(true);
                        }}
                        onBlur={() => setTitleTouched(true)}
                    />
                    <WootInput
                        className={`w-full ${isUrlTouched && urlError ? 'error' : ''}`}
                        value={url}
                        label={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.URL_LABEL')}
                        placeholder={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.URL_PLACEHOLDER')}
                        error={isUrlTouched && urlError ? t('INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.URL_ERROR') : ''}
                        onChange={value => {
                            setUrl(value);
                            setUrlTouched(true);
                        }}
                        onBlur={() => setUrlTouched(true)}
                    />
                    <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                        <Button
                            faded
                            slate
                            type="reset"
                            label={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.CREATE.FORM_CANCEL')}
                            onClick={event => {
                                event.preventDefault();
                                onClose();
                            }}
                        />
                        <Button
                            type="submit"
                            label={t(`INTEGRATION_SETTINGS.DASHBOARD_APPS.${mode}.FORM_SUBMIT`)}
                            disabled={titleError || urlError}
                            isLoading={isLoading}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );
}
