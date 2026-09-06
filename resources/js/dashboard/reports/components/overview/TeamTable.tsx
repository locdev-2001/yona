import { useMemo } from 'react';

import EmptyState from 'dashboard/components/widgets/EmptyState';
import Pagination from 'dashboard/components/table/Pagination';
import Spinner from 'shared/components/Spinner';
import Table, { type TableColumn } from 'dashboard/components/table/Table';
import { useTableModel } from 'dashboard/components/table/useTableModel';
import { t } from '../../../../i18n';
import type { TeamConversationMetric } from '../../types';

// Port từ reports/components/overview/TeamTable.vue
export interface OverviewTeam {
    id: number;
    name: string;
}

interface TeamTableRow {
    agent: string;
    open: number;
    unattended: number;
}

interface TeamTableProps {
    teams: OverviewTeam[];
    teamMetrics: TeamConversationMetric[];
    isLoading?: boolean;
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
}

const spanCell = (value: string | number) => (
    <span className={value ? 'capitalize text-n-slate-12' : 'capitalize text-n-slate-11'}>{value || '---'}</span>
);

export default function TeamTable({ teams, teamMetrics, isLoading = false, pageSize, onPageSizeChange }: TeamTableProps) {
    const tableData = useMemo<TeamTableRow[]>(
        () =>
            teams
                .map(team => {
                    const metric = teamMetrics.find(item => item.team_id === Number(team.id)) || {};
                    return {
                        agent: team.name,
                        open: (metric as TeamConversationMetric).open || 0,
                        unattended: (metric as TeamConversationMetric).unattended || 0,
                    };
                })
                .sort((first, second) => {
                    const openDiff = second.open - first.open;
                    if (openDiff === 0) return first.agent.localeCompare(second.agent);
                    return openDiff;
                }),
        [teams, teamMetrics],
    );

    const table = useTableModel(tableData, pageSize);

    const columns: TableColumn<TeamTableRow>[] = [
        {
            id: 'agent',
            header: t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.TABLE_HEADER.TEAM'),
            size: 250,
            cell: row => spanCell(row.agent),
        },
        {
            id: 'open',
            header: t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.TABLE_HEADER.OPEN'),
            size: 100,
            cell: row => spanCell(row.open),
        },
        {
            id: 'unattended',
            header: t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.TABLE_HEADER.UNATTENDED'),
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
                    <Spinner />
                    <span>{t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.LOADING_MESSAGE')}</span>
                </div>
            ) : (
                !teams.length && <EmptyState title={t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.NO_TEAMS')} />
            )}
        </div>
    );
}
