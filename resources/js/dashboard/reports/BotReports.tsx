import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import Dashboard from '../Dashboard';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import BotMetrics from './components/BotMetrics';
import ReportFilters, { type ReportFilterChange } from './components/ReportFilters';
import ReportHeader from './components/ReportHeader';
import ReportsWrapper from './components/ReportsWrapper';
import ReportContainer from './ReportContainer';
import { GROUP_BY_FILTER, type GroupByFilter } from './constants';
import { fetchAccountReport, fetchBotSummary, reportsSelectors } from './store';

// Port từ reports/BotReports.vue (route `/reports/bot`).

const BOT_REPORT_KEYS: Record<string, string> = {
    BOT_RESOLUTION_COUNT: 'bot_resolutions_count',
    BOT_HANDOFF_COUNT: 'bot_handoffs_count',
};

export default function BotReports() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);
    const [groupBy, setGroupBy] = useState<GroupByFilter>(GROUP_BY_FILTER[1]);
    const [businessHours, setBusinessHours] = useState(false);

    const onFilterChange = ({ from: nextFrom, to: nextTo, groupBy: nextGroupBy, businessHours: nextBusinessHours }: ReportFilterChange) => {
        setFrom(nextFrom);
        setTo(nextTo);
        setGroupBy(nextGroupBy ?? GROUP_BY_FILTER[1]);
        setBusinessHours(nextBusinessHours);

        const request = {
            from: nextFrom,
            to: nextTo,
            groupBy: (nextGroupBy ?? GROUP_BY_FILTER[1]).period,
            businessHours: nextBusinessHours,
        };

        void fetchBotSummary(accountId, request).catch(() => useAlert(t('REPORT.SUMMARY_FETCHING_FAILED')));
        Object.values(BOT_REPORT_KEYS).forEach(metric => {
            void fetchAccountReport(accountId, { metric, ...request }).catch(() =>
                useAlert(t('REPORT.DATA_FETCHING_FAILED')),
            );
        });
    };

    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={t('BOT_REPORTS.HEADER')} />
                <div className="flex flex-col gap-4">
                    <ReportFilters showGroupBy showBusinessHours={false} onFilterChange={onFilterChange} />
                    <BotMetrics filters={{ from, to }} />
                    <ReportContainer
                        accountSummarySelector={reportsSelectors.botSummary}
                        summaryFetchingSelector={reportsSelectors.botSummaryFetchingStatus}
                        groupBy={groupBy}
                        reportKeys={BOT_REPORT_KEYS}
                        from={from}
                        to={to}
                        businessHours={businessHours}
                    />
                </div>
            </ReportsWrapper>
        </Dashboard>
    );
}
