import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

import type { AssociationValue, HasManyValue, HasOneValue, SuperAdminField } from '../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { useConsoleDictionary, useConsoleLabels } from '../ui/labels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

// Máy chủ gửi thời điểm dạng `Mon, 31 Aug 2026 06:58:21 +0000` (UTC); hiện theo
// giờ máy người xem, chuỗi lạ thì giữ nguyên.
export function formatDateTime(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    const date = new Date(String(value));

    return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
}

// Mỗi kiểu field vẽ đúng một kiểu; `nested` là ô trong bảng (gọn một dòng).
export default function FieldValue({ field, nested = false }: { field: SuperAdminField; nested?: boolean }) {
    switch (field.type) {
        case 'string':
            return nested ? (
                <span className="line-clamp-2 break-words">{String(field.value ?? '')}</span>
            ) : (
                <div className="whitespace-pre-wrap break-words">{String(field.value ?? '')}</div>
            );
        case 'date_time':
        case 'confirmed_at_field':
            return <span className="whitespace-nowrap tabular-nums">{formatDateTime(field.value)}</span>;
        case 'number':
        case 'count_field':
            return <span className="tabular-nums">{field.value === null || field.value === undefined ? '' : String(field.value)}</span>;
        case 'account_status_field':
            return <AccountStatus value={String(field.value ?? '')} />;
        case 'avatar_field':
            return field.value ? <img src={String(field.value)} alt="" className="size-8 rounded-full object-cover" /> : null;
        case 'secret_field':
            return <SecretField token={String(field.value ?? '')} />;
        case 'serialized_field':
            return (
                <code className="break-all rounded bg-console-muted px-1.5 py-0.5 font-mono text-xs">
                    {typeof field.value === 'string' ? field.value : JSON.stringify(field.value)}
                </code>
            );
        case 'has_one':
            return <HasOne value={field.value as HasOneValue} />;
        case 'has_many':
            return <HasMany value={field.value as HasManyValue} />;
        case 'belongs_to':
        case 'belongs_to_search':
        case 'polymorphic':
            return <Association value={field.value as AssociationValue} />;
        case 'suspension_history_field':
            return <SuspensionHistory value={field.value as SuspensionEvent[]} />;
        default:
            return <>{field.value === null || field.value === undefined ? '' : String(field.value)}</>;
    }
}

function AccountStatus({ value }: { value: string }) {
    const { filter } = useConsoleDictionary();

    return <Badge variant={value === 'suspended' ? 'destructive' : 'success'}>{filter(value)}</Badge>;
}

type SuspensionEvent = { category?: string; reason?: string; suspended_at?: string };

function SuspensionHistory({ value }: { value: SuspensionEvent[] }) {
    const label = useConsoleLabels();

    if (!value || value.length === 0) {
        return <p className="text-sm text-console-muted-foreground">{label('no_suspension_history')}</p>;
    }

    return (
        <ul className="flex flex-col gap-1.5 text-sm">
            {value.map(event => (
                <li key={`${event.suspended_at}-${event.category}`} className="flex flex-wrap items-center gap-x-2">
                    <Badge variant="outline">{event.category}</Badge>
                    <span>{event.reason}</span>
                    {event.suspended_at ? (
                        <span className="text-xs text-console-muted-foreground">{formatDateTime(event.suspended_at)}</span>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}

function Association({ value }: { value: AssociationValue }) {
    if (!value) return null;

    return value.url ? (
        <Link href={value.url} className="font-medium text-console-brand hover:underline">
            {value.label}
        </Link>
    ) : (
        <>{value.label}</>
    );
}

function HasOne({ value }: { value: HasOneValue }) {
    const { attribute } = useConsoleDictionary();

    if (!value) return null;

    return (
        <div className="rounded-lg border border-console-border p-3">
            <p className="mb-2 text-sm font-medium">
                {value.url ? (
                    <Link href={value.url} className="text-console-brand hover:underline">
                        {value.label}
                    </Link>
                ) : (
                    value.label
                )}
            </p>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,auto)_1fr]">
                {value.fields.map(field => (
                    <div key={field.name} className="contents">
                        <dt className="text-xs text-console-muted-foreground sm:pt-0.5">{attribute(field.name, field.label)}</dt>
                        <dd className="min-w-0 text-sm">
                            <FieldValue field={field} nested />
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function HasMany({ value }: { value: HasManyValue }) {
    const label = useConsoleLabels();
    const { attribute } = useConsoleDictionary();
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    if (!value || value.rows.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-lg border border-console-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {value.columns.map(column => (
                            <TableHead key={column.name} scope="col">
                                {attribute(column.name, column.label)}
                            </TableHead>
                        ))}
                        <TableHead scope="col">
                            <span className="sr-only">{label('actions')}</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {value.rows.map(row => (
                        <TableRow key={row.url ?? row.cells.map(cell => String(cell.value)).join('-')}>
                            {row.cells.map(cell => (
                                <TableCell key={cell.name}>
                                    {row.url && !['belongs_to', 'belongs_to_search', 'polymorphic'].includes(cell.type) ? (
                                        <Link href={row.url} className="hover:underline">
                                            <FieldValue field={cell} nested />
                                        </Link>
                                    ) : (
                                        <FieldValue field={cell} nested />
                                    )}
                                </TableCell>
                            ))}
                            <TableCell className="text-right">
                                {row.destroy_url ? (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={label('delete')}
                                        onClick={() => setPendingDelete(row.destroy_url ?? null)}
                                    >
                                        <Icon name="i-lucide-trash-2" className="text-console-destructive-foreground" />
                                    </Button>
                                ) : null}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={open => {
                    if (!open) setPendingDelete(null);
                }}
                title={label('delete_confirm_title')}
                description={label('delete_confirm_description')}
                confirmLabel={label('delete')}
                onConfirm={() => {
                    if (pendingDelete) router.delete(pendingDelete, { preserveScroll: true });
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}

function SecretField({ token }: { token: string }) {
    const label = useConsoleLabels();
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    return (
        <div className="flex min-w-0 items-center gap-1">
            <code className="min-w-0 truncate font-mono text-xs" data-secret-masked={!revealed}>
                {revealed ? token : '••••••••••••'}
            </code>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label(revealed ? 'hide_secret' : 'show_secret')}
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    setRevealed(current => !current);
                }}
            >
                <Icon name={revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'} />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={label(copied ? 'copied' : 'copy')}
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    void navigator.clipboard?.writeText(token).then(() => setCopied(true));
                }}
            >
                <Icon name={copied ? 'i-lucide-check' : 'i-lucide-copy'} />
            </Button>
        </div>
    );
}
