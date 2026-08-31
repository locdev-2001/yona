import type { ReactNode } from 'react';

// Port từ dashboard/routes/dashboard/settings/SettingsWrapper.vue
// (router-view/keep-alive là chi tiết Vue router — children thay thế).
export default function SettingsWrapper({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col w-full h-full m-0 pb-8 pt-4 px-6 overflow-auto bg-n-surface-1">
            <div className="flex items-start w-full max-w-5xl mx-auto">{children}</div>
        </div>
    );
}
