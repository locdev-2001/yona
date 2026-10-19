import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import { createPortal, useHelpCenterState } from '../store';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/PortalSwitcher/CreatePortalDialog.vue.
// Khác biệt cố ý (lệnh founder): KHÔNG có ô slug — backend tự sinh từ tên.
const DEFAULT_PORTAL_COLOR = '#2781F6';
const MIN_NAME_LENGTH = 2;

interface CreatePortalDialogProps {
    onCreated?: (portal: { slug: string; locale: string }) => void;
}

const CreatePortalDialog = forwardRef<DialogHandle, CreatePortalDialogProps>(function CreatePortalDialog(
    { onCreated },
    ref,
) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);
    const { portalUiFlags } = useHelpCenterState();

    const [name, setName] = useState('');
    const [isTouched, setTouched] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const isNameInvalid = name.trim().length < MIN_NAME_LENGTH;
    const nameError = isTouched && isNameInvalid ? t('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.ERROR') : '';

    const handleConfirm = async () => {
        setTouched(true);
        if (isNameInvalid) return;

        try {
            const portal = await createPortal(accountId, { name, color: DEFAULT_PORTAL_COLOR });
            dialogRef.current?.close();
            useAlert(t('HELP_CENTER.PORTAL_SETTINGS.API.CREATE_PORTAL.SUCCESS_MESSAGE'));
            setName('');
            setTouched(false);
            onCreated?.({ slug: portal.slug, locale: portal.meta?.default_locale || 'en' });
        } catch (error) {
            dialogRef.current?.close();
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.PORTAL_SETTINGS.API.CREATE_PORTAL.ERROR_MESSAGE'));
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t('HELP_CENTER.CREATE_PORTAL_DIALOG.TITLE')}
            confirmButtonLabel={t('HELP_CENTER.CREATE_PORTAL_DIALOG.CONFIRM_BUTTON_LABEL')}
            description={t('HELP_CENTER.CREATE_PORTAL_DIALOG.DESCRIPTION')}
            disableConfirmButton={isNameInvalid || portalUiFlags.isCreating}
            isLoading={portalUiFlags.isCreating}
            onConfirm={handleConfirm}
        >
            <div className="flex flex-col gap-6">
                <Input
                    id="portal-name"
                    value={name}
                    type="text"
                    placeholder={t('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.PLACEHOLDER')}
                    label={t('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.LABEL')}
                    messageType={nameError ? 'error' : 'info'}
                    message={nameError || t('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.MESSAGE')}
                    onChange={event => setName(event.target.value)}
                    onBlur={() => setTouched(true)}
                />
            </div>
        </Dialog>
    );
});

export default CreatePortalDialog;
