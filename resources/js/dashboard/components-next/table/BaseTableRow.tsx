import type { ReactNode } from 'react';

// Port từ dashboard/components-next/table/BaseTableRow.vue
export default function BaseTableRow({ children }: { children: ReactNode }) {
    return <tr>{children}</tr>;
}
