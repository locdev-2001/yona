import { useEffect, useMemo, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { formatTime } from '@ext/utils';
import { ICONS } from 'dashboard/icons';

import Button from 'dashboard/components-next/button/Button';
import SidePanel from 'dashboard/components-next/side-panel/SidePanel';
import Loader from 'shared/components/loader/Loader';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { createReportDrilldownFetcher, useReportDrilldown } from '../composables/useReportDrilldown';
import type { DrilldownRecord } from '../types';
import ReportDrilldownCard from './ReportDrilldownCard';

// Port từ reports/components/ReportDrilldownDrawer.vue

export interface DrilldownRequest {
    metric: string;
    metricName: string;
    bucketLabel: string;
    bucketTimestamp: number;
    bucketValue: number;
    isAverageMetric: boolean;
    from: number;
    to: number;
    type: string;
    id: string | number | null;
    groupBy?: string;
    businessHours: boolean;
}

interface ReportDrilldownDrawerProps {
    open: boolean;
    request: DrilldownRequest | null;
    canPrev?: boolean;
    canNext?: boolean;
    onNavigate: (direction: number) => void;
    onClose: () => void;
}

const recordKey = (record: DrilldownRecord) =>
    `${record.record_type}-${record.message?.id || record.conversation?.id}-${record.occurred_at}`;

export default function ReportDrilldownDrawer({
    open,
    request,
    canPrev = false,
    canNext = false,
    onNavigate,
    onClose,
}: ReportDrilldownDrawerProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const fetcher = useMemo(() => createReportDrilldownFetcher(currentAccount.id), [currentAccount.id]);
    const { records, meta, isFetching, isFetchingMore, hasError, hasRecords, hasMore, open: openDrilldown, close, loadMore } =
        useReportDrilldown(fetcher);

    const title = request?.metricName || '';
    const bucketValue =
        request?.bucketValue === null || request?.bucketValue === undefined
            ? ''
            : request.isAverageMetric
              ? formatTime(request.bucketValue)
              : `${request.bucketValue}`;

    // Chỉ số đếm hội thoại đã hiện ở dòng lớn nên bỏ đếm lặp ở phụ đề.
    const isStatConversationCount =
        !request?.isAverageMetric && meta.record_type === 'conversation' && request?.bucketValue === meta.conversation_count;

    const conversationCount =
        !meta.conversation_count || isStatConversationCount
            ? ''
            : t('REPORT.DRILLDOWN.RESULT_COUNT_CONVERSATION', { count: meta.conversation_count, n: meta.conversation_count });

    const messageCount =
        !request?.isAverageMetric ||
        meta.record_type !== 'message' ||
        !meta.total_count ||
        meta.total_count === meta.conversation_count
            ? ''
            : t('REPORT.DRILLDOWN.RESULT_COUNT_MESSAGE', { count: meta.total_count, n: meta.total_count });

    const subtitle = [request?.bucketLabel, conversationCount, messageCount].filter(Boolean).join(' ⋅ ');

    const navigate = (direction: number) => {
        if (direction < 0 && !canPrev) return;
        if (direction > 0 && !canNext) return;
        onNavigate(direction);
    };

    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

    useEffect(() => {
        if (!open) return undefined;
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') navigateRef.current(-1);
            else if (event.key === 'ArrowRight') navigateRef.current(1);
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, [open]);

    useEffect(() => {
        if (!open || !request) {
            close();
            return;
        }
        void openDrilldown({
            metric: request.metric,
            bucketTimestamp: request.bucketTimestamp,
            from: request.from,
            to: request.to,
            type: request.type,
            id: request.id,
            groupBy: request.groupBy,
            businessHours: request.businessHours,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, request?.metric, request?.bucketTimestamp]);

    return (
        <SidePanel
            open={open}
            title={title}
            width="xl"
            onClose={onClose}
            header={
                <div className="min-w-0">
                    <h3 className="truncate text-base font-medium text-n-slate-12">{title}</h3>
                    {bucketValue && <p className="mt-1 text-xl font-semibold text-n-slate-12">{bucketValue}</p>}
                    <div className={`text-sm text-n-slate-11 ${bucketValue ? 'mt-2' : 'mt-1'}`}>{subtitle}</div>
                </div>
            }
            headerActions={
                <>
                    <Button
                        ghost
                        slate
                        size="sm"
                        icon={ICONS.chevronLeft}
                        className="rtl:rotate-180"
                        disabled={!canPrev}
                        aria-label={t('REPORT.DRILLDOWN.PREVIOUS_BUCKET')}
                        onClick={() => navigate(-1)}
                    />
                    <Button
                        ghost
                        slate
                        size="sm"
                        icon={ICONS.chevronRight}
                        className="rtl:rotate-180"
                        disabled={!canNext}
                        aria-label={t('REPORT.DRILLDOWN.NEXT_BUCKET')}
                        onClick={() => navigate(1)}
                    />
                </>
            }
        >
            {isFetching ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader />
                </div>
            ) : hasError ? (
                <div className="flex h-40 items-center justify-center text-sm text-n-ruby-11">
                    {t('REPORT.DRILLDOWN.ERROR')}
                </div>
            ) : !hasRecords ? (
                <div className="flex h-40 items-center justify-center text-sm text-n-slate-10">
                    {t('REPORT.DRILLDOWN.EMPTY')}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {records.map(record => (
                        <ReportDrilldownCard key={recordKey(record)} record={record} />
                    ))}
                    {hasMore && (
                        <Button
                            faded
                            slate
                            size="sm"
                            className="mx-auto mt-2"
                            label={t('REPORT.DRILLDOWN.LOAD_MORE')}
                            isLoading={isFetchingMore}
                            onClick={loadMore}
                        />
                    )}
                </div>
            )}
        </SidePanel>
    );
}
