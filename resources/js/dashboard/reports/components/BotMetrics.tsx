import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { getBotMetrics } from '../api';
import ReportMetricCard from './ReportMetricCard';

// Port từ reports/components/BotMetrics.vue
interface BotMetricsProps {
    filters: { from: number; to: number };
}

const formatToPercent = (value: string) => (value ? `${value}%` : '--');

export default function BotMetrics({ filters }: BotMetricsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [metrics, setMetrics] = useState({
        conversationCount: '0',
        messageCount: '0',
        resolutionRate: '0',
        handoffRate: '0',
    });

    const { from, to } = filters;
    useEffect(() => {
        if (!from || !to) return;

        void getBotMetrics(accountId, { from, to }).then(response =>
            setMetrics({
                conversationCount: response.conversation_count.toLocaleString(),
                messageCount: response.message_count.toLocaleString(),
                resolutionRate: response.resolution_rate.toString(),
                handoffRate: response.handoff_rate.toString(),
            }),
        );
    }, [accountId, from, to]);

    return (
        <div className="flex flex-wrap mx-0 panel-surface rounded-xl px-6 py-5">
            <ReportMetricCard
                label={t('BOT_REPORTS.METRIC.TOTAL_CONVERSATIONS.LABEL')}
                infoText={t('BOT_REPORTS.METRIC.TOTAL_CONVERSATIONS.TOOLTIP')}
                value={metrics.conversationCount}
                className="flex-1"
            />
            <ReportMetricCard
                label={t('BOT_REPORTS.METRIC.TOTAL_RESPONSES.LABEL')}
                infoText={t('BOT_REPORTS.METRIC.TOTAL_RESPONSES.TOOLTIP')}
                value={metrics.messageCount}
                className="flex-1"
            />
            <ReportMetricCard
                label={t('BOT_REPORTS.METRIC.RESOLUTION_RATE.LABEL')}
                infoText={t('BOT_REPORTS.METRIC.RESOLUTION_RATE.TOOLTIP')}
                value={formatToPercent(metrics.resolutionRate)}
                className="flex-1"
            />
            <ReportMetricCard
                label={t('BOT_REPORTS.METRIC.HANDOFF_RATE.LABEL')}
                infoText={t('BOT_REPORTS.METRIC.HANDOFF_RATE.TOOLTIP')}
                value={formatToPercent(metrics.handoffRate)}
                className="flex-1"
            />
        </div>
    );
}
