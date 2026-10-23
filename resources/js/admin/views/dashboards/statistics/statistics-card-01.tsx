import type { ReactNode } from 'react';
import { MetricCard, type MetricPurpose, type Tone as DesignTone } from '../../../../superadmin/design-preview/components';
import type { Tone } from '@admin/views/dashboards/tones';
import '../../../../superadmin/dashboard/design.css';
export type StatisticsCardProps = {
    icon: ReactNode; value: string; title: string; tone?: Tone; changePercentage?: string | null;
    trend?: 'up' | 'down' | 'flat'; comparisonText?: string; note?: ReactNode; className?: string;
};
const metricPresentation: Record<Tone, { purpose: MetricPurpose; tone: DesignTone }> = {
    primary: { purpose: 'connections', tone: 'brand' },
    navy: { purpose: 'connections', tone: 'system' },
    cyan: { purpose: 'connections', tone: 'system' },
    success: { purpose: 'users', tone: 'positive' },
    warning: { purpose: 'messages', tone: 'warning' },
    danger: { purpose: 'messages', tone: 'danger' },
    neutral: { purpose: 'delivery', tone: 'system' },
};
export default function StatisticsCard({ icon, value, title, tone = 'neutral', changePercentage, trend = 'flat', comparisonText, note, className }: StatisticsCardProps) {
    return <MetricCard label={title} value={value} icon={icon} {...metricPresentation[tone]} change={changePercentage ?? ''} trend={trend} comparison={changePercentage ? comparisonText ?? '' : note ?? ''} className={className} />;
}
