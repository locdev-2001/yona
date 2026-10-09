import type { ReactNode } from 'react';

// Port từ dashboard/components-next/table/BaseTable.vue — slot `header-{index}`
// thành mảng ReactNode `headerCells`, slot `row` thành `children`.
interface BaseTableProps {
    headers?: ReactNode[];
    hasItems: boolean;
    noDataMessage?: string;
    loading?: boolean;
    children: ReactNode;
}

export default function BaseTable({
    headers = [],
    hasItems,
    noDataMessage = '',
    loading = false,
    children,
}: BaseTableProps) {
    const showHeaders = headers.length > 0 && hasItems;

    return (
        <div className="w-full">
            <table className="min-w-full table-auto divide-y divide-n-weak">
                {showHeaders ? (
                    <thead>
                        <tr>
                            {headers.map((header, index) => (
                                <th
                                    key={index}
                                    className="py-4 ltr:pr-4 rtl:pl-4 text-start text-heading-3 text-n-slate-12 capitalize"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                ) : null}
                <tbody className="divide-y divide-n-weak text-n-slate-11">
                    {hasItems ? (
                        children
                    ) : noDataMessage && !loading ? (
                        <tr>
                            <td
                                colSpan={headers.length || 1}
                                className="py-20 text-center text-body-main !text-base text-n-slate-11"
                            >
                                {noDataMessage}
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}
