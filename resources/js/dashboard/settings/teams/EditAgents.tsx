import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, putJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { EDIT_ROUTES } from './WizardLayout';
import AgentSelector from './AgentSelector';
import Loader from 'shared/components/loader/Loader';
import type { Agent } from '../agents/types';
import type { Team } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ teams/Edit/EditAgents.vue — thành viên hiện tại được chọn sẵn.
interface EditAgentsProps {
    team: Team;
}

export default function EditAgents({ team }: EditAgentsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [isTouched, setTouched] = useState(false);
    const [isUpdating, setUpdating] = useState(false);

    useEffect(() => {
        let active = true;

        void Promise.all([
            getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`),
            getJson<Agent[]>(`/api/v1/accounts/${accountId}/teams/${team.id}/team_members`).catch(
                () => [] as Agent[],
            ),
        ])
            .then(([agentList, members]) => {
                if (!active) return;
                setAgents(agentList);
                setSelectedAgents(members.map(member => member.id));
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId, team.id]);

    const updateSelectedAgents = (agentIds: number[]) => {
        setTouched(true);
        setSelectedAgents(agentIds);
    };

    const saveAgents = async (event: FormEvent) => {
        event.preventDefault();
        setUpdating(true);

        try {
            await putJson(`/api/v1/accounts/${accountId}/teams/${team.id}/team_members`, {
                user_ids: selectedAgents,
            });
            window.location.href = accountScopedUrl(accountId, `settings/teams/${team.id}/edit/finish`);
        } catch {
            setUpdating(false);
            useAlert(t('TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('TEAMS_SETTINGS.HEADER')} showBackButton>
                <WizardLayout flow="edit" activeRoute={EDIT_ROUTES.EDIT_WIZARD_AGENTS} teamId={team.id}>
                    <div className="h-full w-full px-8 pt-8 col-span-6 overflow-auto">
                        <form className="flex flex-col gap-4 mx-0" onSubmit={event => void saveAgents(event)}>
                            <SettingsSubPageHeader
                                headerTitle={t('TEAMS_SETTINGS.EDIT_FLOW.AGENTS.TITLE', {
                                    teamName: team.name,
                                })}
                                headerContent={t('TEAMS_SETTINGS.EDIT_FLOW.AGENTS.DESC')}
                            />

                            <div className="w-full h-full">
                                {isTouched && !selectedAgents.length ? (
                                    <div>
                                        <p className="error-message pb-2">
                                            {t('TEAMS_SETTINGS.ADD.AGENT_VALIDATION_ERROR')}
                                        </p>
                                    </div>
                                ) : null}
                                {isFetching ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader className="text-n-blue-11" />
                                    </div>
                                ) : (
                                    <AgentSelector
                                        agentList={agents}
                                        selectedAgents={selectedAgents}
                                        updateSelectedAgents={updateSelectedAgents}
                                        isWorking={isUpdating}
                                        submitButtonText={t('TEAMS_SETTINGS.EDIT_FLOW.AGENTS.BUTTON_TEXT')}
                                    />
                                )}
                            </div>
                        </form>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
