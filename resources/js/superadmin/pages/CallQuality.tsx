import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import PageHeader from '@admin/views/pages/page-header';
import ListCard from '@admin/views/datatables/list';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { t } from '../../i18n';
import { formatDateTime } from './operationsFormat';

export const qualityLabel = (key: string) => t(`CALLS.QUALITY.${key}`);
export const qualityKind = (kind: string) => {
    const key = `KIND_${kind.toUpperCase()}`;
    const label = qualityLabel(key);
    return label === `CALLS.QUALITY.${key}` ? kind : label;
};
export const measurement = (value: string | number | null | undefined, unit = '') =>
    value === null || value === undefined ? '…' : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;

type QualityGroup = {
    kind: string;
    browser: string;
    os: string;
    codec: string | null;
    source: string;
    direction: string;
    measurements: number;
    calls: number;
    fps_median: number | null;
    height_median: number | null;
    cpu_limited_pct: number | null;
    bandwidth_limited_pct: number | null;
    relay_pct: number | null;
    efficient_pct: number | null;
    processing_ms_median: number | null;
};
type RecentCall = { call_id: number; kind: string; last_at: string; samples: number };
type Props = {
    groups: QualityGroup[];
    connections: {
        attempts: number;
        connected: number;
        connect_p50_ms: number | null;
        connect_p95_ms: number | null;
        first_audio_p50_ms: number | null;
        first_audio_p95_ms: number | null;
    };
    recent: RecentCall[];
    days: number;
    kind: string | null;
    kinds: string[];
    baseUrl: string;
};

const columns: ColumnDef<QualityGroup>[] = [
    { accessorKey: 'kind', header: () => qualityLabel('CALL_TYPE'), cell: ({ row }) => qualityKind(row.original.kind) },
    { id: 'device', header: () => qualityLabel('ENVIRONMENT'), cell: ({ row }) => `${row.original.browser} / ${row.original.os}` },
    {
        id: 'stream',
        header: () => qualityLabel('STREAM'),
        cell: ({ row }) =>
            `${qualityLabel(`SOURCE_${row.original.source.toUpperCase()}`)} / ${qualityLabel(`DIRECTION_${row.original.direction.toUpperCase()}`)}`,
    },
    { accessorKey: 'codec', header: 'Codec' },
    { accessorKey: 'measurements', header: () => qualityLabel('MEASUREMENTS') },
    { id: 'fps', header: () => qualityLabel('FPS_MEDIAN'), cell: ({ row }) => measurement(row.original.fps_median) },
    { id: 'height', header: () => qualityLabel('HEIGHT_MEDIAN'), cell: ({ row }) => measurement(row.original.height_median, 'p') },
    { id: 'cpu', header: () => qualityLabel('CPU_LIMITED'), cell: ({ row }) => measurement(row.original.cpu_limited_pct, '%') },
    { id: 'bandwidth', header: () => qualityLabel('BANDWIDTH_LIMITED'), cell: ({ row }) => measurement(row.original.bandwidth_limited_pct, '%') },
    { id: 'relay', header: 'TURN', cell: ({ row }) => measurement(row.original.relay_pct, '%') },
    { id: 'efficient', header: () => qualityLabel('POWER_EFFICIENT'), cell: ({ row }) => measurement(row.original.efficient_pct, '%') },
    { id: 'processing', header: () => qualityLabel('FRAME_PROCESSING'), cell: ({ row }) => measurement(row.original.processing_ms_median, ' ms') },
];

