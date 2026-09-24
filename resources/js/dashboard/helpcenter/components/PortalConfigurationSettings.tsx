import { useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import AddCustomDomainDialog from './AddCustomDomainDialog';
import DNSConfigurationDialog from './DNSConfigurationDialog';
import type { Portal } from '../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalConfigurationSettings.vue.
// `ssl_status` là endpoint của bản cloud (enterprise) — bản port bỏ hẳn, nên
// khối trạng thái SSL và nút làm mới không hiển thị(bản tự host).
interface PortalConfigurationSettingsProps {
    activePortal: Portal;
    onUpdatePortalConfiguration: (portal: Record<string, unknown>) => void;
    onSendCnameInstructions: (payload: { portalSlug: string; email: string }) => void;
}

export default function PortalConfigurationSettings({
    activePortal,
    onUpdatePortalConfiguration,
    onSendCnameInstructions,
}: PortalConfigurationSettingsProps) {
    const addCustomDomainDialogRef = useRef<DialogHandle>(null);
    const dnsConfigurationDialogRef = useRef<DialogHandle>(null);
    const [updatedDomainAddress, setUpdatedDomainAddress] = useState('');

    const customDomainAddress = activePortal?.custom_domain || '';

    return (
        <div className="flex flex-col w-full gap-6">
            <div className="flex flex-col gap-2">
                <h6 className="text-base font-medium text-n-slate-12">
                    {t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.HEADER')}
                </h6>
                <span className="text-sm text-n-slate-11">
                    {t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.DESCRIPTION')}
                </span>
            </div>
            <div className="flex flex-col w-full gap-4">
                <div className="flex items-center justify-between w-full gap-2">
                    {customDomainAddress ? (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center w-full h-8 gap-4">
                                <label className="text-sm font-medium text-n-slate-12">
                                    {t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.LABEL')}
                                </label>
                                <span className="text-sm text-n-slate-12">{customDomainAddress}</span>
                            </div>
                        </div>
                    ) : null}
                    <div className="flex items-center">
                        {customDomainAddress ? (
                            <div className="flex items-center gap-3">
                                <Button
                                    slate
                                    sm
                                    link
                                    label={t(
                                        'HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.EDIT_BUTTON',
                                    )}
                                    className="hover:!no-underline flex-shrink-0"
                                    onClick={() => addCustomDomainDialogRef.current?.open()}
                                />
                            </div>
                        ) : (
                            <Button
                                label={t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.CUSTOM_DOMAIN.ADD_BUTTON')}
                                color="slate"
                                onClick={() => addCustomDomainDialogRef.current?.open()}
                            />
                        )}
                    </div>
                </div>
            </div>
            <AddCustomDomainDialog
                ref={addCustomDomainDialogRef}
                mode={customDomainAddress ? 'edit' : 'add'}
                customDomain={customDomainAddress}
                onAddCustomDomain={customDomain => {
                    onUpdatePortalConfiguration({ id: activePortal?.id, custom_domain: customDomain });
                    addCustomDomainDialogRef.current?.close();
                    if (customDomain) {
                        setUpdatedDomainAddress(customDomain);
                        dnsConfigurationDialogRef.current?.open();
                    }
                }}
            />
            <DNSConfigurationDialog
                ref={dnsConfigurationDialogRef}
                customDomain={updatedDomainAddress || customDomainAddress}
                onSend={email => onSendCnameInstructions({ portalSlug: activePortal?.slug, email })}
                onClose={() => {
                    setUpdatedDomainAddress('');
                    dnsConfigurationDialogRef.current?.close();
                }}
            />
        </div>
    );
}
