import { useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useBranding } from 'shared/composables/useBranding';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { deleteJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { fetchIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/settings/integrations/Integration.vue
// (thẻ tích hợp dùng bởi Slack.tsx — action Connect/Configure/Disconnect + modal xoá).
interface IntegrationProps {
    accountId: number;
    integrationId: string;
    integrationName?: string;
    integrationDescription?: string;
    integrationEnabled?: boolean;
    integrationAction?: string;
    actionButtonText?: string;
    deleteConfirmationText?: { title?: string; message?: string };
}

export default function Integration({
    accountId,
    integrationId,
    integrationName = '',
    integrationDescription = '',
    integrationEnabled = false,
    integrationAction = '',
    actionButtonText = '',
    deleteConfirmationText = {},
}: IntegrationProps) {
    const { replaceInstallationName } = useBranding();
    const dialogRef = useRef<DialogHandle>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const openDeletePopup = () => dialogRef.current?.open();
    const closeDeletePopup = () => dialogRef.current?.close();

    const deleteIntegration = async () => {
        setIsDeleting(true);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/integrations/${integrationId}`);
            fetchIntegrationApps(accountId, { force: true });
            useAlert(t('INTEGRATION_SETTINGS.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmDeletion = () => {
        closeDeletePopup();
        void deleteIntegration();
        router.visit(accountScopedUrl(accountId, 'settings/integrations'));
    };

    const configureUrl = accountScopedUrl(accountId, `settings/integrations/${integrationId}`);

    return (
        <div className="flex flex-col items-start justify-between lg:flex-row lg:items-center p-6 panel-surface rounded-xl gap-6">
            <div className="flex items-start lg:items-center justify-start flex-1 m-0 gap-6 flex-col lg:flex-row">
                <div className="flex h-16 w-16 items-center justify-center flex-shrink-0">
                    <img
                        src={`/dashboard/images/integrations/${integrationId}.png`}
                        className="max-w-full rounded-md block bg-n-surface-field"
                    />
                </div>
                <div>
                    <h3 className="mb-1 text-heading-1 text-n-slate-12">{integrationName}</h3>
                    <p className="text-n-slate-11 text-body-main">{replaceInstallationName(integrationDescription)}</p>
                </div>
            </div>
            <div className="flex justify-center items-center mb-0">
                {integrationEnabled ? (
                    integrationAction === 'disconnect' ? (
                        // Bản gốc bọc nút này trong router-link cùng route hiện tại (no-op điều
                        // hướng) — preventDefault ở đây giữ đúng hành vi mà không kích hoạt
                        // Inertia visit reload lại trang đang mở dialog xoá.
                        <Link href={configureUrl} onClick={event => event.preventDefault()}>
                            <Button
                                label={actionButtonText || t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.BUTTON_TEXT')}
                                faded
                                ruby
                                onClick={openDeletePopup}
                            />
                        </Link>
                    ) : (
                        <Link href={configureUrl}>
                            <Button faded blue label={t('INTEGRATION_SETTINGS.WEBHOOK.CONFIGURE')} />
                        </Link>
                    )
                ) : (
                    <a href={integrationAction}>
                        <Button faded blue label={t('INTEGRATION_SETTINGS.CONNECT.BUTTON_TEXT')} />
                    </a>
                )}
            </div>
            <Dialog
                ref={dialogRef}
                type="alert"
                title={deleteConfirmationText.title || t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.TITLE')}
                description={deleteConfirmationText.message || t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.MESSAGE')}
                confirmButtonLabel={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.YES')}
                cancelButtonLabel={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.NO')}
                isLoading={isDeleting}
                onConfirm={confirmDeletion}
            />
        </div>
    );
}
