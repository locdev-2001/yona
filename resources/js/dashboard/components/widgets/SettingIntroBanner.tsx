import type { ReactNode } from 'react';

// Port từ dashboard/components/widgets/SettingIntroBanner.vue
interface SettingIntroBannerProps {
    headerTitle?: string;
    headerIdentifier?: string;
    headerContent?: string;
    children?: ReactNode;
}

export default function SettingIntroBanner({
    headerTitle = '',
    headerIdentifier = '',
    headerContent = '',
    children,
}: SettingIntroBannerProps) {
    return (
        <div className="border-b border-solid border-n-weak/60">
            <div className="max-w-7xl w-full mx-auto pt-4 pb-0 px-6">
                <h2 className="text-2xl text-n-slate-12 mb-1 font-medium min-w-0">
                    <span title={headerTitle} className="block truncate">
                        {headerTitle}
                    </span>
                </h2>
                {headerIdentifier ? (
                    <p title={headerIdentifier} className="w-full truncate text-n-slate-9 text-sm mb-2">
                        <bdi dir="auto">{headerIdentifier}</bdi>
                    </p>
                ) : null}
                {headerContent ? <p className="w-full text-n-slate-11 text-sm mb-2">{headerContent}</p> : null}
                {children}
            </div>
        </div>
    );
}
