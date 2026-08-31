import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { CREATE_ROUTES } from './WizardLayout';
import TeamForm from './TeamForm';
import type { Team, TeamFormPayload } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ teams/Create/CreateTeam.vue
export default function CreateTeam() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [isSubmitting, setSubmitting] = useState(false);

    const createTeam = async (payload: TeamFormPayload) => {
        setSubmitting(true);

        try {
            const team = await postJson<Team>(`/api/v1/accounts/${accountId}/teams`, payload);
            window.location.href = accountScopedUrl(accountId, `settings/teams/${team.id}/agents`);
        } catch {
            setSubmitting(false);
            useAlert(t('TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('TEAMS_SETTINGS.HEADER')} showBackButton>
                <WizardLayout flow="create" activeRoute={CREATE_ROUTES.WIZARD_CREATE}>
                    <div className="h-full w-full p-6 col-span-6 overflow-y-auto">
                        <SettingsSubPageHeader
                            headerTitle={t('TEAMS_SETTINGS.CREATE_FLOW.CREATE.TITLE')}
                            headerContent={t('TEAMS_SETTINGS.CREATE_FLOW.CREATE.DESC')}
                        />
                        <div className="flex flex-wrap">
                            <TeamForm
                                submitButtonText={t('TEAMS_SETTINGS.FORM.SUBMIT_CREATE')}
                                submitInProgress={isSubmitting}
                                onSubmit={payload => void createTeam(payload)}
                            />
                        </div>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
