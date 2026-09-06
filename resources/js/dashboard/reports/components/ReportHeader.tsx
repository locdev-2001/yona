import type { ReactNode } from 'react';

import BackButton from 'dashboard/components/widgets/BackButton';

// Port từ reports/components/ReportHeader.vue
interface ReportHeaderProps {
    headerTitle: string;
    headerDescription?: string;
    hasBackButton?: boolean;
    children?: ReactNode;
}

export default function ReportHeader({
    headerTitle,
    headerDescription = '',
    hasBackButton = false,
    children,
}: ReportHeaderProps) {
    return (
        <section className="flex flex-col gap-1 pt-6 pb-5">
            {hasBackButton && (
                <div>
                    <BackButton compact />
                </div>
            )}
            <div className="flex justify-between w-full gap-5">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-3 items-start">
                        <span className="text-heading-1 text-n-slate-12 min-h-10 flex items-center">{headerTitle}</span>
                        {headerDescription && (
                            <p className="text-n-slate-11 mb-0 line-clamp-5 sm:line-clamp-none text-body-main">
                                {headerDescription}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0">{children}</div>
            </div>
        </section>
    );
}
