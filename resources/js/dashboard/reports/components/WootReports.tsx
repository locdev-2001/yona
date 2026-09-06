import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import type { DropdownListItem } from 'dashboard/components/ui/Dropdown/DropdownList';
import { useAlert } from 'dashboard/composables/useAlert';
import { downloadCsvFile, generateFileName } from 'dashboard/helper/downloadHelper';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { getEntityReportsCsv, type EntityReportType } from '../api';
import ReportContainer from '../ReportContainer';
import { GROUP_BY_FILTER, type GroupByFilter } from '../constants';
import { fetchAccountReport, fetchAccountSummary } from '../store';
import ReportFilters, { type ReportFilterChange } from './ReportFilters';
import ReportHeader from './ReportHeader';
import ReportsWrapper from './ReportsWrapper';

// Port từ reports/components/WootReports.vue — dùng chung cho 4 trang cũ
// (`/reports/{agent,inboxes,label,teams}`) và 4 trang drilldown `…/{id}`.

export interface ReportEntity {
    id: number;
    name: string;
}

interface WootReportsProps {
    type: EntityReportType;
    entities: ReportEntity[];
    downloadButtonLabel: string;
    reportTitle: string;
    hasBackButton?: boolean;
    selectedItem?: ReportEntity | null;
}

const FILTER_TYPES: Record<EntityReportType, 'agents' | 'inboxes' | 'labels' | 'teams'> = {
    agent: 'agents',
    inbox: 'inboxes',
    label: 'labels',
    team: 'teams',
};

const SHOW_PATHS: Record<EntityReportType, string> = {
    agent: 'reports/agents',
    inbox: 'reports/inboxes',
    label: 'reports/labels',
    team: 'reports/teams',
};

const PLACEHOLDER_KEYS: Record<EntityReportType, string> = {
    agent: 'AGENT_REPORTS.FILTERS.INPUT_PLACEHOLDER.AGENTS',
    inbox: 'INBOX_REPORTS.FILTERS.INPUT_PLACEHOLDER.INBOXES',
    label: 'LABEL_REPORTS.FILTERS.INPUT_PLACEHOLDER.LABELS',
    team: 'TEAM_REPORTS.FILTERS.INPUT_PLACEHOLDER.TEAMS',
};

const DEFAULT_LABEL_KEYS: Record<EntityReportType, string> = {
    agent: 'AGENT_REPORTS.FILTER_DROPDOWN_LABEL',
    inbox: 'INBOX_REPORTS.FILTER_DROPDOWN_LABEL',
    label: 'LABEL_REPORTS.FILTER_DROPDOWN_LABEL',
    team: 'TEAM_REPORTS.FILTER_DROPDOWN_LABEL',
};

// Bản gốc bỏ chỉ số "tin nhắn đến" khi báo cáo theo nhân viên.
export function reportKeysFor(type: EntityReportType): Record<string, string> {
    return {
        CONVERSATIONS: 'conversations_count',
        ...(type === 'agent' ? {} : { INCOMING_MESSAGES: 'incoming_messages_count' }),
        OUTGOING_MESSAGES: 'outgoing_messages_count',
        FIRST_RESPONSE_TIME: 'avg_first_response_time',
        RESOLUTION_TIME: 'avg_resolution_time',
        RESOLUTION_COUNT: 'resolutions_count',
        REPLY_TIME: 'reply_time',
    };
}

export default function WootReports({
    type,
    entities,
    downloadButtonLabel,
    reportTitle,
    hasBackButton = false,
    selectedItem = null,
}: WootReportsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);
    const [groupBy, setGroupBy] = useState<GroupByFilter>(GROUP_BY_FILTER[1]);
    const [businessHours, setBusinessHours] = useState(false);

    const reportKeys = reportKeysFor(type);

    const fetchAllData = (payload: { from: number; to: number; groupBy?: string; businessHours: boolean }) => {
        if (!selectedItem) return;

        const request = { ...payload, type, id: selectedItem.id };
        void fetchAccountSummary(accountId, request).catch(() => useAlert(t('REPORT.SUMMARY_FETCHING_FAILED')));
        Object.values(reportKeys).forEach(metric => {
            void fetchAccountReport(accountId, { metric, ...request }).catch(() =>
                useAlert(t('REPORT.DATA_FETCHING_FAILED')),
            );
        });
    };

    const onFilterChange = ({ from: nextFrom, to: nextTo, groupBy: nextGroupBy, businessHours: nextBusinessHours }: ReportFilterChange) => {
        setFrom(nextFrom);
        setTo(nextTo);
        setGroupBy(nextGroupBy ?? GROUP_BY_FILTER[1]);
        setBusinessHours(nextBusinessHours);

        fetchAllData({
            from: nextFrom,
            to: nextTo,
            groupBy: (nextGroupBy ?? GROUP_BY_FILTER[1]).period,
            businessHours: nextBusinessHours,
        });
    };

    const downloadReports = () => {
        void getEntityReportsCsv(accountId, type, { from, to, businessHours })
            .then(content => downloadCsvFile(generateFileName({ type, to, businessHours }), content))
            .catch(() => undefined);
    };

    // Bản gốc điều hướng sang trang chi tiết của thực thể vừa chọn, giữ nguyên query.
    const onSelectEntity = (item: DropdownListItem) => {
        router.visit(`${accountScopedUrl(accountId, `${SHOW_PATHS[type]}/${item.id}`)}${window.location.search}`);
    };

    const options: DropdownListItem[] = entities.map(entity => ({ id: entity.id, name: entity.name }));

    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={reportTitle} hasBackButton={hasBackButton}>
                    <Button
                        label={downloadButtonLabel}
                        icon="i-ph-download-simple"
                        size="sm"
                        onClick={downloadReports}
                    />
                </ReportHeader>

                <ReportFilters
                    entityFilter={{
                        filterType: FILTER_TYPES[type],
                        options,
                        selectedId: selectedItem?.id ?? null,
                        placeholder: t(PLACEHOLDER_KEYS[type]),
                        defaultLabel: t(DEFAULT_LABEL_KEYS[type]),
                        onSelect: onSelectEntity,
                    }}
                    onFilterChange={onFilterChange}
                />
                {entities.length > 0 && (
                    <ReportContainer
                        groupBy={groupBy}
                        reportKeys={reportKeys}
                        from={from}
                        to={to}
                        reportType={type}
                        selectedItemId={selectedItem?.id ?? null}
                        businessHours={businessHours}
                    />
                )}
            </ReportsWrapper>
        </Dashboard>
    );
}
