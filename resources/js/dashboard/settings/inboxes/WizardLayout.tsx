import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import { useBranding } from 'shared/composables/useBranding';
import Wizard from 'dashboard/components/ui/Wizard';
import type { WizardItem } from 'dashboard/components/ui/Wizard';
import SettingsSubPageHeader from '../SettingsSubPageHeader';

// Port từ settings/inbox/InboxChannels.vue — khung wizard 4 bước của luồng tạo
// inbox; router-view thay bằng children.
const STEPS = ['CHANNEL', 'INBOX', 'AGENT', 'FINISH'] as const;

export const INBOX_WIZARD_ROUTES = {
    CHANNEL: 'settings_inbox_new',
    INBOX: 'settings_inboxes_page_channel',
    AGENT: 'settings_inboxes_add_agents',
    FINISH: 'settings_inbox_finish',
} as const;

interface WizardLayoutProps {
    activeRoute: string;
    className?: string;
    children: ReactNode;
}

export default function WizardLayout({ activeRoute, className = '', children }: WizardLayoutProps) {
    const { replaceInstallationName } = useBranding();

    const items: WizardItem[] = STEPS.map(step => ({
        title: t(`INBOX_MGMT.CREATE_FLOW.${step}.TITLE`),
        body: replaceInstallationName(t(`INBOX_MGMT.CREATE_FLOW.${step}.BODY`)),
        route: INBOX_WIZARD_ROUTES[step],
    }));

    const pageTitle =
        activeRoute === INBOX_WIZARD_ROUTES.CHANNEL
            ? t('INBOX_MGMT.ADD.AUTH.TITLE')
            : activeRoute === INBOX_WIZARD_ROUTES.FINISH
              ? t('INBOX_MGMT.ADD.AUTH.TITLE_FINISH')
              : t('INBOX_MGMT.ADD.AUTH.TITLE_NEXT');

    return (
        <div className={`mx-auto flex flex-col gap-6 mb-8 max-w-7xl w-full !px-6 ${className}`}>
            <div className="block lg:hidden !mb-0">
                <SettingsSubPageHeader headerTitle={pageTitle} />
            </div>
            <div className="panel-surface grid grid-cols-1 lg:grid-cols-8 rounded-xl h-full min-h-[50dvh]">
                <Wizard items={items} activeRoute={activeRoute} className="hidden lg:block col-span-2 h-fit py-8 px-6" />
                <div className="col-span-6 flex flex-col overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}
