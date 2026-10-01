import { t } from '../../../i18n';
import { formatDay, formatNumber, formatPercent } from '../format';
import type { CohortRetentionData } from '../types';

// Màu ô theo tỉ lệ (0–100%) bằng độ đậm của màu thương hiệu; số vẫn in trong ô.
function cellStyle(rate: number | null) {
    if (rate === null) return undefined;
    const alpha = 0.08 + (Math.min(rate, 100) / 100) * 0.82;

    return { backgroundColor: `rgb(var(--console-brand) / ${alpha.toFixed(2)})` };
}

export function CohortRetention({ data, title }: { data: CohortRetentionData; title: string }) {
    const offsets = Array.from({ length: data.weeks }, (_, index) => index);

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-separate border-spacing-0.5 text-xs tabular-nums">
                <caption className="sr-only">{title}</caption>
                <thead>
                    <tr className="text-console-muted-foreground">
                        <th scope="col" className="px-2 py-1 text-left font-medium">
                            {t('ADMIN_DASHBOARD.COHORT.WEEK')}
                        </th>
                        <th scope="col" className="px-2 py-1 text-right font-medium">
                            {t('ADMIN_DASHBOARD.COHORT.SIZE')}
                        </th>
                        {offsets.map(offset => (
                            <th scope="col" key={offset} className="px-1 py-1 text-center font-medium">
                                {t('ADMIN_DASHBOARD.COHORT.OFFSET', { n: offset })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.cohorts.map(cohort => (
                        <tr key={cohort.week}>
                            <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium">
                                {formatDay(cohort.week)}
                            </th>
                            <td className="px-2 py-1 text-right">{formatNumber(cohort.size)}</td>
                            {offsets.map(offset => {
                                const cell = cohort.retention[offset];
                                if (!cell) return <td key={offset} />;
                                const strong = (cell.rate ?? 0) >= 55;

                                return (
                                    <td
                                        key={offset}
                                        title={t('ADMIN_DASHBOARD.COHORT.CELL', {
                                            week: formatDay(cohort.week),
                                            offset,
                                            active: cell.active,
                                            size: cohort.size,
                                            rate: formatPercent(cell.rate),
                                        })}
                                        className={`rounded px-1 py-1.5 text-center ${strong ? 'text-white' : ''} ${cell.rate === null ? 'bg-console-muted text-console-muted-foreground' : ''}`}
                                        style={cellStyle(cell.rate)}
                                    >
                                        {cell.rate === null ? '—' : `${formatPercent(cell.rate)}%`}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
