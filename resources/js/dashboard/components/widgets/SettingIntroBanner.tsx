import type { ReactNode } from 'react';

// Port từ dashboard/components/widgets/SettingIntroBanner.vue @ v4.17.1.
interface SettingIntroBannerProps {
    headerTitle?: string;
    headerContent?: string;
    children?: ReactNode;
}

export default function SettingIntroBanner({
    headerTitle = '',
    headerContent = '',
    children,
}: SettingIntroBannerProps) {
    return (
        <div>
            <div className="max-w-7xl w-full mx-auto pt-4 pb-0 px-6">
                <h2 className="text-2xl text-n-slate-12 mb-1 font-medium">{headerTitle}</h2>
                {headerContent ? <p className="w-full text-n-slate-11 text-sm mb-2">{headerContent}</p> : null}
                {children}
            </div>
        </div>
    );
}