export default function CallQuality({ groups, connections, recent, days, kind, kinds, baseUrl }: Props) {
    const [browser, setBrowser] = useState('');
    const [codec, setCodec] = useState('');
    const recentColumns: ColumnDef<RecentCall>[] = [
        {
            id: 'call',
            header: () => qualityLabel('CALL'),
            cell: ({ row }) => (
                <Link href={`${baseUrl}/${row.original.call_id}`} className="inline-flex min-h-11 items-center text-primary-700 hover:underline">
                    {qualityLabel('CALL')} {row.original.call_id}
                </Link>
            ),
        },
        { accessorKey: 'kind', header: () => qualityLabel('CALL_TYPE'), cell: ({ row }) => qualityKind(row.original.kind) },
        { accessorKey: 'last_at', header: () => qualityLabel('LAST_SAMPLE'), cell: ({ row }) => formatDateTime(row.original.last_at) },
        { accessorKey: 'samples', header: () => qualityLabel('MEASUREMENTS') },
    ];
    const filtered = groups.filter((group) => (!browser || group.browser === browser) && (!codec || group.codec === codec));
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={qualityLabel('TELEMETRY')} description={qualityLabel('TELEMETRY_DESCRIPTION')} />
            <form method="get" action={baseUrl} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                    {qualityLabel('DAYS')}
                    <select name="days" defaultValue={days} className="min-h-11 rounded-lg border px-3">
                        {[1, 7, 30, 90].map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    {qualityLabel('CALL_TYPE')}
                    <select name="kind" defaultValue={kind ?? ''} className="min-h-11 rounded-lg border px-3">
                        <option value="">{qualityLabel('ALL')}</option>
                        {kinds.map((value) => (
                            <option key={value} value={value}>
                                {qualityKind(value)}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="min-h-11 rounded-lg bg-primary-600 px-4 text-white" type="submit">
                    {qualityLabel('APPLY')}
                </button>
            </form>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                    [qualityLabel('ATTEMPTS'), connections.attempts],
                    [qualityLabel('CONNECTED'), connections.connected],
                    [qualityLabel('CONNECT_P50'), measurement(connections.connect_p50_ms, ' ms')],
                    [qualityLabel('CONNECT_P95'), measurement(connections.connect_p95_ms, ' ms')],
                    [qualityLabel('FIRST_AUDIO_P50'), measurement(connections.first_audio_p50_ms, ' ms')],
                    [qualityLabel('FIRST_AUDIO_P95'), measurement(connections.first_audio_p95_ms, ' ms')],
                ].map(([name, value]) => (
                    <div key={name} className="rounded-xl bg-white p-4 dark:bg-neutral-900">
                        <dt className="text-sm text-muted-foreground">{name}</dt>
                        <dd className="mt-2 text-xl tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
            <section className="flex flex-col gap-3">
                <h2 className="text-base font-medium">{qualityLabel('DEVICE_GROUPS')}</h2>
                <div className="flex flex-wrap gap-3">
                    <select
                        aria-label={qualityLabel('BROWSER')}
                        value={browser}
                        onChange={(event) => setBrowser(event.target.value)}
                        className="min-h-11 rounded-lg border px-3"
                    >
                        <option value="">{qualityLabel('ALL_BROWSERS')}</option>
                        {[...new Set(groups.map((group) => group.browser))].map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Codec"
                        value={codec}
                        onChange={(event) => setCodec(event.target.value)}
                        className="min-h-11 rounded-lg border px-3"
                    >
                        <option value="">{qualityLabel('ALL_CODECS')}</option>
                        {[...new Set(groups.flatMap((group) => (group.codec ? [group.codec] : [])))].map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                </div>
                <ListCard
                    table={
                        <ListTable
                            data={filtered}
                            columns={columns}
                            getRowId={(row) => [row.kind, row.browser, row.os, row.codec, row.source, row.direction].join(':')}
                            empty={<p className="p-4 text-sm text-muted-foreground">{qualityLabel('UNKNOWN')}</p>}
                        />
                    }
                />
            </section>
            <section className="flex flex-col gap-3">
                <h2 className="text-base font-medium">{qualityLabel('RECENT_CALLS')}</h2>
                <ListCard
                    table={
                        <ListTable
                            data={recent}
                            columns={recentColumns}
                            getRowId={(row) => String(row.call_id)}
                            empty={<p className="p-4 text-sm text-muted-foreground">{qualityLabel('UNKNOWN')}</p>}
                        />
                    }
                />
            </section>
        </div>
    );
}
