import { Button } from '@admin/components/ui/button';

import { t } from '../../../i18n';
import { formatNumber, formatRelative } from '../../pages/operationsFormat';

export type AlertsData = {
    open: number;
    url: string;
    latest: {
        id: number;
        ruleKey: string;
        ruleTitle: string;
        value: number;
        threshold: number;
        openedAt: string | null;
        resolvedAt: string | null;
    } | null;
};

// Ô Cảnh báo của trang Tổng quan: số sự cố đang mở và sự cố gần nhất.
export function Alerts({ data }: { data: AlertsData }) {
    const latest = data.latest;

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">{t('ADMIN_ALERTS.WIDGET.OPEN')}</span>
                <span className={data.open > 0 ? 'font-num text-2xl font-medium text-destructive' : 'font-num text-2xl font-medium'}>
                    {formatNumber(data.open)}
                </span>
            </div>
            {latest ? (
                <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">{t('ADMIN_ALERTS.WIDGET.LATEST')}</span>
                    <span className="font-medium">{latest.ruleTitle}</span>
                    <span className="text-muted-foreground">
                        {formatRelative(latest.openedAt)}
                        {latest.resolvedAt ? ` · ${t('ADMIN_ALERTS.WIDGET.RESOLVED')}` : null}
                    </span>
                </div>
            ) : (
                <p className="text-muted-foreground">{t('ADMIN_ALERTS.WIDGET.NONE')}</p>
            )}
            <Button variant="link" size="sm" className="mt-auto self-start px-0" render={<a href={data.url} />} nativeButton={false}>
                {t('ADMIN_ALERTS.WIDGET.VIEW')}
            </Button>
        </div>
    );
}
