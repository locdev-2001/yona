import { forwardRef, useImperativeHandle, useRef } from 'react';

import { t } from '../../../i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/ConfirmDeletePortalDialog.vue.
const ConfirmDeletePortalDialog = forwardRef<DialogHandle, { activePortalName: string; onDeletePortal: () => void }>(
    function ConfirmDeletePortalDialog({ activePortalName, onDeletePortal }, ref) {
        const dialogRef = useRef<DialogHandle>(null);
        useImperativeHandle(ref, () => ({
            open: () => dialogRef.current?.open(),
            close: () => dialogRef.current?.close(),
        }));

        return (
            <Dialog
                ref={dialogRef}
                type="alert"
                title={t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.DIALOG.HEADER', {
                    portalName: activePortalName,
                })}
                description={t(
                    'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.DIALOG.DESCRIPTION',
                )}
                confirmButtonLabel={t(
                    'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.DIALOG.CONFIRM_BUTTON_LABEL',
                )}
                onConfirm={onDeletePortal}
            />
        );
    },
);

export default ConfirmDeletePortalDialog;
