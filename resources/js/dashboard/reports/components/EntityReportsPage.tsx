import { usePage } from '@inertiajs/react';

import Spinner from 'dashboard/components-next/spinner/Spinner';
import Dashboard from '../../Dashboard';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import type { EntityReportType } from '../api';
import { useReportEntities } from '../composables/useReportEntities';
import ReportsWrapper from './ReportsWrapper';
import WootReports from './WootReports';

// Gộp 4 trang `*Reports.vue` (bộ cũ) và 4 trang `*ReportsShow.vue`: chúng chỉ khác
// `type`, namespace i18n và việc có `id` trên URL hay không.

const NAMESPACES: Record<EntityReportType, string> = {
    agent: 'AGENT_REPORTS',
    inbox: 'INBOX_REPORTS',
    label: 'LABEL_REPORTS',
    team: 'TEAM_REPORTS',
};

interface EntityReportsPageProps {
    type: EntityReportType;
    id?: number;
    // AgentReports.vue (bộ cũ) trỏ nhãn nút tải về vào `REPORT.DOWNLOAD_AGENT_REPORTS`,
    // một key KHÔNG tồn tại — Chatwoot in nguyên key ra nút. Giữ nguyên để khớp oracle.
    downloadLabelKey?: string;
}

export default function EntityReportsPage({ type, id, downloadLabelKey }: EntityReportsPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const entities = useReportEntities(currentAccount.id, type);
    const namespace = NAMESPACES[type];

    const selectedItem = id ? (entities.find(entity => entity.id === Number(id)) ?? null) : null;

    if (id && !selectedItem) {
        return (
            <Dashboard>
                <ReportsWrapper>
                    <div className="w-full py-20">
                        <Spinner className="mx-auto" />
                    </div>
                </ReportsWrapper>
            </Dashboard>
        );
    }

    return (
        <WootReports
            type={type}
            entities={entities}
            selectedItem={selectedItem}
            hasBackButton={Boolean(id)}
            reportTitle={t(`${namespace}.HEADER`)}
            downloadButtonLabel={t(downloadLabelKey ?? `${namespace}.DOWNLOAD_${type.toUpperCase()}_REPORTS`)}
        />
    );
}
