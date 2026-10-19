import type { ReactNode } from 'react';

// Port từ dashboard/components-next/table/BaseTableCell.vue
const ALIGN_CLASSES = {
    start: 'text-start',
    center: 'text-center',
    end: 'text-end',
} as const;

interface BaseTableCellProps {
    align?: keyof typeof ALIGN_CLASSES;
    className?: string;
    children: ReactNode;
}

export default function BaseTableCell({ align = 'start', className = '', children }: BaseTableCellProps) {
    return <td className={`py-3 px-3 text-body-main ${ALIGN_CLASSES[align]} ${className}`}>{children}</td>;
}
