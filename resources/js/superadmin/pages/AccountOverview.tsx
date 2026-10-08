import { router, usePage } from '@inertiajs/react';
import { useId, useState } from 'react';
import {
    ArrowUpRightIcon,
    CalendarIcon,
    CircleCheckIcon,
    CircleDashedIcon,
    ContactIcon,
    ExternalLinkIcon,
    LockIcon,
    LockOpenIcon,
    MessageSquareIcon,
    MessagesSquareIcon,
    PencilIcon,
    StickerIcon,
    VenetianMaskIcon,
} from 'lucide-react';

import Link from '@admin/components/Link';
import { Alert, AlertDescription, AlertTitle } from '@admin/components/ui/alert';
import { Avatar, AvatarFallback, AvatarGeneratedFallback, AvatarImage } from '@admin/components/ui/avatar';
import { Badge } from '@admin/components/ui/badge';
import { Button, buttonVariants } from '@admin/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@admin/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@admin/components/ui/field';
import { Progress } from '@admin/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import { Textarea } from '@admin/components/ui/textarea';
import { formatDate, formatDateTime, initialsOf } from '@admin/lib/format';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { cn } from '@admin/lib/utils';
import { ActivityTimeline } from '@admin/views/apps/accounts/view/activity-timeline';
import StatisticsCard from '@admin/views/apps/accounts/view/statistics-card';
import { MEANING_TONE, TONE_PROGRESS, TONE_TEXT } from '@admin/views/dashboards/tones';
import { UsageChart } from '@admin/views/apps/accounts/view/usage-chart';
import { ConfirmDialog } from '@admin/views/apps/resources/dialogs/confirm-dialog';
import { RecordViewLeftPanel } from '@admin/views/apps/resources/view/record-view-left-panel';
import { SectionCard, TableCard } from '@admin/views/apps/resources/view/section-card';
import PageHeader from '@admin/views/pages/page-header';
import AccountStickerLibrary from '@admin/views/stickers/AccountStickerLibrary';

import { t } from '../../i18n';
import { STATUS_BADGE_STYLES } from '../components/FieldValue';
import { useConsoleDictionary, useConsoleLabels } from '../labels';
import type { ChannelHealthItem } from './ChannelHealth';
import { formatNumber, formatRelative } from './operationsFormat';

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

type FeatureUsed = { key: string; label: string; group: string; events: number; lastAt: string | null };

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
    features: FeatureUsed[];
    stickers: { packs: number; stickers: number };
    impersonations: Impersonation[];
    urls: Record<'show' | 'edit' | 'stickers' | 'auditLogs' | 'data' | 'suspend' | 'unsuspend' | 'impersonations' | 'featureUsage', string>;
    csrf: string;
};

const TABS = ['overview', 'users', 'inboxes', 'activity', 'stickers'] as const;
type Tab = (typeof TABS)[number];

