import { Head } from '@inertiajs/react';
import {
    BotIcon,
    BrainCircuitIcon,
    ChevronDownIcon,
    ChevronsUpDownIcon,
    ChevronUpIcon,
    CircleAlertIcon,
    DatabaseZapIcon,
    DollarSignIcon,
    TimerIcon,
    UserRoundIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@admin/components/ui/toggle-group';
import { cn } from '@admin/lib/utils';
import TimeSeriesChart from '@admin/views/dashboards/charts/chart-sales-metrics';
import type { ChartSeries } from '@admin/views/dashboards/charts/chart-sales-metrics';
import StatisticsCard from '@admin/views/dashboards/statistics/statistics-card-01';
import { MEANING_TONE, TONE_FILL, type Tone } from '@admin/views/dashboards/tones';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import DateInput from '@admin/views/datatables/filters/date-input';
import type { DateInputLabels } from '@admin/views/datatables/filters/date-input';
import { FilterSelect } from '@admin/views/datatables/list/list-filters';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import {
    averageLatencySeconds,
    cacheHitRatio,
    dayStarts,
    formatCompact,
    formatCount,
    formatDayKey,
    formatHourAsDay,
    formatHourKey,
    formatHourWithDay,
    formatPercent,
    formatSeconds,
    formatSignedNumber,
    formatUsd,
    pointChange,
    ratio,
    relativeChange,
    sortAccounts,
    trendOf,
} from './aiAnalyticsMetrics';
import type { AccountSort, AccountSortKey, AccountUsage, UsageTotals } from './aiAnalyticsMetrics';
import { visitWithParams } from './operationsFormat';

export const PAGE_URL = '/admin/ai_analytics';

// Nhãn trục dọc dài ("$0.105", "300K") cần cột rộng hơn mặc định.
const AXIS_WIDTH = 64;

const CUSTOM = 'custom';

type Option = { value: string; label: string };

type Bucket = {
    key: string;
    turns: number;
    replies: number;
    handoffs: number;
    failed_turns: number;
    input_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    output_tokens: number;
    failed_calls: number;
    route_changes: number;
    model_calls: number;
};

export type AiAnalyticsProps = {
    window: { preset: string; from: string; to: string; startsAt: string; endsBefore: string; bucket: 'hour' | 'day' };
    presets: string[];
    filters: { accountId: number | null; aiAgentId: number | null };
    totals: UsageTotals;
    previousTotals: UsageTotals;
    hourlyCost: { at: string; cost: number; previousCost: number }[];
    buckets: Bucket[];
    accounts: AccountUsage[];
    options: { accounts: Option[]; aiAgents: { value: string; label: string | null; accountId: number }[] };
};

type Query = { range: string; from?: string; to?: string; account_id?: string; ai_agent_id?: string };

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_AI_ANALYTICS.${key}`, params);

const deletedAiAgent = (id: string) => label('FILTERS.DELETED_AI_AGENT', { id });
const accountName = (row: AccountUsage) => row.name ?? label('FILTERS.DELETED_ACCOUNT', { id: row.accountId });

type Kpi = {
    key: string;
    title: string;
    value: string;
    caption?: string;
    // Chênh lệch đã tính: % tương đối với số đếm/chi phí, điểm phần trăm với tỉ lệ.
    change: number | null;
    changeUnit: 'percent' | 'points';
    goodWhen: 'up' | 'down';
    tone: Tone;
    icon: ReactNode;
};

function kpis(current: UsageTotals, previous: UsageTotals): Kpi[] {
    const rateOf = (totals: UsageTotals, part: number) => ratio(part, totals.turns);
    const autonomy = rateOf(current, current.replies);
    const handoffs = rateOf(current, current.handoffs);
    const failed = rateOf(current, current.failed_turns);
    const cache = cacheHitRatio(current);
    const latency = averageLatencySeconds(current);

    return [
        {
            key: 'cost',
            title: label('KPI.COST'),
            value: formatUsd(current.cost_micro_usd),
            change: relativeChange(current.cost_micro_usd, previous.cost_micro_usd),
            changeUnit: 'percent',
            goodWhen: 'down',
            tone: 'primary',
            icon: <DollarSignIcon className="size-4" />,
        },
        {
            key: 'turns',
            title: label('KPI.TURNS'),
            value: formatCount(current.turns),
            caption: label('KPI.AI_AGENTS_NOTE', { count: formatCount(current.ai_agents) }),
            change: relativeChange(current.turns, previous.turns),
            changeUnit: 'percent',
            goodWhen: 'up',
            tone: MEANING_TONE.conversations,
            icon: <BrainCircuitIcon className="size-4" />,
        },
        {
            key: 'autonomy',
            title: label('KPI.AUTONOMY'),
            value: formatPercent(autonomy),
            caption: label('KPI.AUTONOMY_NOTE'),
            change: pointChange(autonomy, rateOf(previous, previous.replies)),
            changeUnit: 'points',
            goodWhen: 'up',
            tone: MEANING_TONE.healthy,
            icon: <BotIcon className="size-4" />,
        },
        {
            key: 'handoffs',
            title: label('KPI.HANDOFFS'),
            value: formatPercent(handoffs),
            caption: label('KPI.TURNS_NOTE', { count: formatCount(current.handoffs) }),
            change: pointChange(handoffs, rateOf(previous, previous.handoffs)),
            changeUnit: 'points',
            goodWhen: 'down',
            tone: MEANING_TONE.problem,
            icon: <UserRoundIcon className="size-4" />,
        },
        {
            key: 'failed',
            title: label('KPI.FAILED'),
            value: formatPercent(failed),
            caption: label('KPI.TURNS_NOTE', { count: formatCount(current.failed_turns) }),
            change: pointChange(failed, rateOf(previous, previous.failed_turns)),
            changeUnit: 'points',
            goodWhen: 'down',
            tone: current.failed_turns > 0 ? MEANING_TONE.failing : 'neutral',
            icon: <CircleAlertIcon className="size-4" />,
        },
        {
            key: 'cache',
            title: label('KPI.CACHE'),
            value: formatPercent(cache),
            caption: label('KPI.CACHE_NOTE'),
            change: pointChange(cache, cacheHitRatio(previous)),
            changeUnit: 'points',
            goodWhen: 'up',
            tone: 'navy',
            icon: <DatabaseZapIcon className="size-4" />,
        },
        {
            key: 'latency',
            title: label('KPI.LATENCY'),
            value: formatSeconds(latency),
            caption: label('KPI.LATENCY_NOTE'),
            change: relativeChange(latency, averageLatencySeconds(previous)),
            changeUnit: 'percent',
            goodWhen: 'down',
            tone: MEANING_TONE.system,
            icon: <TimerIcon className="size-4" />,
        },
    ];
}

function KpiCards({ current, previous }: { current: UsageTotals; previous: UsageTotals }) {
    return (
        <section aria-label={label('KPI.LABEL')} className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
            {kpis(current, previous).map(kpi => (
                <StatisticsCard
                    key={kpi.key}
                    title={kpi.title}
                    value={kpi.value}
                    caption={kpi.caption}
                    tone={kpi.tone}
                    icon={kpi.icon}
                    goodWhen={kpi.goodWhen}
                    trend={trendOf(kpi.change)}
                    changePercentage={
                        kpi.change === null
                            ? null
                            : kpi.changeUnit === 'points'
                              ? label('KPI.POINTS', { value: formatSignedNumber(kpi.change) })
                              : `${formatSignedNumber(kpi.change)}%`
                    }
                    comparisonText={label('KPI.VS_PREVIOUS')}
                    note={label('KPI.NO_PREVIOUS')}
                />
            ))}
        </section>
    );
}

function ChartCard({ title, children, footer, className }: { title: string; children: ReactNode; footer?: ReactNode; className?: string }) {
    return (
        <Card className={cn('min-w-0', className)}>
            <CardHeader>
                <CardTitle role="heading" aria-level={2} className="text-sm font-medium">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {children}
                {footer ? <p className="text-xs text-neutral-500">{footer}</p> : null}
            </CardContent>
        </Card>
    );
}

const summaryOf = (series: ChartSeries[], format: (value: number) => string) =>
    series
        .map(item =>
            label('CHARTS.SUMMARY', { label: item.label, total: format(item.values.reduce((sum, value) => sum + value, 0)) }),
        )
        .join(' ');

function BucketChart({
    title,
    buckets,
    unit,
    series,
    variant,
    stacked = false,
    formatValue = formatCount,
    yAxisWidth,
}: {
    title: string;
    buckets: Bucket[];
    unit: 'hour' | 'day';
    series: ChartSeries[];
    variant: 'line' | 'bar';
    stacked?: boolean;
    formatValue?: (value: number) => string;
    yAxisWidth?: number;
}) {
    return (
        <TimeSeriesChart
            title={title}
            dates={buckets.map(bucket => bucket.key)}
            series={series}
            variant={variant}
            stacked={stacked}
            summary={summaryOf(series, formatValue)}
            dateLabel={label('CHARTS.TIME')}
            formatDate={unit === 'hour' ? formatHourWithDay : formatDayKey}
            formatTick={unit === 'hour' ? formatHourKey : formatDayKey}
            formatValue={formatValue}
            yAxisWidth={yAxisWidth}
        />
    );
}

type Column = { key: AccountSortKey; title: string; numeric: boolean };

function AccountTable({ rows, selectedId, onSelect }: { rows: AccountUsage[]; selectedId: number | null; onSelect: (row: AccountUsage) => void }) {
    const [sort, setSort] = useState<AccountSort>({ key: 'cost', direction: 'desc' });
    const sorted = useMemo(() => sortAccounts(rows, sort), [rows, sort]);
    const columns: Column[] = [
        { key: 'name', title: label('TABLE.ACCOUNT'), numeric: false },
        { key: 'aiAgents', title: label('TABLE.AI_AGENTS'), numeric: true },
        { key: 'turns', title: label('TABLE.TURNS'), numeric: true },
        { key: 'autonomy', title: label('TABLE.AUTONOMY'), numeric: true },
        { key: 'handoffs', title: label('TABLE.HANDOFFS'), numeric: true },
        { key: 'failed', title: label('TABLE.FAILED'), numeric: true },
        { key: 'cache', title: label('TABLE.CACHE'), numeric: true },
        { key: 'cost', title: label('TABLE.COST'), numeric: true },
    ];
    const toggle = (key: AccountSortKey) =>
        setSort(current =>
            current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'name' ? 'asc' : 'desc' },
        );
    const cells = (row: AccountUsage): string[] => [
        formatCount(row.aiAgents),
        formatCount(row.turns),
        formatPercent(ratio(row.replies, row.turns)),
        formatPercent(ratio(row.handoffs, row.turns)),
        formatPercent(ratio(row.failed_turns, row.turns)),
        formatPercent(cacheHitRatio(row)),
        formatUsd(row.cost_micro_usd),
    ];

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle role="heading" aria-level={2} className="text-sm font-medium">
                    {label('TABLE.TITLE')}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <div className="overflow-x-auto">
                    <Table aria-label={label('TABLE.TITLE')}>
                        <TableHeader>
                            <TableRow>
                                {columns.map(column => {
                                    const active = sort.key === column.key;
                                    const Icon = !active ? ChevronsUpDownIcon : sort.direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

                                    return (
                                        <TableHead
                                            key={column.key}
                                            scope="col"
                                            aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                                            className={cn('text-muted-foreground text-xs font-medium tracking-wide uppercase', column.numeric && 'text-right')}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggle(column.key)}
                                                title={label('TABLE.SORT', { column: column.title })}
                                                className={cn(
                                                    'inline-flex min-h-11 items-center gap-1 uppercase active:scale-[0.97] md:min-h-0',
                                                    column.numeric && 'flex-row-reverse',
                                                )}
                                            >
                                                {column.title}
                                                <Icon aria-hidden="true" className="size-3" />
                                            </button>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map(row => (
                                <TableRow
                                    key={row.accountId}
                                    data-state={row.accountId === selectedId ? 'selected' : undefined}
                                    className="cursor-pointer"
                                    onClick={() => onSelect(row)}
                                >
                                    <TableCell className="whitespace-nowrap">
                                        <button
                                            type="button"
                                            className="inline-flex min-h-11 items-center text-left font-medium hover:underline active:scale-[0.97] md:min-h-0"
                                            aria-label={label('TABLE.FILTER_BY', { account: accountName(row) })}
                                            onClick={event => {
                                                event.stopPropagation();
                                                onSelect(row);
                                            }}
                                        >
                                            {accountName(row)}
                                        </button>
                                    </TableCell>
                                    {cells(row).map((value, index) => (
                                        <TableCell key={columns[index + 1].key} className="font-num text-right whitespace-nowrap">
                                            {value}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <p className="text-xs text-neutral-500">{label('TABLE.HINT')}</p>
            </CardContent>
        </Card>
    );
}

function RangeFilter({
    window,
    presets,
    onPreset,
    onCustom,
}: {
    window: AiAnalyticsProps['window'];
    presets: string[];
    onPreset: (preset: string) => void;
    onCustom: (from: string, to: string) => void;
}) {
    const [choosing, setChoosing] = useState(window.preset === CUSTOM);
    const [from, setFrom] = useState(window.from);
    const [to, setTo] = useState(window.to);
    const ids = { from: useId(), to: useId() };
    const dateLabels: DateInputLabels = {
        openCalendar: t('ADMIN_OPERATIONS.COMMON.OPEN_CALENDAR'),
        previousMonth: t('ADMIN_OPERATIONS.COMMON.PREVIOUS_MONTH'),
        nextMonth: t('ADMIN_OPERATIONS.COMMON.NEXT_MONTH'),
        weekdays: t('ADMIN_OPERATIONS.COMMON.WEEKDAYS').split(','),
        month: date => t('ADMIN_OPERATIONS.COMMON.MONTH_YEAR', { month: date.getMonth() + 1, year: date.getFullYear() }),
    };
    const selected = choosing ? CUSTOM : window.preset;

    return (
        <>
            <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                value={[selected]}
                onValueChange={values => {
                    const preset = values[0];
                    if (!preset) return;
                    if (preset === CUSTOM) {
                        setChoosing(true);
                        return;
                    }
                    setChoosing(false);
                    onPreset(preset);
                }}
                aria-label={label('RANGE.LABEL')}
            >
                {presets.map(preset => (
                    <ToggleGroupItem key={preset} value={preset} className="aria-pressed:bg-primary aria-pressed:text-primary-foreground px-3">
                        {label(`RANGE.PRESETS.${preset.toUpperCase()}`)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            {choosing ? (
                <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={event => {
                        event.preventDefault();
                        if (from && to) onCustom(from, to);
                    }}
                >
                    <DateInput id={ids.from} label={label('RANGE.FROM')} value={from} onChange={setFrom} labels={dateLabels} className="sm:w-40" />
                    <DateInput id={ids.to} label={label('RANGE.TO')} value={to} onChange={setTo} labels={dateLabels} className="sm:w-40" />
                    <Button type="submit" disabled={!from || !to}>
                        {label('RANGE.APPLY')}
                    </Button>
                </form>
            ) : null}
        </>
    );
}

export default function AiAnalytics(props: AiAnalyticsProps) {
    const { window, presets, filters, totals, previousTotals, hourlyCost, buckets, accounts, options } = props;
    const ids = { account: useId(), aiAgent: useId() };
    const unit = window.bucket;
    const query: Query = {
        range: window.preset,
        ...(window.preset === CUSTOM ? { from: window.from, to: window.to } : {}),
        account_id: filters.accountId === null ? undefined : String(filters.accountId),
        ai_agent_id: filters.aiAgentId === null ? undefined : String(filters.aiAgentId),
    };
    const visit = (next: Partial<Query>) => visitWithParams(PAGE_URL, { ...query, ...next });
    const aiAgentOptions: Option[] = options.aiAgents
        .filter(option => filters.accountId === null || option.accountId === filters.accountId)
        .map(option => ({ value: option.value, label: option.label ?? deletedAiAgent(option.value) }));
    const hasNumbers = totals.turns > 0 || totals.model_calls > 0;
    const hasFilters = filters.accountId !== null || filters.aiAgentId !== null;

    const outcomeSeries: ChartSeries[] = [
        { key: 'replies', label: label('CHARTS.REPLIES'), values: buckets.map(bucket => bucket.replies), color: TONE_FILL.primary },
        { key: 'handoffs', label: label('CHARTS.HANDOFFS'), values: buckets.map(bucket => bucket.handoffs), color: TONE_FILL.warning },
        { key: 'failed', label: label('CHARTS.FAILED'), values: buckets.map(bucket => bucket.failed_turns), color: TONE_FILL.danger },
    ];
    const tokenSeries: ChartSeries[] = [
        { key: 'input', label: label('CHARTS.INPUT'), values: buckets.map(bucket => bucket.input_tokens), color: TONE_FILL.primary },
        { key: 'cacheRead', label: label('CHARTS.CACHE_READ'), values: buckets.map(bucket => bucket.cache_read_tokens), color: TONE_FILL.navy, dashed: true },
        { key: 'output', label: label('CHARTS.OUTPUT'), values: buckets.map(bucket => bucket.output_tokens), color: TONE_FILL.neutral },
    ];
    const callSeries: ChartSeries[] = [
        { key: 'failedCalls', label: label('CHARTS.FAILED_CALLS'), values: buckets.map(bucket => bucket.failed_calls), color: TONE_FILL.danger },
        {
            key: 'routeChanges',
            label: label('CHARTS.ROUTE_CHANGES'),
            values: buckets.map(bucket => bucket.route_changes),
            color: TONE_FILL.warning,
            dashed: true,
        },
    ];
    const costSeries: ChartSeries[] = [
        { key: 'cost', label: label('CHARTS.COST'), values: hourlyCost.map(point => point.cost), color: TONE_FILL.primary },
        { key: 'previous', label: label('CHARTS.PREVIOUS'), values: hourlyCost.map(point => point.previousCost), color: TONE_FILL.neutral, dashed: true },
    ];

    return (
        <div className="flex flex-col gap-4">
            <Head title={label('TITLE')} />
            <PageHeader
                eyebrow={<span className="text-xs text-neutral-500">{label('EYEBROW')}</span>}
                title={<span className="whitespace-nowrap">{label('TITLE')}</span>}
                className="mb-0 md:mb-0"
                actions={
                    <>
                        <RangeFilter
                            key={`${window.preset}-${window.from}-${window.to}`}
                            window={window}
                            presets={presets}
                            onPreset={preset => visit({ range: preset, from: undefined, to: undefined })}
                            onCustom={(from, to) => visit({ range: CUSTOM, from, to })}
                        />
                        <FilterSelect
                            id={ids.account}
                            inline
                            label={label('FILTERS.ACCOUNT')}
                            allLabel={label('FILTERS.ALL_ACCOUNTS')}
                            options={options.accounts}
                            value={query.account_id ?? ''}
                            onChange={value => visit({ account_id: value || undefined, ai_agent_id: undefined })}
                        />
                        <FilterSelect
                            id={ids.aiAgent}
                            inline
                            label={label('FILTERS.AI_AGENT')}
                            allLabel={label('FILTERS.ALL_AI_AGENTS')}
                            options={aiAgentOptions}
                            value={query.ai_agent_id ?? ''}
                            onChange={value => visit({ ai_agent_id: value || undefined })}
                        />
                        {hasFilters ? (
                            <Button variant="ghost" onClick={() => visit({ account_id: undefined, ai_agent_id: undefined })}>
                                {label('FILTERS.CLEAR')}
                            </Button>
                        ) : null}
                    </>
                }
            />

            <KpiCards current={totals} previous={previousTotals} />

            {hasNumbers ? (
                <>
                    <ChartCard title={label('CHARTS.COST_TITLE')} footer={label('CHARTS.COST_NOTE')}>
                        <TimeSeriesChart
                            title={label('CHARTS.COST_TITLE')}
                            dates={hourlyCost.map(point => point.at)}
                            series={costSeries}
                            variant="line"
                            summary={summaryOf(costSeries, formatUsd)}
                            dateLabel={label('CHARTS.TIME')}
                            formatDate={formatHourWithDay}
                            formatTick={unit === 'hour' ? formatHourKey : formatHourAsDay}
                            ticks={unit === 'hour' ? undefined : dayStarts(hourlyCost.map(point => point.at))}
                            formatValue={formatUsd}
                            yAxisWidth={AXIS_WIDTH}
                        />
                    </ChartCard>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ChartCard title={label(unit === 'hour' ? 'CHARTS.OUTCOMES_TITLE_HOUR' : 'CHARTS.OUTCOMES_TITLE_DAY')}>
                            <BucketChart
                                title={label(unit === 'hour' ? 'CHARTS.OUTCOMES_TITLE_HOUR' : 'CHARTS.OUTCOMES_TITLE_DAY')}
                                buckets={buckets}
                                unit={unit}
                                series={outcomeSeries}
                                variant="bar"
                                stacked
                            />
                        </ChartCard>
                        <ChartCard title={label('CHARTS.TOKENS_TITLE')}>
                            <BucketChart
                                title={label('CHARTS.TOKENS_TITLE')}
                                buckets={buckets}
                                unit={unit}
                                series={tokenSeries}
                                variant="line"
                                formatValue={formatCompact}
                                yAxisWidth={AXIS_WIDTH}
                            />
                        </ChartCard>
                        <ChartCard
                            className="lg:col-span-2"
                            title={label('CHARTS.CALLS_TITLE')}
                            footer={label('CHARTS.CALLS_NOTE', {
                                latency: formatSeconds(averageLatencySeconds(totals)),
                                calls: formatCount(totals.model_calls),
                            })}
                        >
                            <BucketChart title={label('CHARTS.CALLS_TITLE')} buckets={buckets} unit={unit} series={callSeries} variant="line" />
                        </ChartCard>
                    </div>

                    <AccountTable
                        rows={accounts}
                        selectedId={filters.accountId}
                        onSelect={row => visit({ account_id: String(row.accountId), ai_agent_id: undefined })}
                    />
                </>
            ) : (
                <Card>
                    <CardContent>
                        <DataTableEmpty icon={<BrainCircuitIcon />} title={label('EMPTY.TITLE')} description={label('EMPTY.DESCRIPTION')} />
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-neutral-500">{label('SOURCE_NOTE')}</p>
        </div>
    );
}
