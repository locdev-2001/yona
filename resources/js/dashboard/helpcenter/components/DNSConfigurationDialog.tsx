import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/DNSConfigurationDialog.vue.
const KEY = 'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DNS_CONFIGURATION_DIALOG';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DNSConfigurationDialogProps {
    customDomain?: string;
    onSend: (email: string) => void;
    onClose: () => void;
}

const DNSConfigurationDialog = forwardRef<DialogHandle, DNSConfigurationDialogProps>(function DNSConfigurationDialog(
    { customDomain = '', onSend, onClose },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const [email, setEmail] = useState('');
    const [isTouched, setTouched] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const subdomainCNAME = `${customDomain} CNAME ${window.location.host}`;
    const isInvalid = !EMAIL_PATTERN.test(email);
    const emailError = isTouched && isInvalid ? t(`${KEY}.SEND_INSTRUCTIONS.ERROR`) : '';

    const reset = () => {
        setEmail('');
        setTouched(false);
    };

    return (
        <Dialog ref={dialogRef} showCancelButton={false} showConfirmButton={false} onClose={reset}>
            <Button
                icon="i-lucide-x"
                sm
                ghost
                slate
                className="flex-shrink-0 absolute top-2 ltr:right-2 rtl:left-2"
                onClick={() => {
                    reset();
                    onClose();
                }}
            />
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 ltr:pr-10 rtl:pl-10">
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">{t(`${KEY}.HEADER`)}</h3>
                        <p className="mb-0 text-sm text-n-slate-12">{t(`${KEY}.DESCRIPTION`)}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full">
                        <span className="min-h-10 px-3 py-2.5 inline-flex items-center w-full text-sm bg-n-surface-field rounded-lg text-n-slate-11">
                            {subdomainCNAME}
                        </span>
                        <Button
                            faded
                            slate
                            type="button"
                            icon="i-lucide-copy"
                            className="flex-shrink-0"
                            onClick={async event => {
                                event.stopPropagation();
                                await navigator.clipboard.writeText(subdomainCNAME);
                                useAlert(t(`${KEY}.COPY`));
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 ltr:pr-10 rtl:pl-10">
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">
                            {t(`${KEY}.SEND_INSTRUCTIONS.HEADER`)}
                        </h3>
                        <p className="mb-0 text-sm text-n-slate-12">{t(`${KEY}.SEND_INSTRUCTIONS.DESCRIPTION`)}</p>
                    </div>
                    <form
                        className="flex items-start gap-3 w-full"
                        onSubmit={event => {
                            event.preventDefault();
                            setTouched(true);
                            if (isInvalid) return;
                            onSend(email);
                            reset();
                            onClose();
                        }}
                    >
                        <Input
                            value={email}
                            placeholder={t(`${KEY}.SEND_INSTRUCTIONS.PLACEHOLDER`)}
                            message={emailError}
                            messageType={emailError ? 'error' : 'info'}
                            className="w-full"
                            onChange={event => setEmail(event.target.value)}
                            onBlur={() => setTouched(true)}
                        />
                        <Button
                            label={t(`${KEY}.SEND_INSTRUCTIONS.SEND_BUTTON`)}
                            type="submit"
                            className="flex-shrink-0"
                        />
                    </form>
                </div>
            </div>
        </Dialog>
    );
});

export default DNSConfigurationDialog;
