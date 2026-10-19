import type { ReactNode } from 'react';

import Loader from 'shared/components/loader/Loader';
import { t } from '../../../../i18n';

// Port từ reports/components/overview/MetricCard.vue
interface MetricCardProps {
    header?: string;
    isLoading?: boolean;
    loadingMessage?: string;
    control?: ReactNode;
    children?: ReactNode;
}

export default function MetricCard({
    header = '',
    isLoading = false,
    loadingMessage = '',
    control,
    children,
}: MetricCardProps) {
    return (
        <div className="flex flex-col m-0.5 px-6 py-5 rounded-xl flex-grow text-n-slate-12 panel-surface min-h-[10rem]">
            <div className="card-header grid w-full mb-6 grid-cols-[repeat(auto-fit,minmax(max-content,50%))] gap-y-2">
                <div className="flex items-center gap-2 flex-row">
                    <h5 className="mb-0 text-n-slate-12 font-medium text-lg">{header}</h5>
                    <span className="flex flex-row items-center py-0.5 px-2 rounded bg-n-teal-3 text-xs">
                        <span className="bg-n-teal-9 h-1 w-1 rounded-full mr-1 rtl:mr-0 rtl:ml-0" />
                        <span className="text-xs text-n-teal-11">{t('OVERVIEW_REPORTS.LIVE')}</span>
                    </span>
                </div>
                <div className="flex flex-row items-center justify-end gap-2">{control}</div>
            </div>
            {!isLoading ? (
                <div className="card-body max-w-full w-full ml-auto mr-auto justify-between flex">{children}</div>
            ) : (
                <div className="items-center flex text-base justify-center px-12 py-6">
                    <Loader size={16} />
                    <span className="text-n-slate-11">{loadingMessage}</span>
                </div>
            )}
        </div>
    );
}
