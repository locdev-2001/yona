import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@admin/views/pages/page-header';
import ListCard from '@admin/views/datatables/list';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { measurement, qualityKind, qualityLabel } from './CallQuality';
import { t } from '../../i18n';
import { formatDateTime } from './operationsFormat';

type CallEvent = { id: number; user_id: number; event_name: string; observed_at: string; elapsed_ms: number | null; attributes: string };
type CallSample = { id: number; user_id: number; observed_at: string; streams: string; environment: string; performance: string };
type Props = {
    call: { id: number; kind: string; status: string; started_at: string | null; answered_at: string | null; ended_at: string | null };
    events: CallEvent[];
    samples: CallSample[];
    backUrl: string;
};
const STATUS_LABELS: Record<string, string> = {
    ringing: 'CALLS.DIRECT.RINGING',
    active: 'CALLS.LOG.STATE_LIVE',
    ended: 'CALLS.LOG.STATE_ENDED',
    missed: 'CALLS.LOG.STATE_MISSED',
    declined: 'CALLS.LOG.STATE_DECLINED',
    cancelled: 'CALLS.LOG.STATE_CANCELLED',
};
const eventColumns: ColumnDef<CallEvent>[] = [
    { accessorKey: 'observed_at', header: () => qualityLabel('TIME'), cell: ({ row }) => formatDateTime(row.original.observed_at) },
    { accessorKey: 'user_id', header: () => qualityLabel('USER_ID') },
    { accessorKey: 'event_name', header: () => qualityLabel('EVENT') },
    { id: 'elapsed', header: () => qualityLabel('ELAPSED'), cell: ({ row }) => measurement(row.original.elapsed_ms, ' ms') },
];

export default function CallQualityTimeline({ call, events, samples, backUrl }: Props) {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={`${qualityLabel('CALL')} ${call.id}`}
                description={`${qualityKind(call.kind)} / ${STATUS_LABELS[call.status] ? t(STATUS_LABELS[call.status]) : call.status}`}
                eyebrow={
                    <Link href={backUrl} className="inline-flex min-h-11 items-center text-primary-700">
                        {qualityLabel('BACK')}
                    </Link>
                }
            />
            <dl className="grid gap-3 sm:grid-cols-3">
                {[
                    [qualityLabel('STARTED_AT'), call.started_at],
                    [qualityLabel('ANSWERED_AT'), call.answered_at],
                    [qualityLabel('ENDED_AT'), call.ended_at],
                ].map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="text-sm">{formatDateTime(value)}</dd>
                    </div>
                ))}
            </dl>
            <section className="flex flex-col gap-3">
                <h2 className="text-base font-medium">{qualityLabel('EVENTS')}</h2>
                <ListCard
                    table={
                        <ListTable
                            data={events}
                            columns={eventColumns}
                            getRowId={(row) => String(row.id)}
                            empty={<p className="p-4">{qualityLabel('UNKNOWN')}</p>}
                        />
                    }
                />
            </section>
            <section className="flex flex-col gap-3">
                <h2 className="text-base font-medium">{qualityLabel('LATEST_SAMPLES')}</h2>
                {samples.map((sample) => (
                    <details key={sample.id} className="rounded-xl bg-white p-4 dark:bg-neutral-900">
                        <summary className="min-h-11 cursor-pointer text-sm">
                            {formatDateTime(sample.observed_at)} · {qualityLabel('USER_ID')} {sample.user_id}
                        </summary>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
                            {JSON.stringify(
                                {
                                    environment: JSON.parse(sample.environment),
                                    streams: JSON.parse(sample.streams),
                                    performance: JSON.parse(sample.performance),
                                },
                                null,
                                2,
                            )}
                        </pre>
                    </details>
                ))}
            </section>
        </div>
    );
}
