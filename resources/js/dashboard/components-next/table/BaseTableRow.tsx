import type { ReactNode } from 'react';

// Port từ dashboard/components-next/table/BaseTableRow.vue
export default function BaseTableRow({ children }: { children: ReactNode }) {
    return (
        <tr className="transition-colors duration-150 hover:bg-n-surface-hover [&>td:first-child]:rounded-s-xl [&>td:last-child]:rounded-e-xl">
            {children}
        </tr>
    );
}
