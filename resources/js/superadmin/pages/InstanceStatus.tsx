import { ActivityIcon } from '@admin/components/icons';

import { Panel } from '../design-preview/components';
import { t } from '../../i18n';
import StatusBadge from '@admin/views/datatables/status-badge';
import type { StatusTone } from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { useConsoleLabels } from '../labels';

const metricKeys: Record<string, string> = {
    'Yona version': 'VERSION', 'Postgres alive': 'POSTGRES', 'Database Migrations': 'MIGRATIONS',
    'Redis alive': 'REDIS', 'Redis version': 'REDIS_VERSION', 'Redis number of connected clients': 'REDIS_CLIENTS',
    'Redis memory used': 'REDIS_MEMORY', 'Redis memory peak': 'REDIS_PEAK', "Redis 'maxmemory' setting": 'REDIS_MAX_MEMORY',
    "Redis 'maxmemory_policy' setting": 'REDIS_POLICY',
};
const statusTones: Record<string, StatusTone> = { true: 'success', false: 'danger', completed: 'success', pending: 'warning' };

export default function InstanceStatus({ metrics }: { metrics: Record<string, string | null> }) {
    const label = useConsoleLabels();

    return <div className="console-resource-page">
        <PageHeader title={label('instance_status_title')} description={label('instance_status_description')} />
        <Panel title={label('instance_status_title')} action={<ActivityIcon />} className="console-section-panel">
            <dl className="console-definition-list">{Object.entries(metrics).map(([name, value]) => <div key={name}>
                <dt>{metricKeys[name] ? t(`ADMIN_INSTANCE_STATUS.METRICS.${metricKeys[name]}`) : name}</dt>
                <dd>{value !== null && statusTones[value] ? <StatusBadge tone={statusTones[value]}>{t(`ADMIN_INSTANCE_STATUS.STATUS.${value}`)}</StatusBadge> : value ?? '-'}</dd>
            </div>)}</dl>
        </Panel>
    </div>;
}
