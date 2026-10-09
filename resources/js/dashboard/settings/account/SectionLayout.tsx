import type { ReactNode } from 'react';

import { t } from '../../../i18n';

// Port từ dashboard/routes/dashboard/settings/account/components/SectionLayout.vue
interface SectionLayoutProps {
    title?: ReactNode;
    description?: ReactNode;
    hideContent?: boolean;
    beta?: boolean;
    headerActions?: ReactNode;
    className?: string;
    children: ReactNode;
}

export default function SectionLayout({
    title = '',
    description = '',
    hideContent = false,
    beta = false,
    headerActions,
    className = '',
    children,
}: SectionLayoutProps) {
    return (
        <section
            className={[
                'grid grid-cols-1 pt-8 gap-5 [interpolate-size:allow-keywords]',
                !hideContent ? 'pb-8' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <header className="grid grid-cols-4">
                {title || beta || description ? (
                    <div className="col-span-3">
                        {title || beta ? (
                            <h4 className="text-heading-2 text-n-slate-12 flex items-center gap-2">
                                {title}
                                {beta ? (
                                    <div
                                        title={t('GENERAL.BETA_DESCRIPTION')}
                                        className="text-xs uppercase text-n-iris-11 bg-n-iris-3 leading-none rounded-lg px-1.5 py-1"
                                    >
                                        {t('GENERAL.BETA')}
                                    </div>
                                ) : null}
                            </h4>
                        ) : null}
                        {description ? (
                            <p className="text-n-slate-11 text-body-main mt-2">{description}</p>
                        ) : null}
                    </div>
                ) : null}
                <div className="col-span-1">{headerActions}</div>
            </header>
            <div
                className={`transition-[height] duration-300 ease-in-out text-n-slate-12 ${
                    hideContent ? 'overflow-hidden h-0' : 'h-auto'
                }`}
            >
                {children}
            </div>
        </section>
    );
}
