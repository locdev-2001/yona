import { useEffect, useState } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { TeamMeta } from '../../types';

// Thay store/modules/teams (getter `getTeams`): Sidebar.vue gốc dispatch `teams/get`
// một lần cho cả app nên dropdown gán team thấy MỌI team của account — shared prop
// `teams` của yona chỉ là team mình là member (getMyTeams), không dùng được ở đây.
let cachedTeams: TeamMeta[] | null = null;

export function useTeamsList(accountId: number): TeamMeta[] {
    const [teams, setTeams] = useState<TeamMeta[]>(cachedTeams ?? []);

    useEffect(() => {
        let cancelled = false;
        getJson<TeamMeta[]>(`/api/v1/accounts/${accountId}/teams`).then(payload => {
            // getTeams sắp theo id tăng dần.
            cachedTeams = [...payload].sort((first, second) => first.id - second.id);
            if (!cancelled) setTeams(cachedTeams);
        }, () => undefined);

        return () => {
            cancelled = true;
        };
    }, [accountId]);

    return teams;
}
