import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { updateUISettings, type UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useAccountDirectory } from '../composables/useAccountDirectory';
import { useLiveRefresh } from '../composables/useLiveRefresh';
import { fetchTeamConversationMetric, reportsSelectors, useReportsState } from '../store';
import MetricCard from './overview/MetricCard';
import TeamTable from './overview/TeamTable';

// Port từ reports/components/TeamLiveReportContainer.vue
const TEAM_TABLE_PAGE_SIZE_KEY = 'report_overview_team_table_page_size';

export default function TeamLiveReportContainer() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const [uiSettings, setUISettings] = useState<UISettings>(auth.user?.ui_settings ?? {});

    const uiFlags = useReportsState(reportsSelectors.overviewUIFlags);
    const teamConversationMetric = useReportsState(reportsSelectors.teamConversationMetric);
    const { teams } = useAccountDirectory(accountId, ['teams']);

    useEffect(() => {
        void fetchTeamConversationMetric(accountId);
    }, [accountId]);

    useLiveRefresh(() => fetchTeamConversationMetric(accountId));

    return (
        <div className="flex flex-row flex-wrap max-w-full">
            <MetricCard header={t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.HEADER')}>
                <TeamTable
                    teams={teams}
                    teamMetrics={teamConversationMetric}
                    isLoading={uiFlags.isFetchingTeamConversationMetric}
                    pageSize={(uiSettings[TEAM_TABLE_PAGE_SIZE_KEY] as number) || 10}
                    onPageSizeChange={pageSize =>
                        setUISettings(current => updateUISettings(current, { [TEAM_TABLE_PAGE_SIZE_KEY]: pageSize }))
                    }
                />
            </MetricCard>
        </div>
    );
}
