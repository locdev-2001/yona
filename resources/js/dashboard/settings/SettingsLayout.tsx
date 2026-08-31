import type { ReactNode } from 'react';

import LoadingState from 'dashboard/components/widgets/LoadingState';

// Port từ dashboard/routes/dashboard/settings/SettingsLayout.vue
interface SettingsLayoutProps {
    header: ReactNode;
    body: ReactNode;
    isLoading?: boolean;
    noRecordsFound?: boolean;
    loadingMessage?: string;
    noRecordsMessage?: string;
    children?: ReactNode;
}

export default function SettingsLayout({
    header,
    body,
    isLoading = false,
    noRecordsFound = false,
    loadingMessage = '',
    noRecordsMessage = '',
    children,
}: SettingsLayoutProps) {
    return (
        <div className="flex flex-col w-full h-full gap-4 font-inter">
            {header}
            <main>
                {isLoading ? (
                    <LoadingState message={loadingMessage} />
                ) : noRecordsFound ? (
                    <p className="flex-1 py-20 text-n-slate-12 flex items-center justify-center text-base">
                        {noRecordsMessage}
                    </p>
                ) : (
                    body
                )}
                {children}
            </main>
        </div>
    );
}
