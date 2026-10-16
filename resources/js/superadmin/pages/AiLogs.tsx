import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { BrainCircuitIcon, CopyIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import { EMPTY_VALUE } from '@admin/lib/format';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { FilterSelect } from '@admin/views/datatables/list/list-filters';
import { ListPagination } from '@admin/views/datatables/list/list-pagination';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { ListToolbar } from '@admin/views/datatables/list/list-toolbar';
import PageHeader from '@admin/views/pages/page-header';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

import { t } from '../../i18n';
import { formatNumber, visitWithParams } from './operationsFormat';

export type AiLogRow = {
    id: number;
    createdAt: string | null;
    accountId: number;
    accountName: string | null;
    conversationId: number | null;
    aiAgentId: number | null;
    aiAgentName: string | null;
    provider: string;
    model: string;
    httpStatus: number | null;
    errorCode: string | null;
    finishReason: string | null;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costMicroUsd: number;
    latencyMs: number;
};

type ToolCall = { id: string; name: string; input: unknown; output: unknown; is_error: boolean; pending: boolean };

export type AiLogDetail = AiLogRow & {
    endpoint: string | null;
    request: Record<string, unknown>;
    response: Record<string, unknown> | null;
    curl: string | null;
    toolCalls: ToolCall[];
    conversationUrl: string | null;
    accountUrl: string;
    turn: { calls: AiLogRow[]; costMicroUsd: number; latencyMs: number };
};

type FilterKey = 'account_id' | 'conversation_id' | 'ai_agent_id' | 'route' | 'result' | 'q' | 'window';
type Filters = Partial<Record<FilterKey, string>>;
type Option = { value: string; label: string };

type Props = {
    logs: AiLogRow[];
    pagination: { current: number; last: number; total: number };
    filters: Filters;
    options: { accounts: Option[]; aiAgents: Option[]; routes: Option[] };
    selected: AiLogDetail | null;
    searchWindowCapped: boolean;
    searchMaxWindow: (typeof WINDOW_KEYS)[number];
};

const PAGE_URL = '/admin/ai_logs';
const WINDOW_KEYS = ['24h', '7d', '30d', 'all'] as const;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_AI_LOGS.${key}`, params);

// Giờ tới mili giây: các lần gọi trong một lượt cách nhau vài trăm mili giây.
function preciseTime(value: string | null): string {
    if (!value) return EMPTY_VALUE;
    const date = new Date(value);
    const pad = (number: number, size = 2) => String(number).padStart(size, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

const isFailed = (row: AiLogRow) => row.errorCode !== null || row.httpStatus === null || row.httpStatus >= 300;

export function pageHref(filters: Filters, page: number, logId?: number | null): string {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (page > 1) query.set('page', String(page));
    if (logId) query.set('log', String(logId));
    const search = query.toString();

    return search ? `${PAGE_URL}?${search}` : PAGE_URL;
}

function Mono({ children, tone }: { children: ReactNode; tone?: 'ok' | 'error' }) {
    const color = tone === 'error' ? 'text-destructive' : '';

    return <span className={`font-mono text-xs whitespace-nowrap ${color}`}>{children}</span>;
}

function KeyValues({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            {rows.map(([key, value]) => (
                <div key={key} className="contents">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="font-mono break-all">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function Code({ value }: { value: string }) {
    return (
        <pre className="bg-muted max-h-[28rem] overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap break-all">
            {value}
        </pre>
    );
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

async function copy(text: string) {
    try {
        await copyTextToClipboard(text);
        toast.success(label('DETAIL.COPIED'));
    } catch {
        toast.error(label('DETAIL.COPY_FAILED'));
    }
}

function Detail({ log, hrefForLog, onClose }: { log: AiLogDetail; hrefForLog: (id: number) => string; onClose: () => void }) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => headingRef.current?.focus(), [log.id]);

    const turnIndex = log.turn.calls.findIndex(call => call.id === log.id);

    return (
        <section aria-labelledby="ai-log-detail" className="grid grid-cols-1 gap-4" data-testid="ai-log-detail">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                    <h2 id="ai-log-detail" ref={headingRef} tabIndex={-1} className="text-base font-medium">
                        {label('DETAIL.HEADING', { id: log.id, time: preciseTime(log.createdAt) })}
                    </h2>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                        {label('DETAIL.SUMMARY', {
                            conversation: log.conversationId ?? EMPTY_VALUE,
                            agent: log.aiAgentName ?? EMPTY_VALUE,
                            count: log.turn.calls.length,
                        })}
                        {log.conversationUrl ? (
                            <a href={log.conversationUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {label('DETAIL.OPEN_CONVERSATION')}
                            </a>
                        ) : null}
                        <Link href={log.accountUrl} className="text-primary hover:underline">
                            {label('DETAIL.OPEN_ACCOUNT')}
                        </Link>
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void copy(json(log.request))}>
                        <CopyIcon />
                        {label('DETAIL.COPY_REQUEST')}
                    </Button>
                    <Button variant="outline" size="sm" disabled={log.response === null} onClick={() => void copy(json(log.response))}>
                        <CopyIcon />
                        {label('DETAIL.COPY_RESPONSE')}
                    </Button>
                    <Button variant="outline" size="sm" disabled={log.curl === null} onClick={() => void copy(log.curl ?? '')}>
                        <CopyIcon />
                        {label('DETAIL.COPY_CURL')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <XIcon />
                        {label('DETAIL.CLOSE')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.CALL')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <KeyValues
                            rows={[
                                ['account_id', `${log.accountId}${log.accountName ? ` (${log.accountName})` : ''}`],
                                ['conversation_id', log.conversationId ?? 'null'],
                                ['ai_agent_id', log.aiAgentId === null ? 'null' : `${log.aiAgentId}${log.aiAgentName ? ` (${log.aiAgentName})` : ''}`],
                                ['provider', log.provider],
                                ['model', log.model],
                                ['endpoint', log.endpoint ?? EMPTY_VALUE],
                                ['attempt', turnIndex >= 0 ? `${turnIndex + 1}/${log.turn.calls.length}` : EMPTY_VALUE],
                                ['http_status', log.httpStatus ?? 'null'],
                                ['finish_reason', log.finishReason ?? 'null'],
                                ['error_code', log.errorCode ?? 'null'],
                                ['latency_ms', formatNumber(log.latencyMs)],
                            ]}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.USAGE')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <KeyValues
                            rows={[
                                ['input_tokens', formatNumber(log.inputTokens)],
                                ['output_tokens', formatNumber(log.outputTokens)],
                                ['cache_read_tokens', formatNumber(log.cacheReadTokens)],
                                ['cache_write_tokens', formatNumber(log.cacheWriteTokens)],
                                ['cost_micro_usd', formatNumber(log.costMicroUsd)],
                                [
                                    label('DETAIL.TURN_TOTAL'),
                                    label('DETAIL.TURN_TOTAL_VALUE', {
                                        count: log.turn.calls.length,
                                        cost: formatNumber(log.turn.costMicroUsd),
                                        ms: formatNumber(log.turn.latencyMs),
                                    }),
                                ],
                            ]}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.TURN')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="flex flex-col gap-1 text-xs">
                            {log.turn.calls.map(call => (
                                <li key={call.id} className="flex flex-wrap items-baseline gap-x-2 font-mono">
                                    <Link href={hrefForLog(call.id)} preserveState preserveScroll only={['selected']} className="text-muted-foreground hover:underline">
                                        {preciseTime(call.createdAt)}
                                    </Link>
                                    <span className={isFailed(call) ? 'text-destructive' : ''}>
                                        {call.provider} {call.httpStatus ?? 'null'} {call.errorCode ?? call.finishReason ?? ''}
                                    </span>
                                    {call.id === log.id ? <span className="text-muted-foreground">← {label('DETAIL.THIS_CALL')}</span> : null}
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.TOOLS')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {log.toolCalls.length === 0 ? (
                            <p className="text-muted-foreground text-xs">{label('DETAIL.NO_TOOLS')}</p>
                        ) : (
                            <Code
                                value={log.toolCalls
                                    .map(
                                        call =>
                                            `${call.name} ${JSON.stringify(call.input)}\n→ ${
                                                call.pending ? `(${label('DETAIL.PENDING_OUTPUT')})` : `${call.is_error ? '[error] ' : ''}${JSON.stringify(call.output)}`
                                            }`,
                                    )
                                    .join('\n')}
                            />
                        )}
                    </CardContent>
                </Card>
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.REQUEST')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Code value={json(log.request)} />
                    </CardContent>
                </Card>
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm">{label('DETAIL.RESPONSE')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {log.response === null ? (
                            <p className="text-muted-foreground text-xs">{label('DETAIL.NO_RESPONSE')}</p>
                        ) : (
                            <Code value={json(log.response)} />
                        )}
                    </CardContent>
                </Card>
            </div>
            <p className="text-muted-foreground text-xs">{label('DETAIL.KEY_NOTE')}</p>
        </section>
    );
}

// Bảng `api_logs` cho dev: lọc ở máy chủ, bấm mã một dòng mở chi tiết bên dưới.
export default function AiLogs({ logs, pagination, filters, options, selected, searchWindowCapped, searchMaxWindow }: Props) {
    const [draft, setDraft] = useState<Filters>(filters);
    const ids = { q: useId(), account: useId(), conversation: useId(), agent: useId(), route: useId(), result: useId(), window: useId() };
    const selectedId = selected?.id ?? null;
    const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'window' && Boolean(value));
    const set = (key: FilterKey, value: string) => setDraft(current => ({ ...current, [key]: value }));
    const apply = (next: Filters) => {
        const merged = { ...draft, ...next };
        setDraft(merged);
        visitWithParams(PAGE_URL, merged);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        visitWithParams(PAGE_URL, draft);
    };
    const openLog = (id: number | null) =>
        router.get(pageHref(filters, pagination.current, id), {}, { preserveState: true, preserveScroll: true, only: ['selected'] });

    const numberCell = (value: number) => <Mono>{formatNumber(value)}</Mono>;

    const columns: ColumnDef<AiLogRow>[] = [
        {
            id: 'id',
            header: () => 'id',
            cell: ({ row }) => (
                <button
                    type="button"
                    aria-label={label('OPEN', { id: row.original.id })}
                    aria-pressed={selectedId === row.original.id}
                    className={`font-mono text-xs hover:underline ${selectedId === row.original.id ? 'text-primary font-medium' : ''}`}
                    onClick={() => openLog(row.original.id)}
                >
                    {row.original.id}
                </button>
            ),
        },
        { id: 'created_at', header: () => 'created_at', cell: ({ row }) => <Mono>{preciseTime(row.original.createdAt)}</Mono> },
        {
            id: 'account',
            header: () => 'account',
            cell: ({ row }) => <Mono>{row.original.accountName ? `${row.original.accountName} #${row.original.accountId}` : row.original.accountId}</Mono>,
        },
        { id: 'conversation', header: () => 'conversation', cell: ({ row }) => <Mono>{row.original.conversationId ?? EMPTY_VALUE}</Mono> },
        { id: 'ai_agent', header: () => 'ai_agent', cell: ({ row }) => <Mono>{row.original.aiAgentName ?? row.original.aiAgentId ?? EMPTY_VALUE}</Mono> },
        { id: 'provider', header: () => 'provider', cell: ({ row }) => <Mono>{row.original.provider}</Mono> },
        { id: 'model', header: () => 'model', cell: ({ row }) => <Mono>{row.original.model}</Mono> },
        {
            id: 'http',
            header: () => 'http',
            cell: ({ row }) => <Mono tone={isFailed(row.original) ? 'error' : 'ok'}>{row.original.httpStatus ?? 'null'}</Mono>,
        },
        {
            id: 'finish',
            header: () => 'finish / error',
            cell: ({ row }) => (
                <Mono tone={row.original.errorCode ? 'error' : undefined}>
                    {row.original.errorCode ?? row.original.finishReason ?? EMPTY_VALUE}
                </Mono>
            ),
        },
        { id: 'in', header: () => 'in', cell: ({ row }) => numberCell(row.original.inputTokens) },
        { id: 'out', header: () => 'out', cell: ({ row }) => numberCell(row.original.outputTokens) },
        {
            id: 'cache',
            header: () => 'cache r/w',
            cell: ({ row }) => <Mono>{`${formatNumber(row.original.cacheReadTokens)}/${formatNumber(row.original.cacheWriteTokens)}`}</Mono>,
        },
        { id: 'cost', header: () => 'cost µ$', cell: ({ row }) => numberCell(row.original.costMicroUsd) },
        { id: 'ms', header: () => 'ms', cell: ({ row }) => numberCell(row.original.latencyMs) },
    ];

    return (
        <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">{label('EYEBROW')}</span>
                <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />
            </div>

            {filters.q ? (
                <p role="status" className="text-muted-foreground text-xs">
                    {label(searchWindowCapped ? 'FILTERS.SEARCH_WINDOW_CAPPED' : 'FILTERS.SEARCH_WINDOW_NOTE', {
                        window: label(`FILTERS.WINDOWS.${searchMaxWindow}`).toLowerCase(),
                    })}
                </p>
            ) : null}

            <ListCard
                toolbar={
                    <ListToolbar
                        search={{
                            id: ids.q,
                            label: label('FILTERS.SEARCH'),
                            placeholder: label('FILTERS.SEARCH_PLACEHOLDER'),
                            value: draft.q ?? '',
                            onChange: value => set('q', value),
                            onSubmit: () => visitWithParams(PAGE_URL, draft),
                        }}
                        filters={
                            <>
                                <FilterSelect
                                    inline
                                    id={ids.account}
                                    label={label('FILTERS.ACCOUNT')}
                                    allLabel={label('FILTERS.ALL_ACCOUNTS')}
                                    options={options.accounts}
                                    value={draft.account_id ?? ''}
                                    onChange={value => apply({ account_id: value })}
                                />
                                <form onSubmit={submit} className="w-full sm:w-36">
                                    <Label htmlFor={ids.conversation} className="sr-only">
                                        {label('FILTERS.CONVERSATION')}
                                    </Label>
                                    <Input
                                        id={ids.conversation}
                                        inputMode="numeric"
                                        placeholder={label('FILTERS.CONVERSATION_PLACEHOLDER')}
                                        value={draft.conversation_id ?? ''}
                                        onChange={event => set('conversation_id', event.target.value)}
                                    />
                                </form>
                                <FilterSelect
                                    inline
                                    id={ids.agent}
                                    label={label('FILTERS.AI_AGENT')}
                                    allLabel={label('FILTERS.ALL_AI_AGENTS')}
                                    options={options.aiAgents}
                                    value={draft.ai_agent_id ?? ''}
                                    onChange={value => apply({ ai_agent_id: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.route}
                                    label={label('FILTERS.ROUTE')}
                                    allLabel={label('FILTERS.ALL_ROUTES')}
                                    options={options.routes}
                                    value={draft.route ?? ''}
                                    onChange={value => apply({ route: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.result}
                                    label={label('FILTERS.RESULT')}
                                    allLabel={label('FILTERS.ALL_RESULTS')}
                                    options={[
                                        { value: 'ok', label: label('FILTERS.RESULT_OK') },
                                        { value: 'error', label: label('FILTERS.RESULT_ERROR') },
                                    ]}
                                    value={draft.result ?? ''}
                                    onChange={value => apply({ result: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.window}
                                    label={label('FILTERS.WINDOW')}
                                    allLabel={label('FILTERS.WINDOWS.24h')}
                                    options={WINDOW_KEYS.filter(key => key !== '24h').map(key => ({ value: key, label: label(`FILTERS.WINDOWS.${key}`) }))}
                                    value={draft.window === '24h' ? '' : (draft.window ?? '')}
                                    onChange={value => apply({ window: value || '24h' })}
                                />
                            </>
                        }
                    >
                        {hasFilters ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDraft({ window: filters.window });
                                    visitWithParams(PAGE_URL, { window: filters.window });
                                }}
                            >
                                <XIcon />
                                {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                            </Button>
                        ) : null}
                    </ListToolbar>
                }
                table={
                    <ListTable
                        data={logs}
                        columns={columns}
                        getRowId={log => String(log.id)}
                        empty={
                            <DataTableEmpty
                                icon={<BrainCircuitIcon className="size-4" />}
                                title={label('EMPTY_TITLE')}
                                description={label('EMPTY_DESCRIPTION')}
                            />
                        }
                    />
                }
                pagination={
                    <ListPagination
                        summary={label('TOTAL', { total: formatNumber(pagination.total) })}
                        current={pagination.current}
                        last={Math.max(1, pagination.last)}
                        hrefFor={page => pageHref(filters, page)}
                        labels={{
                            previous: t('ADMIN_OPERATIONS.COMMON.PREVIOUS'),
                            next: t('ADMIN_OPERATIONS.COMMON.NEXT'),
                            navigation: t('ADMIN_OPERATIONS.COMMON.PAGE', { page: pagination.current }),
                        }}
                    />
                }
            />

            {selected ? (
                <Detail log={selected} hrefForLog={id => pageHref(filters, pagination.current, id)} onClose={() => openLog(null)} />
            ) : null}
        </div>
    );
}
