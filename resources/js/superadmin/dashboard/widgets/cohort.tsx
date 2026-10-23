import { CohortMatrix } from '../../design-preview/cohort-matrix';
import { t } from '../../../i18n';
import { formatDay, formatNumber, formatPercent } from '../format';
import type { CohortRetentionData } from '../types';

export function CohortRetention({ data, title }: { data: CohortRetentionData; title: string }) {
    return <CohortMatrix weekLabel={t('ADMIN_DASHBOARD.COHORT.WEEK')} futureLabel={t('ADMIN_DASHBOARD.COHORT.FUTURE')} label={title} weeks={Array.from({length: data.weeks}, (_, offset) => t('ADMIN_DASHBOARD.COHORT.OFFSET_WEEK', {offset}))} rows={data.cohorts.map(cohort => ({
        id: cohort.week,
        week: formatDay(cohort.week),
        members: `${t('ADMIN_DASHBOARD.COHORT.SIZE')}: ${formatNumber(cohort.size)}`,
        retention: Array.from({length: data.weeks}, (_, offset) => {
            const cell = cohort.retention.find(retention => retention.offset === offset);
            return cell ? {percent: cell.rate, label: cell.rate === null ? '—' : `${formatPercent(cell.rate)}%`, description: t('ADMIN_DASHBOARD.COHORT.CELL', {week: formatDay(cohort.week), offset, active: cell.active, size: cohort.size, rate: formatPercent(cell.rate)})} : null;
        }),
    }))} />;
}
