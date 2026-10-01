import { ActivityIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@admin/components/ui/card';
import StatusBadge from '@admin/views/datatables/status-badge';
import type { StatusTone } from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { useConsoleLabels } from '../labels';

const METRIC_LABELS: Record<string, string> = {
    'Yona version': 'Phiên bản Yona',
    'Postgres alive': 'Postgres hoạt động',
    'Database Migrations': 'Migration cơ sở dữ liệu',
    'Redis alive': 'Redis hoạt động',
    'Redis version': 'Phiên bản Redis',
    'Redis number of connected clients': 'Số kết nối Redis',
    'Redis memory used': 'Bộ nhớ Redis đang dùng',
    'Redis memory peak': 'Bộ nhớ Redis cao nhất',
    "Redis 'maxmemory' setting": "Redis 'maxmemory'",
    "Redis 'maxmemory_policy' setting": "Redis 'maxmemory_policy'",
};

const STATUS_VALUES: Record<string, { text: string; tone: StatusTone }> = {
    true: { text: 'Hoạt động', tone: 'success' },
    false: { text: 'Mất kết nối', tone: 'danger' },
    completed: { text: 'Đã chạy hết', tone: 'success' },
    pending: { text: 'Còn migration chưa chạy', tone: 'warning' },
};

export default function InstanceStatus({ metrics }: { metrics: Record<string, string | null> }) {
    const label = useConsoleLabels();

    return (
        <div>
            <PageHeader className="lg:mb-10" title={label('instance_status_title')} description={label('instance_status_description')} />

            <Card className="max-w-3xl gap-0 py-0">
                <CardHeader className="flex items-center gap-2 border-b px-6 py-4!">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-sm">
                        <ActivityIcon className="size-4" />
                    </div>
                    <CardTitle className="text-base">{label('instance_status_title')}</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <dl className="divide-y">
                        {Object.entries(metrics).map(([name, value]) => {
                            const status = value === null ? undefined : STATUS_VALUES[value];

                            return (
                                <div key={name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-4">
                                    <dt className="text-muted-foreground text-sm">{METRIC_LABELS[name] ?? name}</dt>
                                    <dd className="text-sm font-medium tabular-nums">
                                        {status ? <StatusBadge tone={status.tone}>{status.text}</StatusBadge> : (value ?? '—')}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
}
