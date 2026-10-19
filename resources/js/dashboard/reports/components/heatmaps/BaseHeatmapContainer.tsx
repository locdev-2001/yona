import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { differenceInCalendarDays, endOfDay, format, getUnixTime, startOfDay, startOfMonth, subDays } from 'date-fns';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu, { type DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { downloadCsvFile, generateFileName } from 'dashboard/helper/downloadHelper';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { getConversationTrafficCsv } from '../../api';
import { useAccountDirectory, type OverviewInbox } from '../../composables/useAccountDirectory';
import { useLiveRefresh } from '../../composables/useLiveRefresh';
import { fetchAccountHeatmap, reportsSelectors, useReportsState } from '../../store';
import MetricCard from '../overview/MetricCard';
import BaseHeatmap from './BaseHeatmap';
import HeatmapDateRangeSelector from './HeatmapDateRangeSelector';

// Port từ reports/components/heatmaps/BaseHeatmapContainer.vue

interface BaseHeatmapContainerProps {
    metric: string;
    title: string;
    downloadTitle: string;
    heatmapKind: 'conversation' | 'resolution';
    hasBackendDownload?: boolean;
    colorScheme?: 'blue' | 'green';
}

export default function BaseHeatmapContainer({
    metric,
    title,
    downloadTitle,
    heatmapKind,
    hasBackendDownload = false,
    colorScheme = 'blue',
}: BaseHeatmapContainerProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const uiFlags = useReportsState(reportsSelectors.overviewUIFlags);
    const heatmapData = useReportsState(
        heatmapKind === 'conversation'
            ? reportsSelectors.accountConversationHeatmap
            : reportsSelectors.accountResolutionHeatmap,
    );
    const { inboxes } = useAccountDirectory(accountId, ['inboxes']);

    const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | null>(null);
    const [selectedDaysBefore, setSelectedDaysBefore] = useState<number | null>(null);
    const [selectedInbox, setSelectedInbox] = useState<OverviewInbox | null>(null);
    const [isMonthFilter, setMonthFilter] = useState(false);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const [showInboxDropdown, setShowInboxDropdown] = useState(false);
    const inboxDropdownRef = useRef<HTMLDivElement>(null);
    useClickAway(inboxDropdownRef, () => setShowInboxDropdown(false), showInboxDropdown);

    const isLoading = uiFlags[
        heatmapKind === 'conversation' ? 'isFetchingAccountConversationsHeatmap' : 'isFetchingAccountResolutionsHeatmap'
    ];
    const isResolutionHeatmap = metric === 'resolutions_count';
    const numberOfRows = selectedRange ? differenceInCalendarDays(selectedRange.to, selectedRange.from) + 1 : 0;

    const inboxMenuItems: DropdownMenuItem[] = useMemo(
        () => [
            { label: t('INBOX_REPORTS.ALL_INBOXES'), value: 0, action: 'select_inbox' },
            ...inboxes.map(inbox => ({ label: inbox.name, value: inbox.id, action: 'select_inbox' })),
        ],
        [inboxes],
    );

    const selectedInboxLabel = selectedInbox
        ? (inboxMenuItems.find(item => item.value === selectedInbox.id)?.label ?? t('INBOX_REPORTS.ALL_INBOXES'))
        : t('INBOX_REPORTS.ALL_INBOXES');

    const formatHeatmapValue = (value: number) => {
        const scope = isResolutionHeatmap
            ? 'OVERVIEW_REPORTS.RESOLUTION_HEATMAP'
            : 'OVERVIEW_REPORTS.CONVERSATION_HEATMAP';

        if (!value) return t(`${scope}.NO_CONVERSATIONS`);
        return value === 1 ? t(`${scope}.CONVERSATION`, { count: value }) : t(`${scope}.CONVERSATIONS`, { count: value });
    };

    // resolveActiveRange: preset tương đối luôn bám "bây giờ" khi làm mới ngầm.
    const resolveActiveRange = (): { from: Date; to: Date } | null => {
        if (isMonthFilter && currentMonthOffset === 0) {
            const now = new Date();
            return { from: startOfDay(startOfMonth(now)), to: endOfDay(now) };
        }

        if (!isMonthFilter && selectedDaysBefore !== null) {
            const to = endOfDay(new Date());
            return { from: startOfDay(subDays(to, Number(selectedDaysBefore))), to };
        }

        return selectedRange;
    };

    const fetchHeatmapData = () => {
        if (isLoading) return;

        const range = resolveActiveRange();
        if (!range) return;

        void fetchAccountHeatmap(accountId, heatmapKind, {
            metric,
            from: getUnixTime(range.from),
            to: getUnixTime(range.to),
            groupBy: 'hour',
            businessHours: false,
            ...(selectedInbox ? { type: 'inbox', id: selectedInbox.id } : {}),
        });
    };

    const fetchRef = useRef(fetchHeatmapData);
    fetchRef.current = fetchHeatmapData;

    useEffect(() => {
        if (selectedRange) fetchRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRange, selectedInbox]);

    useLiveRefresh(() => fetchRef.current());

    const downloadHeatmapData = () => {
        const range = resolveActiveRange();
        if (!range) return;

        if (!isMonthFilter && !selectedInbox && hasBackendDownload) {
            void getConversationTrafficCsv(accountId, selectedDaysBefore ?? 6).then(content =>
                downloadCsvFile(generateFileName({ type: 'Conversation traffic', to: getUnixTime(range.to) }), content),
            );
            return;
        }

        if (!heatmapData || heatmapData.length === 0) return;

        const rows: Array<Array<string | number>> = [['Date', 'Hour', title]];
        heatmapData.forEach(item => {
            const date = new Date(item.timestamp * 1000);
            rows.push([format(date, 'yyyy-MM-dd'), `${date.getHours()}:00 - ${date.getHours() + 1}:00`, item.value]);
        });

        const inboxName = selectedInbox ? `_${selectedInbox.name.replace(/[^a-z0-9]/gi, '_')}` : '';
        downloadCsvFile(
            `${downloadTitle}${inboxName}_${format(new Date(), 'dd-MM-yyyy')}.csv`,
            rows.map(row => row.join(',')).join('\n'),
        );
    };

    return (
        <div className="flex flex-row flex-wrap max-w-full">
            <MetricCard
                header={title}
                control={
                    <>
                        <HeatmapDateRangeSelector
                            onChange={({ from, to, daysBefore, type, monthOffset }) => {
                                setSelectedRange({ from, to });
                                setSelectedDaysBefore(daysBefore);
                                setMonthFilter(type === 'month');
                                setCurrentMonthOffset(monthOffset);
                            }}
                        />
                        <div ref={inboxDropdownRef} className="relative flex items-center group">
                            <Button
                                sm
                                slate
                                faded
                                label={selectedInboxLabel}
                                className="rounded-md group-hover:bg-n-alpha-2 max-w-[200px]"
                                onClick={() => setShowInboxDropdown(current => !current)}
                            />
                            {showInboxDropdown && (
                                <DropdownMenu
                                    menuItems={inboxMenuItems}
                                    showSearch
                                    searchPlaceholder={t('INBOX_REPORTS.SEARCH_INBOX')}
                                    className="mt-1 ltr:right-0 rtl:left-0 xl:ltr:right-0 xl:rtl:left-0 top-full !min-w-56 max-w-56 max-h-96"
                                    onAction={item => {
                                        setShowInboxDropdown(false);
                                        const value = Number(item.value);
                                        setSelectedInbox(value ? (inboxes.find(inbox => inbox.id === value) ?? null) : null);
                                    }}
                                />
                            )}
                        </div>
                        <Button
                            sm
                            slate
                            faded
                            icon="i-lucide-download"
                            className="rounded-md group-hover:bg-n-alpha-2"
                            title={t('OVERVIEW_REPORTS.CONVERSATION_HEATMAP.DOWNLOAD_REPORT')}
                            onClick={downloadHeatmapData}
                        />
                    </>
                }
            >
                <BaseHeatmap
                    heatmapData={heatmapData}
                    numberOfRows={numberOfRows}
                    isLoading={isLoading}
                    colorScheme={colorScheme}
                    ariaLabel={t('OVERVIEW_REPORTS.HEATMAP_ARIA_LABEL', { metric: title })}
                    formatValue={formatHeatmapValue}
                />
            </MetricCard>
        </div>
    );
}
