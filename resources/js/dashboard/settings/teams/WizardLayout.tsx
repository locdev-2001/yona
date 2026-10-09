import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Wizard from 'dashboard/components/ui/Wizard';
import type { WizardItem } from 'dashboard/components/ui/Wizard';
import type { DashboardPageProps } from '../../types';

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

// Khác bản gốc (lệnh founder 31/08): ở luồng SỬA, team đã tồn tại nên cả 3 bước
// đều mở thẳng được — bấm vào bước bên trái là nhảy tới, không phải bấm "Update
// team" ở bước 1 mới sang được bước 2. Luồng TẠO giữ nguyên không bấm được vì
// bước 1 chưa sinh ra team, quay lại đó là bắt đầu lại từ đầu.
const EDIT_PATHS = {
    EDIT_WIZARD_DETAILS: 'edit',
    EDIT_WIZARD_AGENTS: 'edit/agents',
    EDIT_WIZARD_FINISH: 'edit/finish',
} as const;

interface WizardLayoutProps {
    flow: 'create' | 'edit';
    activeRoute: string;
    // Chỉ luồng sửa cần: dùng để dựng liên kết nhảy bước.
    teamId?: number;
    // Class SettingsContent truyền xuống (tương đương attr fallthrough của Vue).
    className?: string;
    children: ReactNode;
}

export default function WizardLayout({
    flow,
    activeRoute,
    teamId,
    className = '',
    children,
}: WizardLayoutProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

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
                  href: teamId
                      ? accountScopedUrl(accountId, `settings/teams/${teamId}/${EDIT_PATHS[step]}`)
                      : undefined,
              }));

    return (
        <div className={`flex flex-col gap-6 mb-8 max-w-7xl mx-auto w-full !px-6 ${className}`}>
            <div className="panel-surface grid grid-cols-1 lg:grid-cols-8 rounded-xl h-full min-h-[50dvh] w-full">
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
