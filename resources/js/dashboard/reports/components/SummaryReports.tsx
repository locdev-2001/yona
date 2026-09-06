import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { formatTime } from '@chatwoot/utils';

import Button from 'dashboard/components-next/button/Button';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import Table, { type TableColumn } from 'dashboard/components/table/Table';
import { useTableModel } from 'dashboard/components/table/useTableModel';
import { useAlert } from 'dashboard/composables/useAlert';
import { downloadCsvFile, generateFileName } from 'dashboard/helper/downloadHelper';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { getEntityReportsCsv, getSummaryReports, type EntityReportType } from '../api';
import { useReportEntities } from '../composables/useReportEntities';
import OverviewReportFilters from './OverviewReportFilters';
import ReportHeader from './ReportHeader';
import ReportsWrapper from './ReportsWrapper';

// Port từ reports/components/SummaryReports.vue + 4 trang *ReportsIndex.vue —
// gộp một component vì bốn trang chỉ khác `type` và namespace i18n; nút tải về
// của bản gốc gọi ngược vào con qua `ref`, ở đây trạng thái bộ lọc nằm sẵn ở đây.

interface SummaryRow {
    id: number;
    conversations_count?: number;
    resolved_conversations_count?: number;
    avg_resolution_time?: number | null;
    avg_first_response_time?: number | null;
    avg_reply_time?: number | null;
}

interface SummaryTableRow {
    id: number;
    name: string;
    conversationsCount: string;
    avgFirstResponseTime: string;
    avgResolutionTime: string;
    avgReplyTime: string;
    resolutionsCount: string;
}

const NAMESPACES: Record<EntityReportType, string> = {
    agent: 'AGENT_REPORTS',
    inbox: 'INBOX_REPORTS',
    label: 'LABEL_REPORTS',
    team: 'TEAM_REPORTS',
};

const SHOW_PATHS: Record<EntityReportType, string> = {
    agent: 'reports/agents',
    inbox: 'reports/inboxes',
    label: 'reports/labels',
    team: 'reports/teams',
};

// Bảng hiển thị mọi thực thể của tài khoản, bản gốc không phân trang.
const ALL_ROWS_IN_ONE_PAGE = Number.MAX_SAFE_INTEGER;

const renderAvgTime = (value?: number | null) => (value ? formatTime(value) : '--');
const renderCount = (value?: number | null) => (value ? value.toLocaleString() : '--');

export default function SummaryReports({ type }: { type: EntityReportType }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const namespace = NAMESPACES[type];

    const entities = useReportEntities(accountId, type);

    const [range, setRange] = useState({ from: 0, to: 0, businessHours: false });
    const [metrics, setMetrics] = useState<SummaryRow[]>([]);
    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
        if (!range.to) return;

        let cancelled = false;
        setLoading(true);
        // Bản gốc thử lại đúng một lần trước khi báo lỗi.
        const request = () =>
            getSummaryReports(accountId, type, {
                since: range.from,
                until: range.to,
                businessHours: range.businessHours,
            }) as Promise<SummaryRow[]>;

        void request()
            .catch(() => request())
            .then(rows => {
                if (!cancelled) setMetrics(rows ?? []);
            })
            .catch(() => useAlert(t('REPORT.SUMMARY_FETCHING_FAILED')))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, type, range]);

    const tableData: SummaryTableRow[] = entities.map(entity => {
        const rowMetrics = metrics.find(metric => metric.id === Number(entity.id)) ?? ({} as SummaryRow);
        return {
            id: entity.id,
            name: entity.name,
            conversationsCount: renderCount(rowMetrics.conversations_count),
            avgFirstResponseTime: renderAvgTime(rowMetrics.avg_first_response_time),
            avgReplyTime: renderAvgTime(rowMetrics.avg_reply_time),
            avgResolutionTime: renderAvgTime(rowMetrics.avg_resolution_time),
            resolutionsCount: renderCount(rowMetrics.resolved_conversations_count),
        };
    });

    const table = useTableModel(tableData, ALL_ROWS_IN_ONE_PAGE);

    const textCell = (value: string) => <span className={value ? '' : 'text-n-slate-12'}>{value}</span>;

    const columns: TableColumn<SummaryTableRow>[] = [
        {
            id: 'name',
            header: t(`SUMMARY_REPORTS.${type.toUpperCase()}`),
            size: 300,
            cell: row => (
                <Link
                    href={accountScopedUrl(accountId, `${SHOW_PATHS[type]}/${row.id}`)}
                    className="text-n-slate-12 hover:underline"
                >
                    {row.name}
                </Link>
            ),
        },
        { id: 'conversationsCount', header: t('SUMMARY_REPORTS.CONVERSATIONS'), size: 200, cell: row => textCell(row.conversationsCount) },
        { id: 'avgFirstResponseTime', header: t('SUMMARY_REPORTS.AVG_FIRST_RESPONSE_TIME'), size: 200, cell: row => textCell(row.avgFirstResponseTime) },
        { id: 'avgResolutionTime', header: t('SUMMARY_REPORTS.AVG_RESOLUTION_TIME'), size: 200, cell: row => textCell(row.avgResolutionTime) },
        { id: 'avgReplyTime', header: t('SUMMARY_REPORTS.AVG_REPLY_TIME'), size: 200, cell: row => textCell(row.avgReplyTime) },
        { id: 'resolutionsCount', header: t('SUMMARY_REPORTS.RESOLUTION_COUNT'), size: 200, cell: row => textCell(row.resolutionsCount) },
    ];

    const downloadReports = () => {
        void getEntityReportsCsv(accountId, type, {
            from: range.from,
            to: range.to,
            businessHours: range.businessHours,
        })
            .then(content =>
                downloadCsvFile(generateFileName({ type, to: range.to, businessHours: range.businessHours }), content),
            )
            .catch(() => undefined);
    };

    return (
        <Dashboard>
            <ReportsWrapper>
                <ReportHeader headerTitle={t(`${namespace}.HEADER`)} headerDescription={t(`${namespace}.DESCRIPTION`)}>
                    <Button
                        label={t(`${namespace}.DOWNLOAD_${type.toUpperCase()}_REPORTS`)}
                        icon="i-ph-download-simple"
                        size="sm"
                        onClick={downloadReports}
                    />
                </ReportHeader>

                <OverviewReportFilters disabled={isLoading} onFilterChange={setRange} />

                <div className="relative flex-1 overflow-auto px-2 py-2 mt-5 shadow outline-1 outline outline-n-container rounded-xl bg-n-solid-2">
                    <Table table={table} columns={columns} rowKey={row => row.id} />
                    {isLoading && (
                        <div className="absolute inset-0 flex justify-center pt-[12.5rem] bg-n-solid-1/70 rounded-xl pointer-events-none">
                            <Spinner size={32} className="text-n-brand" />
                        </div>
                    )}
                </div>
            </ReportsWrapper>
        </Dashboard>
    );
}
