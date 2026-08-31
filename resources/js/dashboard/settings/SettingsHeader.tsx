import type { ReactNode } from 'react';

import BackButton from 'dashboard/components/widgets/BackButton';

// Port từ dashboard/routes/dashboard/settings/SettingsHeader.vue
interface SettingsHeaderProps {
    headerTitle?: string;
    showBackButton?: boolean;
    backUrl?: string;
    backButtonLabel?: string;
    children?: ReactNode;
}

export default function SettingsHeader({
    headerTitle = '',
    showBackButton = false,
    backUrl = '',
    backButtonLabel = '',
    children,
}: SettingsHeaderProps) {
    return (
        <div className="flex justify-between items-center h-20 min-h-[3.5rem] px-6 py-2 bg-n-surface-1 z-20 max-w-7xl w-full mx-auto">
            <h1 className="flex items-center mb-0 text-2xl text-n-slate-12">
                {showBackButton ? (
                    <BackButton
                        buttonLabel={backButtonLabel}
                        backUrl={backUrl}
                        className="ltr:mr-4 rtl:ml-4"
                    />
                ) : null}
                {children}
                <span className="text-xl font-medium text-n-slate-12">{headerTitle}</span>
            </h1>
        </div>
    );
}
