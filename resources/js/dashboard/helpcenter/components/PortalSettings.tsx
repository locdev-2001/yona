import { useMemo, useState } from 'react';

import { t } from '../../../i18n';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import VerticalTabs from 'dashboard/components-next/vertical-tabs/VerticalTabs';
import HelpCenterLayout from './HelpCenterLayout';
import PortalConfigurationSettings from './PortalConfigurationSettings';
import PortalGeneralSettings from './PortalGeneralSettings';
import PortalIntegrationsSettings from './PortalIntegrationsSettings';
import PortalLayoutContentSettings from './PortalLayoutContentSettings';
import { useHelpCenterState } from '../store';
import type { Portal } from '../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalSettings.vue.
interface PortalSettingsProps {
    portals: Portal[];
    isFetching: boolean;
    portalSlug: string;
    onUpdatePortal: (portal: Record<string, unknown>) => void;
    onUpdatePortalConfiguration: (portal: Record<string, unknown>) => void;
    onDeletePortal: (portal: Portal) => void;
    onSendCnameInstructions: (payload: { portalSlug: string; email: string }) => void;
}

export default function PortalSettings({
    portals,
    isFetching,
    portalSlug,
    onUpdatePortal,
    onUpdatePortalConfiguration,
    onDeletePortal,
    onSendCnameInstructions,
}: PortalSettingsProps) {
    const [activeTab, setActiveTab] = useState('general');
    const { portalUiFlags } = useHelpCenterState();

    const settingsTabs = useMemo(
        () => [
            { id: 'general', label: t('HELP_CENTER.PORTAL_SETTINGS.NAV.GENERAL'), icon: 'i-lucide-settings-2' },
            { id: 'domain', label: t('HELP_CENTER.PORTAL_SETTINGS.NAV.DOMAIN'), icon: 'i-lucide-globe' },
            { id: 'appearance', label: t('HELP_CENTER.PORTAL_SETTINGS.NAV.APPEARANCE'), icon: 'i-lucide-palette' },
            { id: 'integrations', label: t('HELP_CENTER.PORTAL_SETTINGS.NAV.INTEGRATIONS'), icon: 'i-lucide-blocks' },
        ],
        [],
    );

    const activePortal = portals.find(portal => portal.slug === portalSlug);
    const isLoading = isFetching || portalUiFlags.isSwitching;

    return (
        <HelpCenterLayout
            showPaginationFooter={false}
            portalSlug={portalSlug}
            breadcrumbLabel={t('HELP_CENTER.BREADCRUMB.SETTINGS')}
            content={
                isLoading ? (
                    <div className="flex items-center justify-center py-10 pt-2 pb-8 text-n-slate-11">
                        <Spinner />
                    </div>
                ) : activePortal ? (
                    <VerticalTabs
                        tabs={settingsTabs}
                        activeTab={activeTab}
                        contentClass="max-w-[40rem] pb-8"
                        onChange={setActiveTab}
                        renderPanel={tab => {
                            if (tab.id === 'general') {
                                return (
                                    <PortalGeneralSettings
                                        activePortal={activePortal}
                                        isFetching={isFetching}
                                        onUpdatePortal={onUpdatePortal}
                                        onDeletePortal={onDeletePortal}
                                    />
                                );
                            }
                            if (tab.id === 'domain') {
                                return (
                                    <PortalConfigurationSettings
                                        activePortal={activePortal}
                                        onUpdatePortalConfiguration={onUpdatePortalConfiguration}
                                        onSendCnameInstructions={onSendCnameInstructions}
                                    />
                                );
                            }
                            if (tab.id === 'appearance') {
                                return (
                                    <PortalLayoutContentSettings
                                        activePortal={activePortal}
                                        isFetching={isFetching}
                                        onUpdatePortalConfiguration={onUpdatePortalConfiguration}
                                    />
                                );
                            }

                            return (
                                <PortalIntegrationsSettings
                                    activePortal={activePortal}
                                    isFetching={isFetching}
                                    onUpdatePortalConfiguration={onUpdatePortalConfiguration}
                                />
                            );
                        }}
                    />
                ) : null
            }
        />
    );
}
