import type { ReactNode } from 'react';

import SettingsHeader from './SettingsHeader';

// Port từ dashboard/routes/dashboard/settings/Wrapper.vue — router-view +
// keep-alive là chi tiết Vue router, children thay thế.
interface SettingsContentProps {
    headerTitle?: string;
    showBackButton?: boolean;
    backUrl?: string;
    children: ReactNode;
}

export default function SettingsContent({
    headerTitle = '',
    showBackButton = false,
    backUrl = '',
    children,
}: SettingsContentProps) {
    const showSettingsHeader = Boolean(headerTitle) || showBackButton;

    return (
        <div className="flex flex-col h-full m-0 bg-n-surface-1 w-full">
            {showSettingsHeader ? (
                <SettingsHeader
                    headerTitle={headerTitle}
                    showBackButton={showBackButton}
                    backUrl={backUrl}
                />
            ) : null}
            <div className="px-4 overflow-hidden">{children}</div>
        </div>
    );
}
