import { useMemo } from 'react';

import EmptyState from 'dashboard/components/widgets/EmptyState';
import Pagination from 'dashboard/components/table/Pagination';
import Loader from 'shared/components/loader/Loader';
import Table, { type TableColumn } from 'dashboard/components/table/Table';
import { useTableModel } from 'dashboard/components/table/useTableModel';
import { t } from '../../../../i18n';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import AgentCell, { type AgentTableRow } from './AgentCell';
import type { AgentConversationMetric } from '../../types';
import type { AvailabilityStatus } from '../../../types';

// Port từ reports/components/overview/AgentTable.vue
export interface OverviewAgent {
    id: number;
    name: string;
    available_name?: string;
    email?: string;
    thumbnail?: string;
    availability_status?: AvailabilityStatus;
}

interface AgentTableProps {
    agents: OverviewAgent[];
    agentMetrics: AgentConversationMetric[];
    isLoading?: boolean;
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
}

const spanCell = (value: number) => (
    <span className={value ? 'capitalize text-n-slate-12' : 'capitalize text-n-slate-11'}>{value || '---'}</span>
);

export default function AgentTable({
    agents,
    agentMetrics,
    isLoading = false,
    pageSize,
    onPageSizeChange,
}: AgentTableProps) {
    const tableData = useMemo<AgentTableRow[]>(
        () =>
            agents
                .map(agent => {
                    const metric = agentMetrics.find(item => item.assignee_id === Number(agent.id)) || {};
                    return {
                        agent: agent.available_name || agent.name,
                        avatarSeed: avatarSeed('user', agent.id),
                        email: agent.email,
                        thumbnail: agent.thumbnail,
                        open: (metric as AgentConversationMetric).open || 0,
                        unattended: (metric as AgentConversationMetric).unattended || 0,
                        status: agent.availability_status,
                    };
                })
                .sort((first, second) => {
                    const openDiff = second.open - first.open;
                    if (openDiff === 0) return first.agent.localeCompare(second.agent);
                    return openDiff;
                }),
        [agents, agentMetrics],
    );

    const table = useTableModel(tableData, pageSize);

    const columns: TableColumn<AgentTableRow>[] = [
        {
            id: 'agent',
            header: t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.TABLE_HEADER.AGENT'),
            size: 250,
            cell: row => <AgentCell row={row} />,
        },
        {
            id: 'open',
            header: t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.TABLE_HEADER.OPEN'),
            size: 100,
            cell: row => spanCell(row.open),
        },
        {
            id: 'unattended',
            header: t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.TABLE_HEADER.UNATTENDED'),
            size: 100,
            cell: row => spanCell(row.unattended),
        },
    ];

    return (
        <div className="flex flex-col flex-1">
            <Table
                table={table}
                columns={columns}
                rowKey={(_, index) => index}
                className="max-h-[calc(100vh-21.875rem)]"
            />
            <Pagination className="mt-2" table={table} showPageSizeSelector onPageSizeChange={onPageSizeChange} />
            {isLoading ? (
                <div className="items-center flex text-base justify-center p-8">
                    <Loader size={16} />
                    <span>{t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.LOADING_MESSAGE')}</span>
                </div>
            ) : (
                !agents.length && <EmptyState title={t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.NO_AGENTS')} />
            )}
        </div>
    );
}