const IMPERSONATE_REASON_MIN = 10;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.ACCOUNT_OVERVIEW.${key}`, params);

// "Hoạt động gần nhất: {date}" → "Hoạt động gần nhất" làm nhãn dòng chi tiết.
const rowLabel = (key: string) => label(key, { date: '' }).replace(/[:\s]+$/, '');

function initialTab(): Tab {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace('#', '');

    return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'overview';
}

// Chi tiết của driver: số lần lỗi (chuỗi số) hiện thành câu, lý do dạng chữ giữ nguyên.
function problemDetail(detail: string | null): string | null {
    if (!detail) return null;

    return /^\d+$/.test(detail) ? t('ADMIN_OPERATIONS.CHANNEL_HEALTH.DETAIL_COUNT', { count: Number(detail) }) : detail;
}

// "Trung bình 1,6 tin/ngày": dòng phụ cho thẻ tin 7 / 30 ngày.
const dailyAverage = (count: number, days: number) =>
    label('STATS.DAILY_AVERAGE', { value: formatNumber(Math.round((count / days) * 10) / 10) });

const usageTotal = (usage: AccountOverviewProps['usage']) =>
    label('SECTIONS.USAGE_TOTAL', { count: formatNumber(usage.reduce((sum, day) => sum + day.count, 0)) });

// Cột tin mỗi ngày trong 30 ngày qua; tổng nằm ở mô tả thẻ, không chen giữa hai mốc ngày.
export function UsageBars({ usage, className }: { usage: AccountOverviewProps['usage']; className?: string }) {
    return (
        <UsageChart
            className={className}
            data={usage.map(day => ({ date: day.date, label: formatDate(day.date), count: day.count }))}
            seriesLabel={label('SECTIONS.USAGE')}
            summary={usageTotal(usage)}
            dayLabel={day => `${day.label}: ${label('SECTIONS.USAGE_TOTAL', { count: formatNumber(day.count) })}`}
            startLabel={usage[0] ? formatDate(usage[0].date) : ''}
            endLabel={usage.length ? formatDate(usage[usage.length - 1].date) : ''}
            formatValue={formatNumber}
        />
    );
}

// Tiến độ kích hoạt: sáu bước giống phễu kích hoạt của trang Tổng quan (máy chủ gửi cùng key, cùng tên).
// Dòng đầu là bước onboarding đang đứng; thanh là số bước kích hoạt đã qua.
function Onboarding({ onboarding }: { onboarding: AccountOverviewProps['onboarding'] }) {
    const done = onboarding.milestones.filter(milestone => milestone.done).length;
    const percent = onboarding.milestones.length ? Math.round((done / onboarding.milestones.length) * 100) : 100;
    const tone = done === onboarding.milestones.length ? MEANING_TONE.healthy : MEANING_TONE.accounts;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                        {onboarding.step
                            ? label('ONBOARDING.CURRENT_STEP', { step: onboarding.stepLabel ?? onboarding.step })
                            : label('ONBOARDING.FINISHED')}
                    </span>
                    <span className={cn('font-num shrink-0 font-medium', TONE_TEXT[tone])}>
                        {label('ONBOARDING.DONE_COUNT', { done, total: onboarding.milestones.length })}
                    </span>
                </div>
                <Progress value={percent} aria-label={label('SECTIONS.ONBOARDING')} className={TONE_PROGRESS[tone]} />
            </div>
            <ul className="flex flex-col gap-3">
                {onboarding.milestones.map(milestone => (
                    <li key={milestone.key} className="flex items-center gap-2 text-sm">
                        {milestone.done ? (
                            <CircleCheckIcon className="text-success size-4 shrink-0" />
                        ) : (
                            <CircleDashedIcon className="text-muted-foreground size-4 shrink-0" />
                        )}
                        <span className={cn('min-w-0 flex-1', !milestone.done && 'text-muted-foreground')}>{milestone.label}</span>
                        {milestone.at ? (
                            <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">{formatDate(milestone.at)}</span>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
    if (events.length === 0) return <p className="text-muted-foreground py-4 text-sm">{label('EMPTY.TIMELINE')}</p>;

    return (
        <ActivityTimeline
            activityLog={events.map((event, index) => ({
                id: `${event.type}-${event.at}-${index}`,
                description: event.title,
                detail: event.detail,
                timestamp: formatRelative(event.at),
                timestampTitle: formatDateTime(event.at),
            }))}
        />
    );
}

// Tính năng account đã dùng: mỗi dòng mở danh sách account cùng dùng tính năng đó.
function FeaturesUsed({ features, baseUrl }: { features: FeatureUsed[]; baseUrl: string }) {
    if (features.length === 0) return <p className="text-muted-foreground py-4 text-sm">{label('EMPTY.FEATURES')}</p>;

    return (
        <ul className="divide-y">
            {features.map(feature => (
                <li key={feature.key} className="flex min-h-11 items-center gap-3 py-2 text-sm">
                    <Link href={`${baseUrl}/${feature.key}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                        {feature.label}
                    </Link>
                    <span className="text-muted-foreground shrink-0 tabular-nums">{label('FEATURES.COUNT', { count: formatNumber(feature.events) })}</span>
                    <span className="text-muted-foreground w-28 shrink-0 text-right whitespace-nowrap" title={formatDateTime(feature.lastAt)}>
                        {feature.lastAt ? formatRelative(feature.lastAt) : '-'}
                    </span>
                </li>
            ))}
        </ul>
    );
}

