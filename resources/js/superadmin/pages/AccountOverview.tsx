import { Link, router, usePage } from '@inertiajs/react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../i18n';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button, buttonClassName } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../ui/cn';
import { ConfirmDialog, Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Field, Select, Textarea } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { problemDetail, SeverityBadge } from './ChannelHealth';
import type { ChannelHealthItem } from './ChannelHealth';
import { formatDate, formatDateTime, formatNumber, formatRelative } from './operationsFormat';

type Option = { value: string; label: string };

type AccountUserRow = {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    confirmed: boolean;
    lastSignInAt: string | null;
    activeAt: string | null;
    url: string;
    impersonateUrl: string;
};

type TimelineEvent = { type: string; at: string; title: string; detail: string | null };

type Impersonation = {
    id: number;
    superAdmin: { id: number; name: string; email: string } | null;
    targetUser: { id: number; name: string; email: string } | null;
    reason: string;
    createdAt: string | null;
    usedAt: string | null;
    url: string;
};

export type AccountOverviewProps = {
    account: { id: number; name: string; locale: string; status: 'active' | 'suspended'; createdAt: string | null };
    suspension: {
        categories: Option[];
        maxReasonLength: number;
        history: { category?: string; reason?: string; suspended_at?: string }[];
    };
    users: AccountUserRow[];
    inboxes: ChannelHealthItem[];
    stats: {
        users: number;
        contacts: number;
        conversations: number;
        inboxes: number;
        messages7d: number;
        messages30d: number;
        lastActivityAt: string | null;
    };
    usage: { date: string; count: number }[];
    onboarding: {
        step: string | null;
        stepLabel: string | null;
        milestones: { key: string; label: string; done: boolean; at: string | null }[];
    };
    timeline: TimelineEvent[];
    stickers: { packs: number; stickers: number };
    impersonations: Impersonation[];
    urls: Record<'show' | 'edit' | 'stickers' | 'auditLogs' | 'data' | 'suspend' | 'unsuspend' | 'impersonations', string>;
    csrf: string;
};

const TABS = ['overview', 'users', 'inboxes', 'activity', 'stickers'] as const;
type Tab = (typeof TABS)[number];

const IMPERSONATE_REASON_MIN = 10;

