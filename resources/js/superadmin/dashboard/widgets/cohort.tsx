import CohortTable from '@admin/views/dashboards/widgets/widget-cohort';

import { t } from '../../../i18n';
import { formatDay, formatNumber, formatPercent } from '../format';
import type { CohortRetentionData } from '../types';

export function CohortRetention({ data, title }: { data: CohortRetentionData; title: string }) {
    const offsets = Array.from({ length: data.weeks }, (_, index) => index);

    return (
        <CohortTable
            caption={title}
            weekLabel={t('ADMIN_DASHBOARD.COHORT.WEEK')}
            sizeLabel={t('ADMIN_DASHBOARD.COHORT.SIZE')}
            offsetLabels={offsets.map(offset => t('ADMIN_DASHBOARD.COHORT.OFFSET', { n: offset }))}
            rows={data.cohorts.map(cohort => ({
                key: cohort.week,
                week: formatDay(cohort.week),
                size: formatNumber(cohort.size),
                cells: offsets.map(offset => {
                    const cell = cohort.retention[offset];
                    if (!cell) return null;

                    return {
                        key: String(offset),
                        rate: cell.rate,
                        label: cell.rate === null ? '-' : `${formatPercent(cell.rate)}%`,
                        title: t('ADMIN_DASHBOARD.COHORT.CELL', {
                            week: formatDay(cohort.week),
                            offset,
                            active: cell.active,
                            size: cohort.size,
                            rate: formatPercent(cell.rate),
                        }),
                    };
                }),
            }))}
        />
    );
}