// Khoá hai bước trong cùng một hộp thoại: điền nhóm + lý do, rồi xác nhận lần nữa.
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

    return (
        <Dialog open={open} onOpenChange={next => close(next)}>
            <DialogContent className="sm:max-w-md">
                {step === 'confirm' ? (
                    <>
                        <DialogHeader className="space-y-2">
                            <DialogTitle>{label('LOCK.CONFIRM_TITLE', { name: account.name })}</DialogTitle>
                            <DialogDescription>{label('LOCK.CONFIRM_DESCRIPTION')}</DialogDescription>
                        </DialogHeader>
                        <p className="bg-muted rounded-md px-3 py-2 break-words">
                            {suspension.categories.find(option => option.value === category)?.label}: {reason}
                        </p>
                        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                            <Button variant="outline" onClick={() => setStep('form')}>
                                {t('ADMIN_OPERATIONS.COMMON.BACK')}
                            </Button>
                            <Button variant="destructive" disabled={pending} onClick={submit}>
                                {label('LOCK.CONFIRM')}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader className="space-y-2">
                            <DialogTitle>{label('LOCK.TITLE')}</DialogTitle>
                            <DialogDescription>{label('LOCK.DESCRIPTION')}</DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="gap-4">
                            <Field data-invalid={errors.category ? true : undefined} className="gap-2">
                                <FieldLabel htmlFor={categoryId}>{label('LOCK.CATEGORY')}</FieldLabel>
                                <Select
                                    items={suspension.categories}
                                    value={category}
                                    onValueChange={(value: string | null) => {
                                        if (value) setCategory(value);
                                    }}
                                >
                                    <SelectTrigger id={categoryId} className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false}>
                                        <SelectGroup>
                                            {suspension.categories.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {errors.category ? <FieldError>{errors.category}</FieldError> : null}
                            </Field>
                            <Field data-invalid={errors.reason ? true : undefined} className="gap-2">
                                <FieldLabel htmlFor={reasonId}>{label('LOCK.REASON')}</FieldLabel>
                                <Textarea
                                    id={reasonId}
                                    value={reason}
                                    required
                                    maxLength={suspension.maxReasonLength}
                                    aria-invalid={errors.reason ? true : undefined}
                                    onChange={event => setReason(event.target.value)}
                                />
                                <FieldDescription>{label('LOCK.REASON_HINT', { max: suspension.maxReasonLength })}</FieldDescription>
                                {errors.reason ? <FieldError>{errors.reason}</FieldError> : null}
                            </Field>
                        </FieldGroup>
                        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                            <DialogClose render={<Button variant="outline" />}>{t('ADMIN_OPERATIONS.COMMON.CANCEL')}</DialogClose>
                            <Button variant="destructive" disabled={!category || reason.trim() === ''} onClick={() => setStep('confirm')}>
                                {t('ADMIN_OPERATIONS.COMMON.CONTINUE')}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
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
    const userItems = users.map(user => ({
        value: String(user.id),
        label: `${user.name ?? `#${user.id}`} · ${user.email} · ${user.role}`,
    }));

    return (
        <Dialog open={open} onOpenChange={next => onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="space-y-2">
                    <DialogTitle>{label('IMPERSONATE.TITLE')}</DialogTitle>
                    <DialogDescription>{label('IMPERSONATE.DESCRIPTION')}</DialogDescription>
                </DialogHeader>
                {users.length === 0 ? (
                    <p className="text-muted-foreground">{label('IMPERSONATE.NO_USERS')}</p>
                ) : (
                    <form id={formId} method="post" action={target?.impersonateUrl} target="_blank">
                        <input type="hidden" name="_token" value={csrf} />
                        <FieldGroup className="gap-4">
                            <Field className="gap-2">
                                <FieldLabel htmlFor={userFieldId}>{label('IMPERSONATE.USER')}</FieldLabel>
                                <Select
                                    items={userItems}
                                    value={String(userId)}
                                    onValueChange={(value: string | null) => {
                                        if (value) setUserId(Number(value));
                                    }}
                                >
                                    <SelectTrigger id={userFieldId} className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false}>
                                        <SelectGroup>
                                            {userItems.map(item => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field className="gap-2">
                                <FieldLabel htmlFor={reasonId}>{label('IMPERSONATE.REASON', { min: IMPERSONATE_REASON_MIN })}</FieldLabel>
                                <Textarea id={reasonId} name="reason" required value={reason} onChange={event => setReason(event.target.value)} />
                            </Field>
                        </FieldGroup>
                    </form>
                )}
                <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                    <DialogClose render={<Button variant="outline" />}>{t('ADMIN_OPERATIONS.COMMON.CANCEL')}</DialogClose>
                    <Button
                        type="submit"
                        form={formId}
                        disabled={!target || reason.trim().length < IMPERSONATE_REASON_MIN}
                        onClick={() => setTimeout(() => onOpenChange(false))}
                    >
                        <ExternalLinkIcon />
                        {label('IMPERSONATE.SUBMIT')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UsersTable({ users }: { users: AccountUserRow[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow className="h-14 border-t">
                    <TableHead className="text-muted-foreground pl-4">{label('COLUMNS.NAME')}</TableHead>
                    <TableHead className="text-muted-foreground">{label('COLUMNS.ROLE')}</TableHead>
                    <TableHead className="text-muted-foreground pr-4">{label('COLUMNS.LAST_SIGN_IN')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                            {label('EMPTY.USERS')}
                        </TableCell>
                    </TableRow>
                ) : (
                    users.map(user => (
                        <TableRow key={user.id}>
                            <TableCell className="h-14 pl-4">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-9">
                                        <AvatarGeneratedFallback seed={avatarSeed('user', user.id)} name={user.name ?? user.email} />
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col">
                                        <Link href={user.url} className="font-medium hover:underline">
                                            {user.name ?? `#${user.id}`}
                                        </Link>
                                        <span className="text-muted-foreground break-all">{user.email}</span>
                                    </div>
                                    {user.confirmed ? null : (
                                        <Badge className={cn('h-auto rounded-sm border-none', STATUS_BADGE_STYLES.pending)}>
                                            {label('UNCONFIRMED')}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="capitalize">{user.role}</TableCell>
                            <TableCell className="pr-4 whitespace-nowrap" title={formatDateTime(user.lastSignInAt)}>
                                {user.lastSignInAt ? formatRelative(user.lastSignInAt) : t('ADMIN_OPERATIONS.COMMON.NEVER')}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

function InboxesTable({ inboxes }: { inboxes: ChannelHealthItem[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow className="h-14 border-t">
                    <TableHead className="text-muted-foreground pl-4">{label('COLUMNS.INBOX')}</TableHead>
                    <TableHead className="text-muted-foreground">{label('COLUMNS.HEALTH')}</TableHead>
                    <TableHead className="text-muted-foreground pr-4">{label('COLUMNS.SINCE')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {inboxes.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                            {label('EMPTY.INBOXES')}
                        </TableCell>
                    </TableRow>
                ) : (
                    inboxes.map(inbox => (
                        <TableRow key={inbox.inboxId}>
                            <TableCell className="h-14 pl-4">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-9 rounded-sm after:rounded-sm">
                                        <AvatarImage src={inbox.platform.logo_url} alt="" className="rounded-sm" />
                                        <AvatarFallback className="rounded-sm text-xs">{initialsOf(inbox.platform.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate font-medium">{inbox.inboxName}</span>
                                        <span className="text-muted-foreground">
                                            {inbox.platform.name} · #{inbox.inboxId}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {inbox.healthy ? (
                                    <Badge className={cn('h-auto rounded-sm border-none', STATUS_BADGE_STYLES.active)}>{label('HEALTHY')}</Badge>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <Badge
                                            className={cn(
                                                'h-auto rounded-sm border-none',
                                                inbox.severity === 'warning' ? STATUS_BADGE_STYLES.pending : STATUS_BADGE_STYLES.suspended,
                                            )}
                                        >
                                            {inbox.problemLabel}
                                        </Badge>
                                        {problemDetail(inbox.detail) ? (
                                            <span className="text-muted-foreground text-xs break-words">{problemDetail(inbox.detail)}</span>
                                        ) : null}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="pr-4 whitespace-nowrap" title={formatDateTime(inbox.since)}>
                                {inbox.since ? formatRelative(inbox.since) : '-'}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

export default function AccountOverview(props: AccountOverviewProps) {
    const { account, suspension, users, inboxes, stats, usage, onboarding, timeline, features, stickers, impersonations, urls, csrf } = props;
    const { attribute } = useConsoleDictionary();
    const consoleLabel = useConsoleLabels();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [dialog, setDialog] = useState<'lock' | 'unlock' | 'impersonate' | null>(null);
    const [pending, setPending] = useState(false);
    const suspended = account.status === 'suspended';
    const failingInboxes = inboxes.filter(inbox => !inbox.healthy).length;
    const categoryLabel = (value?: string) => suspension.categories.find(option => option.value === value)?.label ?? value ?? '-';
    const lastSuspension = suspension.history[suspension.history.length - 1];

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
        <>
            <PageHeader title={label('PAGE.TITLE')} description={label('PAGE.DESCRIPTION', { name: account.name })} />
            <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
                <RecordViewLeftPanel
                    titleAs="h2"
                    title={account.name}
                    avatarSeed={avatarSeed('account', account.id)}
                    badge={
                        <Badge
                            className={cn(
                                'h-auto rounded-sm border-none',
                                suspended ? STATUS_BADGE_STYLES.suspended : STATUS_BADGE_STYLES.active,
                            )}
                        >
                            {label(`STATUS.${account.status}`)}
                        </Badge>
                    }
                    detailsTitle={consoleLabel('details')}
                    details={[
                        {
                            key: 'id',
                            label: attribute('id', 'ID'),
                            value: (
                                <Link href={urls.show} title={label('ACTIONS.RECORD')} className="text-primary hover:underline">
                                    #{account.id}
                                </Link>
                            ),
                        },
                        { key: 'locale', label: attribute('locale', 'Locale'), value: account.locale },
                        { key: 'created_at', label: attribute('created_at', 'Created at'), value: formatDate(account.createdAt) },
                        {
                            key: 'last_activity',
                            label: rowLabel('LAST_ACTIVITY'),
                            value: stats.lastActivityAt ? formatRelative(stats.lastActivityAt) : t('ADMIN_OPERATIONS.COMMON.NEVER'),
                        },
                        { key: 'users', label: label('STATS.USERS'), value: formatNumber(stats.users) },
                        { key: 'inboxes', label: label('STATS.INBOXES'), value: formatNumber(stats.inboxes) },
                    ]}
                    actions={
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                            <Link href={urls.edit} className={buttonVariants()}>
                                <PencilIcon />
                                {label('ACTIONS.EDIT')}
                            </Link>
                            {suspended ? (
                                <Button variant="outline" onClick={() => setDialog('unlock')}>
                                    <LockOpenIcon />
                                    {label('ACTIONS.UNLOCK')}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setDialog('lock')}
                                >
                                    <LockIcon />
                                    {label('ACTIONS.LOCK')}
                                </Button>
                            )}
                            <Button variant="outline" className="sm:col-span-2" onClick={() => setDialog('impersonate')}>
                                <VenetianMaskIcon />
                                {label('ACTIONS.IMPERSONATE')}
                            </Button>
                        </div>
                    }
                />

                <div className="flex min-w-0 flex-col gap-6">
                    {suspended && lastSuspension ? (
                        <Alert variant="destructive">
                            <LockIcon />
                            <AlertTitle>{label('STATUS.suspended')}</AlertTitle>
                            <AlertDescription>
                                {categoryLabel(lastSuspension.category)}: {lastSuspension.reason}
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    <Tabs value={tab} onValueChange={value => selectTab(value as Tab)} className="flex-1 justify-between gap-6">
                        {/* Tab dồn trái theo bề rộng chữ (không dàn đều cả hàng); màn hẹp cuộn ngang trên một dòng
                            thay vì rơi xuống dòng hai. */}
                        <TabsList
                            variant="line"
                            className="w-full justify-start overflow-x-auto pb-1.5 group-data-horizontal/tabs:h-auto sm:group-data-horizontal/tabs:h-10"
                        >
                                {TABS.map(key => (
                                    <TabsTrigger key={key} value={key} className="h-11 flex-none px-3 sm:h-full">
                                        {label(`TABS.${key.toUpperCase()}`)}
                                        {key === 'inboxes' && failingInboxes > 0 ? (
                                            <Badge variant="destructive" className="ml-1">
                                                {failingInboxes}
                                            </Badge>
                                        ) : null}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Màu theo nghĩa, giống trang Tổng quan: hội thoại / tin nhắn primary, liên hệ (người) navy. */}
                            <div className="grid grid-cols-2 gap-4 lg:gap-6 xl:grid-cols-4">
                                <StatisticsCard
                                    icon={<MessagesSquareIcon className="size-4" />}
                                    value={formatNumber(stats.conversations)}
                                    title={label('STATS.CONVERSATIONS')}
                                    description={t('ADMIN_DASHBOARD.RANGE.SNAPSHOT')}
                                    tone={MEANING_TONE.conversations}
                                />
                                <StatisticsCard
                                    icon={<ContactIcon className="size-4" />}
                                    value={formatNumber(stats.contacts)}
                                    title={label('STATS.CONTACTS')}
                                    description={t('ADMIN_DASHBOARD.RANGE.SNAPSHOT')}
                                    tone={MEANING_TONE.people}
                                />
                                <StatisticsCard
                                    icon={<MessageSquareIcon className="size-4" />}
                                    value={formatNumber(stats.messages7d)}
                                    title={label('STATS.MESSAGES_7D')}
                                    description={dailyAverage(stats.messages7d, 7)}
                                    tone={MEANING_TONE.messages}
                                />
                                <StatisticsCard
                                    icon={<CalendarIcon className="size-4" />}
                                    value={formatNumber(stats.messages30d)}
                                    title={label('STATS.MESSAGES_30D')}
                                    description={dailyAverage(stats.messages30d, 30)}
                                    tone={MEANING_TONE.messages}
                                />
                            </div>
                            <div className="grid gap-6 xl:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">{label('SECTIONS.USAGE')}</CardTitle>
                                        <CardDescription>{usageTotal(usage)}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col">
                                        <UsageBars usage={usage} className="flex-1" />
                                    </CardContent>
                                </Card>
                                <SectionCard title={label('SECTIONS.ONBOARDING')} description={label('ONBOARDING.DESCRIPTION')}>
                                    <Onboarding onboarding={onboarding} />
                                </SectionCard>
                            </div>
                            <SectionCard title={label('SECTIONS.TIMELINE')}>
                                <Timeline events={timeline.slice(0, 5)} />
                            </SectionCard>
                        </TabsContent>

                        <TabsContent value="users" className="space-y-6">
                            <TableCard title={label('SECTIONS.USERS')}>
                                <UsersTable users={users} />
                            </TableCard>
                            <TableCard
                                title={label('SECTIONS.IMPERSONATIONS')}
                                action={
                                    <Link
                                        href={urls.impersonations}
                                        aria-label={label('SECTIONS.IMPERSONATIONS')}
                                        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                                    >
                                        <ArrowUpRightIcon />
                                    </Link>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow className="h-14 border-t">
                                            <TableHead className="text-muted-foreground pl-4">{label('COLUMNS.AT')}</TableHead>
                                            <TableHead className="text-muted-foreground">{label('COLUMNS.ADMIN')}</TableHead>
                                            <TableHead className="text-muted-foreground">{label('COLUMNS.TARGET')}</TableHead>
                                            <TableHead className="text-muted-foreground pr-4">{label('COLUMNS.REASON')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {impersonations.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                    {label('EMPTY.IMPERSONATIONS')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            impersonations.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="h-14 pl-4 whitespace-nowrap">
                                                        <Link href={row.url} className="font-medium hover:underline">
                                                            {formatDateTime(row.createdAt)}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="break-all">{row.superAdmin?.email ?? '-'}</TableCell>
                                                    <TableCell className="break-all">{row.targetUser?.email ?? '-'}</TableCell>
                                                    <TableCell className="min-w-48 pr-4 break-words whitespace-normal">{row.reason}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableCard>
                        </TabsContent>

                        <TabsContent value="inboxes">
                            <TableCard title={label('SECTIONS.INBOXES')}>
                                <InboxesTable inboxes={inboxes} />
                            </TableCard>
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-6">
                            <SectionCard
                                title={label('SECTIONS.TIMELINE')}
                                action={
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={urls.auditLogs} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                            {label('ACTIONS.AUDIT')}
                                        </Link>
                                        <Link href={urls.data} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                            {label('ACTIONS.DATA')}
                                        </Link>
                                    </div>
                                }
                            >
                                <Timeline events={timeline} />
                            </SectionCard>
                            <SectionCard title={label('SECTIONS.FEATURES')} description={label('FEATURES.DESCRIPTION')}>
                                <FeaturesUsed features={features ?? []} baseUrl={urls.featureUsage} />
                            </SectionCard>
                            <SectionCard title={label('SECTIONS.SUSPENSIONS')}>
                                {suspension.history.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">{label('EMPTY.SUSPENSIONS')}</p>
                                ) : (
                                    <ActivityTimelineFromSuspensions history={suspension.history} categoryLabel={categoryLabel} />
                                )}
                            </SectionCard>
                        </TabsContent>

                        <TabsContent value="stickers">
                            <SectionCard
                                title={label('SECTIONS.STICKERS')}
                                description={label('STICKERS.DESCRIPTION')}
                                action={
                                    <Link href={urls.stickers} className={buttonVariants()}>
                                        <StickerIcon />
                                        {label('STICKERS.MANAGE')}
                                    </Link>
                                }
                            >
                                <p className="text-lg font-semibold">
                                    {label('STICKERS.SUMMARY', { packs: formatNumber(stickers.packs), stickers: formatNumber(stickers.stickers) })}
                                </p>
                            </SectionCard>
                            <AccountStickerLibrary accountId={account.id} className="mt-6" />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <LockDialog
                account={account}
                suspension={suspension}
                url={urls.suspend}
                open={dialog === 'lock'}
                onOpenChange={open => setDialog(open ? 'lock' : null)}
            />
            <ConfirmDialog
                open={dialog === 'unlock'}
                onOpenChange={open => setDialog(open ? 'unlock' : null)}
                title={label('UNLOCK.TITLE', { name: account.name })}
                description={label('UNLOCK.DESCRIPTION')}
                cancelLabel={t('ADMIN_OPERATIONS.COMMON.CANCEL')}
                confirmLabel={label('UNLOCK.CONFIRM')}
                confirmVariant="default"
                pending={pending}
                onConfirm={unlock}
            />
            <ImpersonateDialog
                users={users}
                csrf={csrf}
                open={dialog === 'impersonate'}
                onOpenChange={open => setDialog(open ? 'impersonate' : null)}
            />
        </>
    );
}

function ActivityTimelineFromSuspensions({
    history,
    categoryLabel,
}: {
    history: AccountOverviewProps['suspension']['history'];
    categoryLabel: (value?: string) => string;
}) {
    return (
        <ActivityTimeline
            activityLog={[...history].reverse().map((entry, index) => ({
                id: `${entry.suspended_at}-${index}`,
                description: categoryLabel(entry.category),
                detail: entry.reason,
                timestamp: formatDate(entry.suspended_at ?? null),
                timestampTitle: formatDateTime(entry.suspended_at ?? null),
            }))}
        />
    );
}
