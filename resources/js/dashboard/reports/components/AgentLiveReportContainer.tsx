import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { updateUISettings, type UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useAccountDirectory } from '../composables/useAccountDirectory';
import { useLiveRefresh } from '../composables/useLiveRefresh';
import { fetchAgentConversationMetric, reportsSelectors, useReportsState } from '../store';
import AgentTable from './overview/AgentTable';
import MetricCard from './overview/MetricCard';

// Port từ reports/components/AgentLiveReportContainer.vue
const AGENT_TABLE_PAGE_SIZE_KEY = 'report_overview_agent_table_page_size';

export default function AgentLiveReportContainer() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const [uiSettings, setUISettings] = useState<UISettings>(auth.user?.ui_settings ?? {});

    const uiFlags = useReportsState(reportsSelectors.overviewUIFlags);
    const agentConversationMetric = useReportsState(reportsSelectors.agentConversationMetric);
    const { agents } = useAccountDirectory(accountId, ['agents']);

    useEffect(() => {
        void fetchAgentConversationMetric(accountId);
    }, [accountId]);

    useLiveRefresh(() => fetchAgentConversationMetric(accountId));

    return (
        <div className="flex flex-row flex-wrap max-w-full">
            <MetricCard header={t('OVERVIEW_REPORTS.AGENT_CONVERSATIONS.HEADER')}>
                <AgentTable
                    agents={agents}
                    agentMetrics={agentConversationMetric}
                    isLoading={uiFlags.isFetchingAgentConversationMetric}
                    pageSize={(uiSettings[AGENT_TABLE_PAGE_SIZE_KEY] as number) || 10}
                    onPageSizeChange={pageSize =>
                        setUISettings(current => updateUISettings(current, { [AGENT_TABLE_PAGE_SIZE_KEY]: pageSize }))
                    }
                />
            </MetricCard>
        </div>
    );
}
