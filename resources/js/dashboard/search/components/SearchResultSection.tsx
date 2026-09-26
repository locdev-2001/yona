import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import LoadingState from 'dashboard/components/widgets/LoadingState';

// Port từ dashboard/modules/search/components/SearchResultSection.vue.
interface SearchResultSectionProps {
    title: string;
    empty?: boolean;
    query?: string;
    showTitle?: boolean;
    isFetching?: boolean;
    className?: string;
    children?: ReactNode;
}

export default function SearchResultSection({
    title,
    empty = false,
    query = '',
    showTitle = true,
    isFetching = true,
    className = '',
    children,
}: SearchResultSectionProps) {
    return (
        <section className={`mx-0 mb-3 ${className}`.trim()}>
            {showTitle ? (
                <div className="sticky top-0 pt-2 py-3 z-20 bg-gradient-to-b from-n-surface-1 from-80% to-transparent mb-3 -mx-1.5 px-1.5">
                    <h3 className="text-sm text-n-slate-11">{title}</h3>
                </div>
            ) : null}
            {children}
            {isFetching ? (
                <LoadingState message={empty ? t('SEARCH.SEARCHING_DATA') : t('SEARCH.LOADING_DATA')} />
            ) : null}
            {empty && !isFetching ? (
                <div className="flex items-start justify-center px-4 py-6 rounded-xl bg-n-slate-2">
                    <Icon icon="i-lucide-info" className="text-n-slate-11 size-4 flex-shrink-0 mt-[3px]" />
                    <p className="mx-2 my-0 text-center text-n-slate-11">
                        {t('SEARCH.EMPTY_STATE', { item: title.toLowerCase(), query })}
                    </p>
                </div>
            ) : null}
        </section>
    );
}
