import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import { downloadCsvFile, generateFileName } from 'dashboard/helper/downloadHelper';
import Dashboard from '../Dashboard';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { getConversationsSummaryReports } from './api';
import ReportFilters, { type ReportFilterChange } from './components/ReportFilters';
import ReportHeader from './components/ReportHeader';
import ReportsWrapper from './components/ReportsWrapper';
import ReportContainer, { DEFAULT_REPORT_KEYS } from './ReportContainer';
import { GROUP_BY_FILTER, type GroupByFilter } from './constants';
import { fetchAccountReport, fetchAccountSummary } from './store';

// Port từ reports/Index.vue (route `/reports/conversation`).
export default function ConversationReports() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);
    const [groupBy, setGroupBy] = useState<GroupByFilter>(GROUP_BY_FILTER[1]);
    const [businessHours, setBusinessHours] = useState(false);

    const fetchAllData = (payload: { from: number; to: number; groupBy?: string; businessHours: boolean }) => {
        void fetchAccountSummary(accountId, payload).catch(() => useAlert(t('REPORT.SUMMARY_FETCHING_FAILED')));

        Object.values(DEFAULT_REPORT_KEYS).forEach(metric => {
            void fetchAccountReport(accountId, { metric, ...payload }).catch(() =>
                useAlert(t('REPORT.DATA_FETCHING_FAILED')),
            );
        });
    };

    const onFilterChange = ({ from: nextFrom, to: nextTo, groupBy: nextGroupBy, businessHours: nextBusinessHours }: ReportFilterChange) => {
        setFrom(nextFrom);
        setTo(nextTo);
        if (nextGroupBy) setGroupBy(nextGroupBy);
        setBusinessHours(nextBusinessHours);

        fetchAllData({
            from: nextFrom,
            to: nextTo,
            groupBy: nextGroupBy?.period,
            businessHours: nextBusinessHours,
        });
    };

    const downloadConversationReports = () => {
        void getConversationsSummaryReports(accountId, { from, to, businessHours })
            .then(content =>
                downloadCsvFile(generateFileName({ type: 'conversation', to, businessHours }), content),
            )
            .catch(() => useAlert(t('REPORT.DATA_FETCHING_FAILED')));
    };

    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={t('REPORT.HEADER')}>
                    <Button
                        label={t('REPORT.DOWNLOAD_CONVERSATION_REPORTS')}
                        icon="i-ph-download-simple"
                        size="sm"
                        onClick={downloadConversationReports}
                    />
                </ReportHeader>
                <div className="flex flex-col">
                    <ReportFilters showGroupBy onFilterChange={onFilterChange} />
                    <ReportContainer groupBy={groupBy} from={from} to={to} businessHours={businessHours} />
                </div>
            </ReportsWrapper>
        </Dashboard>
    );
}
