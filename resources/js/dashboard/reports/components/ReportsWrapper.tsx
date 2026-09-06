import type { ReactNode } from 'react';

// Port từ reports/components/ReportsWrapper.vue — router-view thay bằng children.
export default function ReportsWrapper({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-auto bg-n-surface-1 w-full px-6">
            <div className="max-w-5xl mx-auto pb-12">{children}</div>
        </div>
    );
}
