import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';

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

const STATUS_VALUES: Record<string, { text: string; variant: BadgeVariant }> = {
    true: { text: 'Hoạt động', variant: 'success' },
    false: { text: 'Mất kết nối', variant: 'destructive' },
    completed: { text: 'Đã chạy hết', variant: 'success' },
    pending: { text: 'Còn migration chưa chạy', variant: 'warning' },
};

export default function InstanceStatus({ metrics }: { metrics: Record<string, string | null> }) {
    const label = useConsoleLabels();

    return (
        <>
            <PageHeader title={label('instance_status_title')} description={label('instance_status_description')} />
            <Card className="max-w-3xl py-2">
                <CardContent className="px-0">
                    <dl className="divide-y divide-console-border">
                        {Object.entries(metrics).map(([name, value]) => {
                            const status = value === null ? undefined : STATUS_VALUES[value];

                            return (
                                <div key={name} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <dt className="text-sm text-console-muted-foreground">{METRIC_LABELS[name] ?? name}</dt>
                                    <dd className="text-sm font-medium tabular-nums">
                                        {status ? <Badge variant={status.variant}>{status.text}</Badge> : (value ?? '—')}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </CardContent>
            </Card>
        </>
    );
}
