import { useMemo } from 'react';

import type { EntityReportType } from '../api';
import type { ReportEntity } from '../components/WootReports';
import { useAccountDirectory, type DirectoryScope } from './useAccountDirectory';

// Thay bộ getter `agents/getAgents`, `inboxes/getInboxes`, `labels/getLabels`,
// `teams/getTeams` của vuex: một chỗ duy nhất quy đổi thực thể về {id, name}
// (nhãn dùng `title`, đúng như `row.name ?? row.title` của bản gốc).

const SCOPES: Record<EntityReportType, DirectoryScope> = {
    agent: 'agents',
    inbox: 'inboxes',
    label: 'labels',
    team: 'teams',
};

export function useReportEntities(accountId: number, type: EntityReportType): ReportEntity[] {
    const scope = SCOPES[type];
    const directory = useAccountDirectory(accountId, [scope]);
    const rows = directory[scope] as { id: number; name?: string; title?: string }[];

    return useMemo(() => rows.map(row => ({ id: row.id, name: row.name ?? row.title ?? '' })), [rows]);
}