const TIMELINE_ICON: Record<string, string> = {
    account_created: 'i-lucide-sparkles',
    user_joined: 'i-lucide-user-plus',
    inbox_created: 'i-lucide-inbox',
    suspended: 'i-lucide-lock',
    impersonated: 'i-lucide-venetian-mask',
    admin_action: 'i-lucide-shield',
    last_message: 'i-lucide-message-square',
};

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.ACCOUNT_OVERVIEW.${key}`, params);

function initialTab(): Tab {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace('#', '');

    return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'overview';
}

// Cột tin mỗi ngày; SVG tự co theo khung, không kéo thư viện biểu đồ vào trang.
export function UsageBars({ usage }: { usage: AccountOverviewProps['usage'] }) {
    const max = Math.max(1, ...usage.map(day => day.count));
    const total = usage.reduce((sum, day) => sum + day.count, 0);
    const barWidth = 100 / Math.max(1, usage.length);

    return (
        <figure className="flex flex-col gap-2">
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${label('SECTIONS.USAGE')}: ${label('SECTIONS.USAGE_TOTAL', { count: formatNumber(total) })}`}
                className="h-24 w-full text-console-brand"
            >
                {usage.map((day, index) => {
                    const height = day.count === 0 ? 0.6 : Math.max(1.5, (day.count / max) * 32);

                    return (
                        <rect
                            key={day.date}
                            x={index * barWidth + barWidth * 0.15}
                            y={32 - height}
                            width={barWidth * 0.7}
                            height={height}
                            rx={0.4}
                            className={day.count === 0 ? 'fill-console-border' : 'fill-current'}
                        >
                            <title>{`${formatDate(day.date)}: ${formatNumber(day.count)}`}</title>
                        </rect>
                    );
                })}
            </svg>
            <figcaption className="flex justify-between text-xs text-console-muted-foreground">
                <span>{usage[0] ? formatDate(usage[0].date) : ''}</span>
                <span className="font-medium text-console-foreground">{label('SECTIONS.USAGE_TOTAL', { count: formatNumber(total) })}</span>
                <span>{usage.length ? formatDate(usage[usage.length - 1].date) : ''}</span>
            </figcaption>
        </figure>
    );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
    if (events.length === 0) return <p className="text-console-muted-foreground">{label('EMPTY.TIMELINE')}</p>;

    return (
        <ol className="flex flex-col">
            {events.map((event, index) => (
                <li key={`${event.type}-${event.at}-${index}`} className="flex gap-3 pb-4 last:pb-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-console-accent text-console-muted-foreground">
                        <Icon name={TIMELINE_ICON[event.type] ?? 'i-lucide-dot'} className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="break-words">{event.title}</p>
                        {event.detail ? <p className="break-words text-xs text-console-muted-foreground">{event.detail}</p> : null}
                        <p className="text-xs text-console-muted-foreground" title={formatDateTime(event.at)}>
                            {formatRelative(event.at)}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function Onboarding({ onboarding }: { onboarding: AccountOverviewProps['onboarding'] }) {
    return (
        <div className="flex flex-col gap-3">
            <p className="text-console-muted-foreground">
                {onboarding.step ? label('ONBOARDING.CURRENT_STEP', { step: onboarding.stepLabel ?? onboarding.step }) : label('ONBOARDING.FINISHED')}
            </p>
            <ul className="flex flex-col gap-2">
                {onboarding.milestones.map(milestone => (
                    <li key={milestone.key} className="flex items-center gap-2">
                        <Icon
                            name={milestone.done ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'}
                            className={milestone.done ? 'text-console-success-foreground' : 'text-console-muted-foreground'}
                        />
                        <span className={cn('flex-1', !milestone.done && 'text-console-muted-foreground')}>{milestone.label}</span>
                        {milestone.at ? <span className="text-xs text-console-muted-foreground">{formatDate(milestone.at)}</span> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function LockDialog({ account, suspension, url, open, onOpenChange }: {
    account: AccountOverviewProps['account'];
    suspension: AccountOverviewProps['suspension'];
    url: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const errors = usePage<{ errors?: Record<string, string> }>().props.errors ?? {};
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [category, setCategory] = useState(suspension.categories[0]?.value ?? '');
    const [reason, setReason] = useState('');
    const [pending, setPending] = useState(false);
    const categoryId = useId();
    const reasonId = useId();
    const close = (next: boolean) => {
        onOpenChange(next);
        if (!next) setStep('form');
    };

    const submit = () =>
        router.post(url, { category, reason }, {
            preserveScroll: true,
            onStart: () => setPending(true),
            onFinish: () => setPending(false),
            onSuccess: () => close(false),
            onError: () => setStep('form'),
        });

    if (step === 'confirm') {
        return (
            <ConfirmDialog
                open={open}
                onOpenChange={close}
                title={label('LOCK.CONFIRM_TITLE', { name: account.name })}
                description={label('LOCK.CONFIRM_DESCRIPTION')}
                confirmLabel={label('LOCK.CONFIRM')}
                cancelLabel={t('ADMIN_OPERATIONS.COMMON.BACK')}
                pending={pending}
                onConfirm={submit}
            >
                <p className="rounded-md bg-console-muted px-3 py-2 break-words">
                    {suspension.categories.find(option => option.value === category)?.label}: {reason}
                </p>
            </ConfirmDialog>
        );
    }

    return (
        <Dialog
            open={open}
            onOpenChange={close}
            title={label('LOCK.TITLE')}
            description={label('LOCK.DESCRIPTION')}
            footer={
                <>
                    <Button variant="outline" onClick={() => close(false)}>
                        {t('ADMIN_OPERATIONS.COMMON.CANCEL')}
                    </Button>
                    <Button variant="destructive" disabled={!category || reason.trim() === ''} onClick={() => setStep('confirm')}>
                        {t('ADMIN_OPERATIONS.COMMON.CONTINUE')}
                    </Button>
                </>
            }
        >
            <Field label={label('LOCK.CATEGORY')} htmlFor={categoryId} required error={errors.category}>
                <Select id={categoryId} value={category} onChange={event => setCategory(event.target.value)}>
                    {suspension.categories.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </Field>
            <Field
                label={label('LOCK.REASON')}
                htmlFor={reasonId}
                required
                hint={label('LOCK.REASON_HINT', { max: suspension.maxReasonLength })}
                error={errors.reason}
            >
                <Textarea
                    id={reasonId}
                    value={reason}
                    maxLength={suspension.maxReasonLength}
                    onChange={event => setReason(event.target.value)}
                />
            </Field>
        </Dialog>
    );
}

// Đăng nhập hộ mở phiên ở bundle app: nộp <form> gốc sang tab mới (router.post
// gắn X-Inertia làm máy chủ trả JSON Inertia mà bundle console không vẽ được).
function ImpersonateDialog({ users, csrf, open, onOpenChange }: {
    users: AccountUserRow[];
    csrf: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [userId, setUserId] = useState(users[0]?.id ?? 0);
    const [reason, setReason] = useState('');
    const userFieldId = useId();
    const reasonId = useId();
    const formId = useId();
    const target = users.find(user => user.id === userId);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title={label('IMPERSONATE.TITLE')}
            description={label('IMPERSONATE.DESCRIPTION')}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('ADMIN_OPERATIONS.COMMON.CANCEL')}
                    </Button>
                    <Button
                        type="submit"
                        form={formId}
                        disabled={!target || reason.trim().length < IMPERSONATE_REASON_MIN}
                        onClick={() => setTimeout(() => onOpenChange(false))}
                    >
                        <Icon name="i-lucide-external-link" />
                        {label('IMPERSONATE.SUBMIT')}
                    </Button>
                </>
            }
        >
            {users.length === 0 ? (
                <p className="text-console-muted-foreground">{label('IMPERSONATE.NO_USERS')}</p>
            ) : (
                <form id={formId} method="post" action={target?.impersonateUrl} target="_blank" className="flex flex-col gap-4">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field label={label('IMPERSONATE.USER')} htmlFor={userFieldId}>
                        <Select id={userFieldId} value={userId} onChange={event => setUserId(Number(event.target.value))}>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name ?? `#${user.id}`} · {user.email} · {user.role}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={label('IMPERSONATE.REASON', { min: IMPERSONATE_REASON_MIN })} htmlFor={reasonId} required>
                        <Textarea id={reasonId} name="reason" value={reason} onChange={event => setReason(event.target.value)} />
                    </Field>
                </form>
            )}
        </Dialog>
    );
}

function UsersTable({ users }: { users: AccountUserRow[] }) {
    if (users.length === 0) return <EmptyState icon="i-lucide-users" title={label('EMPTY.USERS')} />;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{label('COLUMNS.NAME')}</TableHead>
                    <TableHead>{label('COLUMNS.ROLE')}</TableHead>
                    <TableHead>{label('COLUMNS.LAST_SIGN_IN')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>
                            <Link href={user.url} className="font-medium text-console-brand hover:underline">
                                {user.name ?? `#${user.id}`}
                            </Link>
                            <p className="break-all text-xs text-console-muted-foreground">{user.email}</p>
                            {user.confirmed ? null : <Badge variant="warning" className="mt-1">{label('UNCONFIRMED')}</Badge>}
                        </TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell className="whitespace-nowrap" title={formatDateTime(user.lastSignInAt)}>
                            {user.lastSignInAt ? formatRelative(user.lastSignInAt) : t('ADMIN_OPERATIONS.COMMON.NEVER')}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function InboxesTable({ inboxes }: { inboxes: ChannelHealthItem[] }) {
    if (inboxes.length === 0) return <EmptyState icon="i-lucide-inbox" title={label('EMPTY.INBOXES')} />;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{label('COLUMNS.INBOX')}</TableHead>
                    <TableHead>{label('COLUMNS.HEALTH')}</TableHead>
                    <TableHead>{label('COLUMNS.SINCE')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {inboxes.map(inbox => (
                    <TableRow key={inbox.inboxId}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <img src={inbox.platform.logo_url} alt="" className="size-5 shrink-0 rounded" />
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{inbox.inboxName}</p>
                                    <p className="text-xs text-console-muted-foreground">
                                        {inbox.platform.name} · #{inbox.inboxId}
                                    </p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {inbox.healthy ? (
                                <Badge variant="success">{label('HEALTHY')}</Badge>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <SeverityBadge severity={inbox.severity} label={inbox.problemLabel} />
                                    {problemDetail(inbox.detail) ? (
                                        <span className="break-words text-xs text-console-muted-foreground">{problemDetail(inbox.detail)}</span>
                                    ) : null}
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap" title={formatDateTime(inbox.since)}>
                            {inbox.since ? formatRelative(inbox.since) : '—'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function Section({ title, description, action, children, className }: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardHeader>
                <div className="min-w-0">
                    <CardTitle>{title}</CardTitle>
                    {description ? <CardDescription>{description}</CardDescription> : null}
                </div>
                {action}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export default function AccountOverview(props: AccountOverviewProps) {
    const { account, suspension, users, inboxes, stats, usage, onboarding, timeline, stickers, impersonations, urls, csrf } = props;
    const [tab, setTab] = useState<Tab>(initialTab);
    const [dialog, setDialog] = useState<'lock' | 'unlock' | 'impersonate' | null>(null);
    const [pending, setPending] = useState(false);
    const suspended = account.status === 'suspended';
    const failingInboxes = inboxes.filter(inbox => !inbox.healthy).length;
    const categoryLabel = (value?: string) => suspension.categories.find(option => option.value === value)?.label ?? value ?? '—';

    const selectTab = (next: Tab) => {
        setTab(next);
        window.history.replaceState(window.history.state, '', `#${next}`);
    };

    const unlock = () =>
        router.post(urls.unsuspend, {}, {
            preserveScroll: true,
            onStart: () => setPending(true),
            onFinish: () => setPending(false),
            onSuccess: () => setDialog(null),
        });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Link href="/admin/accounts" className="inline-flex w-fit items-center gap-1 text-sm text-console-muted-foreground hover:text-console-foreground">
                    <Icon name="i-lucide-arrow-left" className="size-3.5" />
                    {label('BACK')}
                </Link>
                <PageHeader
                    title={account.name}
                    description={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Badge variant={suspended ? 'destructive' : 'success'}>{label(`STATUS.${account.status}`)}</Badge>
                            <span>#{account.id}</span>
                            <span>{label('CREATED_AT', { date: formatDate(account.createdAt) })}</span>
                            <span>
                                {label('LAST_ACTIVITY', {
                                    date: stats.lastActivityAt ? formatRelative(stats.lastActivityAt) : t('ADMIN_OPERATIONS.COMMON.NEVER'),
                                })}
                            </span>
                        </span>
                    }
                    actions={
                        <>
                            <Button variant="outline" onClick={() => setDialog('impersonate')}>
                                <Icon name="i-lucide-venetian-mask" />
                                {label('ACTIONS.IMPERSONATE')}
                            </Button>
                            <Link href={urls.edit} className={buttonClassName({ variant: 'outline' })}>
                                <Icon name="i-lucide-pencil" />
                                {label('ACTIONS.EDIT')}
                            </Link>
                            {suspended ? (
                                <Button onClick={() => setDialog('unlock')}>
                                    <Icon name="i-lucide-lock-open" />
                                    {label('ACTIONS.UNLOCK')}
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={() => setDialog('lock')}>
                                    <Icon name="i-lucide-lock" />
                                    {label('ACTIONS.LOCK')}
                                </Button>
                            )}
                        </>
                    }
                />
            </div>

            {suspended && suspension.history.length > 0 ? (
                <Alert tone="destructive" title={label('STATUS.suspended')}>
                    {categoryLabel(suspension.history[suspension.history.length - 1].category)}:{' '}
                    {suspension.history[suspension.history.length - 1].reason}
                </Alert>
            ) : null}

            <div role="tablist" aria-label={account.name} className="-mx-1 flex gap-1 overflow-x-auto border-b border-console-border px-1">
                {TABS.map(key => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        id={`tab-${key}`}
                        aria-selected={tab === key}
                        aria-controls={`panel-${key}`}
                        onClick={() => selectTab(key)}
                        className={cn(
                            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-console-ring/50',
                            tab === key
                                ? 'border-console-primary text-console-foreground'
                                : 'border-transparent text-console-muted-foreground hover:text-console-foreground',
                        )}
                    >
                        {label(`TABS.${key.toUpperCase()}`)}
                        {key === 'inboxes' && failingInboxes > 0 ? (
                            <Badge variant="destructive" className="ml-1.5">{failingInboxes}</Badge>
                        ) : null}
                    </button>
                ))}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6">
                {tab === 'overview' ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <StatCard label={label('STATS.USERS')} value={stats.users} icon="i-lucide-users" />
                            <StatCard label={label('STATS.INBOXES')} value={stats.inboxes} icon="i-lucide-inbox" />
                            <StatCard label={label('STATS.CONVERSATIONS')} value={stats.conversations} icon="i-lucide-messages-square" />
                            <StatCard label={label('STATS.CONTACTS')} value={stats.contacts} icon="i-lucide-contact" />
                            <StatCard label={label('STATS.MESSAGES_7D')} value={stats.messages7d} icon="i-lucide-message-square" />
                            <StatCard label={label('STATS.MESSAGES_30D')} value={stats.messages30d} icon="i-lucide-calendar" />
                        </div>
                        <div className="grid gap-6 lg:grid-cols-3">
                            <Section title={label('SECTIONS.USAGE')} className="lg:col-span-2">
                                <UsageBars usage={usage} />
                            </Section>
                            <Section title={label('SECTIONS.ONBOARDING')}>
                                <Onboarding onboarding={onboarding} />
                            </Section>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Section title={label('SECTIONS.INBOXES')} className="gap-3 [&>div:last-child]:px-0">
                                <InboxesTable inboxes={inboxes} />
                            </Section>
                            <Section title={label('SECTIONS.TIMELINE')}>
                                <Timeline events={timeline.slice(0, 8)} />
                            </Section>
                        </div>
                    </>
                ) : null}

                {tab === 'users' ? (
                    <>
                        <Section title={label('SECTIONS.USERS')} className="gap-3 [&>div:last-child]:px-0">
                            <UsersTable users={users} />
                        </Section>
                        <Section
                            title={label('SECTIONS.IMPERSONATIONS')}
                            className="gap-3 [&>div:last-child]:px-0"
                            action={
                                <Link href={urls.impersonations} className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
                                    <Icon name="i-lucide-arrow-up-right" />
                                </Link>
                            }
                        >
                            {impersonations.length === 0 ? (
                                <p className="px-5 text-console-muted-foreground">{label('EMPTY.IMPERSONATIONS')}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{label('COLUMNS.AT')}</TableHead>
                                            <TableHead>{label('COLUMNS.ADMIN')}</TableHead>
                                            <TableHead>{label('COLUMNS.TARGET')}</TableHead>
                                            <TableHead>{label('COLUMNS.REASON')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {impersonations.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    <Link href={row.url} className="text-console-brand hover:underline">
                                                        {formatDateTime(row.createdAt)}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="break-all">{row.superAdmin?.email ?? '—'}</TableCell>
                                                <TableCell className="break-all">{row.targetUser?.email ?? '—'}</TableCell>
                                                <TableCell className="min-w-48 break-words">{row.reason}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Section>
                    </>
                ) : null}

                {tab === 'inboxes' ? (
                    <Section title={label('SECTIONS.INBOXES')} className="gap-3 [&>div:last-child]:px-0">
                        <InboxesTable inboxes={inboxes} />
                    </Section>
                ) : null}

                {tab === 'activity' ? (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Section
                            title={label('SECTIONS.TIMELINE')}
                            className="lg:col-span-2"
                            action={
                                <div className="flex gap-2">
                                    <Link href={urls.auditLogs} className={buttonClassName({ variant: 'outline', size: 'sm' })}>
                                        {label('ACTIONS.AUDIT')}
                                    </Link>
                                    <Link href={urls.data} className={buttonClassName({ variant: 'outline', size: 'sm' })}>
                                        {label('ACTIONS.DATA')}
                                    </Link>
                                </div>
                            }
                        >
                            <Timeline events={timeline} />
                        </Section>
                        <Section title={label('SECTIONS.SUSPENSIONS')}>
                            {suspension.history.length === 0 ? (
                                <p className="text-console-muted-foreground">{label('EMPTY.SUSPENSIONS')}</p>
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {[...suspension.history].reverse().map((entry, index) => (
                                        <li key={`${entry.suspended_at}-${index}`} className="flex flex-col gap-0.5">
                                            <span className="text-xs text-console-muted-foreground">{formatDateTime(entry.suspended_at)}</span>
                                            <span className="font-medium">{categoryLabel(entry.category)}</span>
                                            <span className="break-words">{entry.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    </div>
                ) : null}

                {tab === 'stickers' ? (
                    <Section title={label('SECTIONS.STICKERS')} description={label('STICKERS.DESCRIPTION')}>
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-lg font-semibold">
                                {label('STICKERS.SUMMARY', { packs: formatNumber(stickers.packs), stickers: formatNumber(stickers.stickers) })}
                            </p>
                            <Link href={urls.stickers} className={buttonClassName()}>
                                <Icon name="i-lucide-sticker" />
                                {label('STICKERS.MANAGE')}
                            </Link>
                        </div>
                    </Section>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
                <Link href={urls.show} className={buttonClassName({ variant: 'link', className: 'px-0' })}>
                    {label('ACTIONS.RECORD')}
                </Link>
            </div>

            <LockDialog account={account} suspension={suspension} url={urls.suspend} open={dialog === 'lock'} onOpenChange={open => setDialog(open ? 'lock' : null)} />
            <ConfirmDialog
                open={dialog === 'unlock'}
                onOpenChange={open => setDialog(open ? 'unlock' : null)}
                title={label('UNLOCK.TITLE', { name: account.name })}
                description={label('UNLOCK.DESCRIPTION')}
                confirmLabel={label('UNLOCK.CONFIRM')}
                confirmVariant="default"
                pending={pending}
                onConfirm={unlock}
            />
            <ImpersonateDialog users={users} csrf={csrf} open={dialog === 'impersonate'} onOpenChange={open => setDialog(open ? 'impersonate' : null)} />
        </div>
    );
}
