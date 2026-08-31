import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { putJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { EDIT_ROUTES } from './WizardLayout';
import TeamForm from './TeamForm';
import type { Team, TeamFormPayload } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ teams/Edit/EditTeam.vue (team lấy từ props Inertia thay vuex store,
// nên không còn trạng thái chờ + Spinner của bản gốc).
interface EditTeamProps {
    team: Team;
}

export default function EditTeam({ team }: EditTeamProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [isSubmitting, setSubmitting] = useState(false);

    const updateTeam = async (payload: TeamFormPayload) => {
        setSubmitting(true);

        try {
            await putJson(`/api/v1/accounts/${accountId}/teams/${team.id}`, payload);
            window.location.href = accountScopedUrl(accountId, `settings/teams/${team.id}/edit/agents`);
        } catch {
            setSubmitting(false);
            useAlert(t('TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('TEAMS_SETTINGS.HEADER')} showBackButton>
                <WizardLayout flow="edit" activeRoute={EDIT_ROUTES.EDIT_WIZARD_DETAILS}>
                    <div className="h-full w-full p-8 col-span-6 overflow-y-auto">
                        <SettingsSubPageHeader
                            headerTitle={t('TEAMS_SETTINGS.EDIT_FLOW.CREATE.TITLE')}
                            headerContent={t('TEAMS_SETTINGS.EDIT_FLOW.CREATE.DESC')}
                        />
                        <div className="flex flex-wrap">
                            <TeamForm
                                formData={team}
                                submitButtonText={t('TEAMS_SETTINGS.EDIT_FLOW.CREATE.BUTTON_TEXT')}
                                submitInProgress={isSubmitting}
                                onSubmit={payload => void updateTeam(payload)}
                            />
                        </div>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
