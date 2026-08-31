import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { CREATE_ROUTES } from './WizardLayout';
import AgentSelector from './AgentSelector';
import type { Agent } from '../agents/types';
import type { Team } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ teams/Create/AddAgents.vue
interface AddAgentsProps {
    team: Team;
}

export default function AddAgents({ team }: AddAgentsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
    const [isTouched, setTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);

    useEffect(() => {
        let active = true;

        void getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`).then(list => {
            if (active) setAgents(list);
        });

        return () => {
            active = false;
        };
    }, [accountId]);

    const updateSelectedAgents = (agentIds: number[]) => {
        setTouched(true);
        setSelectedAgents(agentIds);
    };

    const addAgents = async (event: FormEvent) => {
        event.preventDefault();
        setCreating(true);

        try {
            await postJson(`/api/v1/accounts/${accountId}/teams/${team.id}/team_members`, {
                user_ids: selectedAgents,
            });
            window.location.href = accountScopedUrl(accountId, `settings/teams/new/${team.id}/finish`);
        } catch {
            setCreating(false);
            useAlert(t('TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('TEAMS_SETTINGS.HEADER')} showBackButton>
                <WizardLayout flow="create" activeRoute={CREATE_ROUTES.WIZARD_ADD_AGENTS}>
                    <div className="h-full w-full px-8 pt-8 col-span-6 overflow-auto">
                        <form className="flex flex-col gap-4 mx-0" onSubmit={event => void addAgents(event)}>
                            <SettingsSubPageHeader
                                headerTitle={t('TEAMS_SETTINGS.ADD.TITLE', { teamName: team.name })}
                                headerContent={t('TEAMS_SETTINGS.ADD.DESC')}
                            />

                            <div className="w-full h-full">
                                {isTouched && !selectedAgents.length ? (
                                    <div>
                                        <p className="error-message pb-2">
                                            {t('TEAMS_SETTINGS.ADD.AGENT_VALIDATION_ERROR')}
                                        </p>
                                    </div>
                                ) : null}
                                <AgentSelector
                                    agentList={agents}
                                    selectedAgents={selectedAgents}
                                    updateSelectedAgents={updateSelectedAgents}
                                    isWorking={isCreating}
                                    submitButtonText={t('TEAMS_SETTINGS.ADD.BUTTON_TEXT')}
                                />
                            </div>
                        </form>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
