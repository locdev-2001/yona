import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Button from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import { downloadCsvFile, generateFileName } from 'dashboard/helper/downloadHelper';
import Dashboard from '../Dashboard';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { getCsatCsv, type CsatFilterParams } from './api';
import CsatFilters, { type CsatFilterChange } from './components/Csat/CsatFilters';
import CsatMetrics from './components/CsatMetrics';
import CsatTable from './components/CsatTable';
import ReportHeader from './components/ReportHeader';
import ReportsWrapper from './components/ReportsWrapper';
import { fetchCsatMetrics, fetchCsatResponses } from './csatStore';

// Port từ reports/CsatResponses.vue (route `/reports/csat`).
export default function CsatResponses() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [pageIndex, setPageIndex] = useState(0);
    const [filters, setFilters] = useState<CsatFilterParams>({ from: 0, to: 0 });

    const isTeamsEnabled = Boolean(currentAccount.features?.team_management);

    const loadPage = (nextFilters: CsatFilterParams, nextPageIndex: number) => {
        void fetchCsatResponses(accountId, { ...nextFilters, page: nextPageIndex + 1 });
    };

    const onFilterChange = ({ from, to, selectedAgents, selectedInbox, selectedTeam, selectedRating }: CsatFilterChange) => {
        const nextFilters: CsatFilterParams = {
            from,
            to,
            user_ids: selectedAgents.map(agent => agent.id),
            inbox_id: selectedInbox?.id ?? null,
            team_id: selectedTeam?.id ?? null,
            rating: selectedRating?.value ?? null,
        };
        setFilters(nextFilters);

        try {
            void fetchCsatMetrics(accountId, nextFilters);
            loadPage(nextFilters, pageIndex);
        } catch {
            useAlert(t('REPORT.DATA_FETCHING_FAILED'));
        }
    };

    const downloadReports = () => {
        void getCsatCsv(accountId, filters)
            .then(content => downloadCsvFile(generateFileName({ type: 'csat', to: filters.to }), content))
            .catch(() => useAlert(t('CSAT_REPORTS.DOWNLOAD_FAILED')));
    };

    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={t('CSAT_REPORTS.HEADER')}>
                    <Button
                        label={t('CSAT_REPORTS.DOWNLOAD')}
                        icon={ICONS.download}
                        size="sm"
                        onClick={downloadReports}
                    />
                </ReportHeader>

                <div className="flex flex-col gap-6">
                    <CsatFilters showTeamFilter={isTeamsEnabled} onFilterChange={onFilterChange} />
                    <CsatMetrics />
                    <CsatTable
                        pageIndex={pageIndex}
                        onPageChange={nextPageIndex => {
                            setPageIndex(nextPageIndex);
                            loadPage(filters, nextPageIndex);
                        }}
                    />
                </div>
            </ReportsWrapper>
        </Dashboard>
    );
}
