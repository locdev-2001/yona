import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/AddCustomDomainDialog.vue.
// isValidDomain của @chatwoot/utils: tên miền có ít nhất một dấu chấm.
const DOMAIN_PATTERN = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;

interface AddCustomDomainDialogProps {
    mode?: 'add' | 'edit';
    customDomain?: string;
    onAddCustomDomain: (customDomain: string) => void;
}

const AddCustomDomainDialog = forwardRef<DialogHandle, AddCustomDomainDialogProps>(function AddCustomDomainDialog(
    { mode = 'add', customDomain = '', onAddCustomDomain },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const [value, setValue] = useState(customDomain);
    const [isTouched, setTouched] = useState(false);

    useEffect(() => setValue(customDomain), [customDomain]);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const isInvalid = value !== '' && !DOMAIN_PATTERN.test(value);
    const errorMessage =
        isTouched && isInvalid
            ? t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG.FORMAT_ERROR')
            : '';

    return (
        <Dialog
            ref={dialogRef}
            title={t(
                `HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG.${mode.toUpperCase()}_HEADER`,
            )}
            confirmButtonLabel={t(
                `HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG.${mode.toUpperCase()}_CONFIRM_BUTTON_LABEL`,
            )}
            onConfirm={() => {
                setTouched(true);
                if (!isInvalid) onAddCustomDomain(value);
            }}
        >
            <Input
                value={value}
                label={t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG.LABEL')}
                placeholder={t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DIALOG.PLACEHOLDER')}
                message={errorMessage}
                messageType={errorMessage ? 'error' : 'info'}
                onChange={event => setValue(event.target.value)}
                onBlur={() => setTouched(true)}
            />
        </Dialog>
    );
});

export default AddCustomDomainDialog;
