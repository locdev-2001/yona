import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Wizard from 'dashboard/components/ui/Wizard';
import type { WizardItem } from 'dashboard/components/ui/Wizard';

// Port từ teams/Create/Index.vue + Edit/Index.vue (khung wizard giống hệt nhau,
// chỉ khác bộ bước) — router-view thay bằng children.
const CREATE_STEPS = ['WIZARD_CREATE', 'WIZARD_ADD_AGENTS', 'WIZARD_FINISH'] as const;
const EDIT_STEPS = ['EDIT_WIZARD_DETAILS', 'EDIT_WIZARD_AGENTS', 'EDIT_WIZARD_FINISH'] as const;

export const CREATE_ROUTES = {
    WIZARD_CREATE: 'settings_teams_new',
    WIZARD_ADD_AGENTS: 'settings_teams_add_agents',
    WIZARD_FINISH: 'settings_teams_finish',
} as const;

export const EDIT_ROUTES = {
    EDIT_WIZARD_DETAILS: 'settings_teams_edit',
    EDIT_WIZARD_AGENTS: 'settings_teams_edit_members',
    EDIT_WIZARD_FINISH: 'settings_teams_edit_finish',
} as const;

interface WizardLayoutProps {
    flow: 'create' | 'edit';
    activeRoute: string;
    children: ReactNode;
}

export default function WizardLayout({ flow, activeRoute, children }: WizardLayoutProps) {
    const items: WizardItem[] =
        flow === 'create'
            ? CREATE_STEPS.map(step => ({
                  title: t(`TEAMS_SETTINGS.CREATE_FLOW.${step}.TITLE`),
                  body: t(`TEAMS_SETTINGS.CREATE_FLOW.${step}.BODY`),
                  route: CREATE_ROUTES[step],
              }))
            : EDIT_STEPS.map(step => ({
                  title: t(`TEAMS_SETTINGS.EDIT_FLOW.${step}.TITLE`),
                  body: t(`TEAMS_SETTINGS.EDIT_FLOW.${step}.BODY`),
                  route: EDIT_ROUTES[step],
              }));

    return (
        <div className="flex flex-col gap-6 mb-8 max-w-7xl mx-auto w-full !px-6">
            <div className="grid grid-cols-1 lg:grid-cols-8 lg:divide-x lg:divide-n-weak rounded-xl border border-n-weak h-full min-h-[50dvh] w-full">
                <Wizard
                    items={items}
                    activeRoute={activeRoute}
                    className="hidden lg:block col-span-2 h-fit py-8 px-6"
                />
                {children}
            </div>
        </div>
    );
}
