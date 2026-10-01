import { Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { BellIcon, BellOffIcon, BellRingIcon, ExternalLinkIcon, HistoryIcon, ListChecksIcon, PencilIcon, SendIcon, UsersIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import { Switch } from '@admin/components/ui/switch';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { ListPagination } from '@admin/views/datatables/list/list-pagination';
import { ListTable } from '@admin/views/datatables/list/list-table';
import StatisticsCard from '@admin/views/datatables/statistics-card';
import StatusBadge from '@admin/views/datatables/status-badge';
import type { StatusTone } from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { PushPermissionDeniedError, currentPushSubscription, disableAdminPush, enableAdminPush, isPushSupported } from '../alertsPush';
import { formatDateTime, formatNumber, formatRelative } from './operationsFormat';

export type RuleStatus = 'ok' | 'firing' | 'pending' | 'disabled' | 'unknown';
export type MetricUnit = 'count' | 'seconds' | 'state';

export type AlertRuleItem = {
    key: string;
    enabled: boolean;
    threshold: number;
    windowMinutes: number;
    cooldownMinutes: number;
    windowMode: 'lookback' | 'sustain';
    unit: MetricUnit;
    lastValue: number | null;
    lastEvaluatedAt: string | null;
    status: RuleStatus;
    openedAt: string | null;
    url: string;
};

export type AlertIncidentItem = {
    id: number;
    ruleKey: string;
    unit: MetricUnit;
    value: number;
    peakValue: number;
    threshold: number;
    openedAt: string | null;
    resolvedAt: string | null;
    notifiedAt: string | null;
    recoveryNotifiedAt: string | null;
};

type Props = {
    rules: AlertRuleItem[];
    incidents: AlertIncidentItem[];
    pagination: { current: number; last: number; total: number };
    push: { vapidPublicKey: string | null; subscriptions: number; endpoint: string };
    stats: { firing: number; enabled: number; incidents7d: number; recipients: number };
    limits: { threshold: number; minutes: number };
};

const PAGE_URL = '/admin/alerts';

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_ALERTS.${key}`, params);

const STATUS_TONE: Record<RuleStatus, StatusTone> = {
    ok: 'success',
    firing: 'danger',
    pending: 'warning',
    disabled: 'neutral',
    unknown: 'neutral',
};

export const ruleTitle = (key: string) => label(`RULES.${key}.TITLE`);

export function formatAlertValue(unit: MetricUnit, value: number | null): string {
    if (value === null) return label('DISPLAY.NONE');
    if (unit === 'state') return label(value > 0 ? 'DISPLAY.DOWN' : 'DISPLAY.UP');
    if (unit === 'seconds') return label('DISPLAY.SECONDS', { count: formatNumber(value) });

    return formatNumber(value);
}

function windowText(rule: Pick<AlertRuleItem, 'windowMode' | 'windowMinutes'>): string {
    if (rule.windowMode === 'sustain' && rule.windowMinutes === 0) return label('WINDOW_MODE.sustain_now');

    return label(`WINDOW_MODE.${rule.windowMode}`, { minutes: rule.windowMinutes });
}

const patchRule = (key: string, data: Record<string, number | boolean>, onFinish?: () => void) =>
    router.patch(`${PAGE_URL}/rules/${key}`, data, { preserveScroll: true, preserveState: true, onFinish });

type Draft = { threshold: string; window_minutes: string; cooldown_minutes: string };

function RuleEditor({ rule, limits, onClose }: { rule: AlertRuleItem; limits: Props['limits']; onClose: () => void }) {
    const ids = { threshold: useId(), window: useId(), cooldown: useId(), error: useId() };
    const [draft, setDraft] = useState<Draft>({
        threshold: String(rule.threshold),
        window_minutes: String(rule.windowMinutes),
        cooldown_minutes: String(rule.cooldownMinutes),
    });
    const [saving, setSaving] = useState(false);
    const isState = rule.unit === 'state';

    const parse = (value: string, min: number, max: number) => (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null);
    const threshold = isState ? rule.threshold : parse(draft.threshold, 1, limits.threshold);
    const windowMinutes = parse(draft.window_minutes, 0, limits.minutes);
    const cooldownMinutes = parse(draft.cooldown_minutes, 0, limits.minutes);
    const valid = threshold !== null && windowMinutes !== null && cooldownMinutes !== null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!valid) return;
        setSaving(true);
        patchRule(
            rule.key,
            { ...(isState ? {} : { threshold }), window_minutes: windowMinutes, cooldown_minutes: cooldownMinutes },
            () => {
                setSaving(false);
                onClose();
            },
        );
    };

    const field = (id: string, name: keyof Draft, text: string, invalid: boolean) => (
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id}>{text}</Label>
            <Input
                id={id}
                inputMode="numeric"
                className="font-num max-md:h-11"
                value={draft[name]}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? ids.error : undefined}
                onChange={event => setDraft(current => ({ ...current, [name]: event.target.value.trim() }))}
            />
        </div>
    );

    return (
        <form onSubmit={submit} aria-label={label('FIELDS.EDIT_RULE', { rule: ruleTitle(rule.key) })} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
                {isState ? (
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-sm font-medium">{label('FIELDS.THRESHOLD')}</span>
                        <span className="text-muted-foreground text-sm">{label('FIELDS.THRESHOLD_STATE')}</span>
                    </div>
                ) : (
                    field(ids.threshold, 'threshold', label('FIELDS.THRESHOLD'), threshold === null)
                )}
                {field(ids.window, 'window_minutes', label('FIELDS.WINDOW_MINUTES'), windowMinutes === null)}
                {field(ids.cooldown, 'cooldown_minutes', label('FIELDS.COOLDOWN_MINUTES'), cooldownMinutes === null)}
            </div>
            {!valid ? (
                <p id={ids.error} className="text-destructive text-sm">
                    {label('FIELDS.INVALID', { max: formatNumber(limits.minutes) })}
                </p>
            ) : null}
            <div className="flex gap-2">
                <Button type="submit" className="max-md:h-11" disabled={!valid || saving}>
                    {label('FIELDS.SAVE')}
                </Button>
                <Button type="button" variant="outline" className="max-md:h-11" onClick={onClose}>
                    {label('FIELDS.CANCEL')}
                </Button>
            </div>
        </form>
    );
}

function ruleColumns(onEdit: (key: string) => void): ColumnDef<AlertRuleItem>[] {
    return [
        {
            id: 'rule',
            header: () => label('COLUMNS.RULE'),
            cell: ({ row }) => (
                <div className="flex min-w-56 flex-col gap-0.5 py-2 whitespace-normal">
                    <span className="font-medium">{ruleTitle(row.original.key)}</span>
                    <span className="text-muted-foreground">{label(`RULES.${row.original.key}.DESCRIPTION`)}</span>
                </div>
            ),
        },
        {
            id: 'status',
            header: () => label('COLUMNS.STATUS'),
            cell: ({ row }) => (
                <div className="flex flex-col items-start gap-1">
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>{label(`STATUS.${row.original.status}`)}</StatusBadge>
                    {row.original.status === 'firing' && row.original.openedAt ? (
                        <span className="text-muted-foreground whitespace-nowrap">{formatRelative(row.original.openedAt)}</span>
                    ) : null}
                </div>
            ),
        },
        {
            id: 'current',
            header: () => label('COLUMNS.CURRENT'),
            meta: { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right' },
            cell: ({ row }) => (
                <div className="flex flex-col items-start gap-0.5 md:items-end">
                    <span className={row.original.status === 'firing' ? 'font-num text-destructive' : 'font-num'}>
                        {formatAlertValue(row.original.unit, row.original.lastValue)}
                    </span>
                    {row.original.lastEvaluatedAt ? (
                        <span className="text-muted-foreground whitespace-nowrap">{label('MEASURED', { time: formatRelative(row.original.lastEvaluatedAt) })}</span>
                    ) : null}
                </div>
            ),
        },
        {
            id: 'threshold',
            header: () => label('COLUMNS.THRESHOLD'),
            meta: { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right' },
            cell: ({ row }) => (
                <span className="font-num whitespace-nowrap">
                    {row.original.unit === 'state' ? label('DISPLAY.DOWN') : formatAlertValue(row.original.unit, row.original.threshold)}
                </span>
            ),
        },
        {
            id: 'window',
            header: () => label('COLUMNS.WINDOW'),
            cell: ({ row }) => <span className="block min-w-28 whitespace-normal">{windowText(row.original)}</span>,
        },
        {
            id: 'cooldown',
            header: () => label('COLUMNS.COOLDOWN'),
            cell: ({ row }) => <span className="font-num whitespace-nowrap">{label('FIELDS.MINUTES', { count: row.original.cooldownMinutes })}</span>,
        },
        {
            id: 'enabled',
            header: () => label('COLUMNS.ENABLED'),
            cell: ({ row }) => (
                <label className="inline-flex min-h-11 items-center md:min-h-0">
                    <Switch
                        checked={row.original.enabled}
                        aria-label={label('FIELDS.ENABLED', { rule: ruleTitle(row.original.key) })}
                        onCheckedChange={checked => patchRule(row.original.key, { enabled: checked })}
                    />
                </label>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{label('FIELDS.EDIT')}</span>,
            meta: { mobileRole: 'actions' },
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="max-md:size-11"
                        render={<Link href={row.original.url} />}
                        nativeButton={false}
                        aria-label={label('OPEN_PAGE')}
                        title={label('OPEN_PAGE')}
                    >
                        <ExternalLinkIcon />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="max-md:size-11"
                        aria-label={label('FIELDS.EDIT_RULE', { rule: ruleTitle(row.original.key) })}
                        title={label('FIELDS.EDIT')}
                        onClick={() => onEdit(row.original.key)}
                    >
                        <PencilIcon />
                    </Button>
                </div>
            ),
        },
    ];
}

function notificationText(incident: AlertIncidentItem): string {
    if (!incident.notifiedAt) return label('INCIDENTS.NOT_NOTIFIED');
    if (incident.recoveryNotifiedAt) return label('INCIDENTS.RECOVERY_NOTIFIED');

    return label('INCIDENTS.NOTIFIED');
}

const incidentColumns: ColumnDef<AlertIncidentItem>[] = [
    {
        id: 'rule',
        header: () => label('INCIDENTS.COLUMNS.RULE'),
        cell: ({ row }) => <span className="font-medium">{ruleTitle(row.original.ruleKey)}</span>,
    },
    {
        id: 'opened',
        header: () => label('INCIDENTS.COLUMNS.OPENED'),
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.openedAt)}</span>,
    },
    {
        id: 'resolved',
        header: () => label('INCIDENTS.COLUMNS.RESOLVED'),
        cell: ({ row }) =>
            row.original.resolvedAt ? (
                <span className="whitespace-nowrap">{formatDateTime(row.original.resolvedAt)}</span>
            ) : (
                <StatusBadge tone="danger">{label('INCIDENTS.OPEN')}</StatusBadge>
            ),
    },
    {
        id: 'peak',
        header: () => label('INCIDENTS.COLUMNS.PEAK'),
        meta: { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right' },
        cell: ({ row }) => (
            <span className="font-num whitespace-nowrap">
                {formatAlertValue(row.original.unit, row.original.peakValue)}
                {row.original.unit === 'state' ? null : (
                    <span className="text-muted-foreground"> / {formatAlertValue(row.original.unit, row.original.threshold)}</span>
                )}
            </span>
        ),
    },
    {
        id: 'notified',
        header: () => label('INCIDENTS.COLUMNS.NOTIFIED'),
        cell: ({ row }) => <span className="text-muted-foreground whitespace-normal">{notificationText(row.original)}</span>,
    },
];

type PushState = 'checking' | 'unsupported' | 'off' | 'on' | 'busy';

function PushPanel({ push }: { push: Props['push'] }) {
    const supported = isPushSupported(push.vapidPublicKey);
    const [state, setState] = useState<PushState>(supported ? 'checking' : 'unsupported');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!supported) return;
        let active = true;
        currentPushSubscription()
            .then(subscription => active && setState(subscription && Notification.permission === 'granted' ? 'on' : 'off'))
            .catch(() => active && setState('off'));

        return () => {
            active = false;
        };
    }, [supported]);

    const toggle = async () => {
        if (!push.vapidPublicKey) return;
        const enabling = state !== 'on';
        setState('busy');
        setError(null);
        try {
            if (enabling) {
                await enableAdminPush(push.vapidPublicKey, push.endpoint);
            } else {
                await disableAdminPush(push.endpoint);
            }
            setState(enabling ? 'on' : 'off');
            router.reload({ only: ['push'] });
        } catch (caught) {
            setError(label(caught instanceof PushPermissionDeniedError ? 'PUSH.DENIED' : 'PUSH.FAILED'));
            setState(enabling ? 'off' : 'on');
        }
    };

    const description = state === 'unsupported' ? label('PUSH.UNSUPPORTED') : state === 'on' ? label('PUSH.ON') : label('PUSH.OFF');

    return (
        <Card>
            <CardHeader>
                <CardTitle>{label('PUSH.TITLE')}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
                {push.subscriptions > 0 ? (
                    <p className="text-muted-foreground text-sm">{label('PUSH.SUBSCRIPTIONS', { count: push.subscriptions })}</p>
                ) : null}
                {state !== 'unsupported' ? (
                    <Button
                        variant={state === 'on' ? 'outline' : 'default'}
                        className="max-md:h-11"
                        disabled={state === 'busy' || state === 'checking'}
                        onClick={toggle}
                    >
                        {state === 'on' ? <BellOffIcon /> : <BellIcon />}
                        {state === 'on' ? label('PUSH.DISABLE') : label('PUSH.ENABLE')}
                    </Button>
                ) : null}
                {error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {error}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default function Alerts({ rules, incidents, pagination, push, stats, limits }: Props) {
    const [editing, setEditing] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const columns = useMemo(() => ruleColumns(key => setEditing(current => (current === key ? null : key))), []);

    const sendTest = () => {
        setSending(true);
        router.post(`${PAGE_URL}/test`, {}, { preserveScroll: true, onFinish: () => setSending(false) });
    };

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader
                title={label('TITLE')}
                description={label('DESCRIPTION')}
                className="mb-0 md:mb-0"
                actions={
                    <Button variant="outline" className="max-md:h-11" disabled={sending} onClick={sendTest} title={label('TEST.HINT')}>
                        <SendIcon />
                        {label('TEST.BUTTON')}
                    </Button>
                }
            />

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <StatisticsCard
                    icon={<BellRingIcon className="size-4" />}
                    value={formatNumber(stats.firing)}
                    title={label('STATS.FIRING')}
                    tone={stats.firing > 0 ? 'danger' : 'success'}
                />
                <StatisticsCard icon={<ListChecksIcon className="size-4" />} value={formatNumber(stats.enabled)} title={label('STATS.ENABLED')} tone="navy" />
                <StatisticsCard icon={<HistoryIcon className="size-4" />} value={formatNumber(stats.incidents7d)} title={label('STATS.INCIDENTS_7D')} tone="neutral" />
                <StatisticsCard icon={<UsersIcon className="size-4" />} value={formatNumber(stats.recipients)} title={label('STATS.RECIPIENTS')} tone="primary" />
            </div>

            <ListCard
                table={
                    <ListTable
                        data={rules}
                        columns={columns}
                        getRowId={rule => rule.key}
                        expandedRowId={editing}
                        renderExpanded={rule => <RuleEditor key={rule.key} rule={rule} limits={limits} onClose={() => setEditing(null)} />}
                        empty={<DataTableEmpty title={label('STATUS.unknown')} />}
                    />
                }
            />

            <PushPanel push={push} />

            <section className="flex flex-col gap-3" aria-labelledby="alert-incidents-title">
                <h2 id="alert-incidents-title" className="text-base font-medium">
                    {label('INCIDENTS.TITLE')}
                </h2>
                <ListCard
                    table={
                        <ListTable
                            data={incidents}
                            columns={incidentColumns}
                            getRowId={incident => String(incident.id)}
                            empty={
                                <DataTableEmpty
                                    icon={<HistoryIcon className="size-4" />}
                                    title={label('INCIDENTS.EMPTY_TITLE')}
                                    description={label('INCIDENTS.EMPTY_DESCRIPTION')}
                                />
                            }
                        />
                    }
                    pagination={
                        pagination.last > 1 ? (
                            <ListPagination
                                summary={label('INCIDENTS.TOTAL', { total: formatNumber(pagination.total) })}
                                current={pagination.current}
                                last={pagination.last}
                                hrefFor={page => `${PAGE_URL}?page=${page}`}
                                labels={{
                                    previous: t('ADMIN_OPERATIONS.COMMON.PREVIOUS'),
                                    next: t('ADMIN_OPERATIONS.COMMON.NEXT'),
                                    navigation: t('ADMIN_OPERATIONS.COMMON.PAGE', { page: pagination.current }),
                                }}
                            />
                        ) : undefined
                    }
                />
            </section>
        </div>
    );
}
