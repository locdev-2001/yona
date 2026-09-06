import { useRef } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import ConfirmDeletePortalDialog from './ConfirmDeletePortalDialog';
import PortalBaseSettings from './PortalBaseSettings';
import type { Portal } from '../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalGeneralSettings.vue.
interface PortalGeneralSettingsProps {
    activePortal: Portal;
    isFetching?: boolean;
    onUpdatePortal: (portal: Record<string, unknown>) => void;
    onDeletePortal: (portal: Portal) => void;
}

export default function PortalGeneralSettings({
    activePortal,
    isFetching = false,
    onUpdatePortal,
    onDeletePortal,
}: PortalGeneralSettingsProps) {
    const confirmDeletePortalDialogRef = useRef<DialogHandle>(null);
    const activePortalName = activePortal?.name || '';

    return (
        <div className="flex flex-col w-full gap-4">
            <PortalBaseSettings activePortal={activePortal} isFetching={isFetching} onUpdatePortal={onUpdatePortal} />
            <div className="w-full h-px bg-n-weak" />
            <div className="flex items-end justify-between w-full gap-4">
                <div className="flex flex-col gap-2">
                    <h6 className="text-base font-medium text-n-slate-12">
                        {t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.HEADER')}
                    </h6>
                    <span className="text-sm text-n-slate-11">
                        {t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.DESCRIPTION')}
                    </span>
                </div>
                <Button
                    label={t('HELP_CENTER.PORTAL_SETTINGS.CONFIGURATION_FORM.DELETE_PORTAL.BUTTON', {
                        portalName: activePortalName,
                    })}
                    color="ruby"
                    className="max-w-56 !w-fit"
                    onClick={() => confirmDeletePortalDialogRef.current?.open()}
                />
            </div>
            <ConfirmDeletePortalDialog
                ref={confirmDeletePortalDialogRef}
                activePortalName={activePortalName}
                onDeletePortal={() => {
                    onDeletePortal(activePortal);
                    confirmDeletePortalDialogRef.current?.close();
                }}
            />
        </div>
    );
}
