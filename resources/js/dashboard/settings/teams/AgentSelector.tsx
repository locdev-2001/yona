import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Button from 'dashboard/components-next/button/Button';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import { useAgentsWithPresence } from '../agents/presence';
import type { Agent } from '../agents/types';

// Port từ dashboard/routes/dashboard/settings/teams/AgentSelector.vue
interface AgentSelectorProps {
    agentList: Agent[];
    selectedAgents: number[];
    updateSelectedAgents: (agentIds: number[]) => void;
    isWorking?: boolean;
    submitButtonText: string;
}

export default function AgentSelector({
    agentList: fetchedAgentList,
    selectedAgents,
    updateSelectedAgents,
    isWorking = false,
    submitButtonText,
}: AgentSelectorProps) {
    const agentList = useAgentsWithPresence(fetchedAgentList);
    const allAgentsSelected = selectedAgents.length === agentList.length && agentList.length > 0;
    const someAgentsSelected = selectedAgents.length > 0 && !allAgentsSelected;

    const isAgentSelected = (agentId: number) => selectedAgents.includes(agentId);

    const handleSelectAgent = (agentId: number) => {
        updateSelectedAgents(
            isAgentSelected(agentId)
                ? selectedAgents.filter(item => item !== agentId)
                : [...selectedAgents, agentId],
        );
    };

    const toggleSelectAll = () => {
        updateSelectedAgents(allAgentsSelected ? [] : agentList.map(agent => agent.id));
    };

    const headers = [
        <div key="select-all" className="flex items-center">
            <Checkbox
                checked={allAgentsSelected}
                indeterminate={someAgentsSelected}
                title={t('TEAMS_SETTINGS.AGENTS.SELECT_ALL')}
                onChange={toggleSelectAll}
            />
        </div>,
        t('TEAMS_SETTINGS.AGENTS.AGENT'),
        t('TEAMS_SETTINGS.AGENTS.EMAIL'),
    ];

    return (
        <>
            <BaseTable headers={headers} hasItems={agentList.length > 0}>
                {agentList.map(agent => (
                    <BaseTableRow key={agent.id}>
                        <BaseTableCell className="w-5">
                            <div className="flex items-center">
                                <Checkbox
                                    checked={isAgentSelected(agent.id)}
                                    onChange={() => handleSelectAgent(agent.id)}
                                />
                            </div>
                        </BaseTableCell>

                        <BaseTableCell className="min-w-0 max-w-40">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                    seed={avatarSeed('user', agent.id)}
                                    src={agent.thumbnail}
                                    name={agent.name}
                                    status={agent.availability_status}
                                    size={24}
                                    hideOfflineStatus
                                    roundedFull
                                    className="flex-shrink-0"
                                />
                                <h4 className="text-heading-3 mb-0 text-n-slate-12 truncate">{agent.name}</h4>
                            </div>
                        </BaseTableCell>

                        <BaseTableCell className="min-w-0">
                            <span className="text-body-main text-n-slate-11 truncate block">
                                {agent.email || '---'}
                            </span>
                        </BaseTableCell>
                    </BaseTableRow>
                ))}
            </BaseTable>

            <div className="sticky bottom-0 py-4 px-8 -mx-8 z-20 flex items-center justify-between bg-n-surface-1">
                <p className="text-body-main text-n-slate-11 mb-0">
                    {t('TEAMS_SETTINGS.AGENTS.SELECTED_COUNT', {
                        selected: selectedAgents.length,
                        total: agentList.length,
                    })}
                </p>
                <Button
                    type="submit"
                    label={submitButtonText}
                    disabled={selectedAgents.length === 0}
                    isLoading={isWorking}
                />
            </div>
        </>
    );
}
