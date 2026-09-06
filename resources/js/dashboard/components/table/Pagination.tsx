import Button from 'dashboard/components-next/button/Button';
import FilterSelect from 'dashboard/components-next/filter/inputs/FilterSelect';
import { t } from '../../../i18n';
import type { TableModel } from './useTableModel';

// Port từ dashboard/components/table/Pagination.vue

interface PaginationProps<TRow> {
    table: TableModel<TRow>;
    showPageSizeSelector?: boolean;
    onPageSizeChange?: (pageSize: number) => void;
    className?: string;
}

const getFormattedPages = (start: number, end: number): string[] => {
    const formatter = new Intl.NumberFormat(navigator.language);
    return Array.from({ length: end - start + 1 }, (_, index) => formatter.format(start + index));
};

export default function Pagination<TRow>({
    table,
    showPageSizeSelector = false,
    onPageSizeChange,
    className = '',
}: PaginationProps<TRow>) {
    const pageSizeOptions = [10, 20, 50, 100].map(size => ({
        label: t('REPORT.PAGINATION.PER_PAGE_TEMPLATE', { size }),
        value: String(size),
    }));

    const currentPage = table.pageIndex + 1;
    const totalPages = table.pageCount;
    const visiblePages = (() => {
        if (totalPages <= 3) return getFormattedPages(1, totalPages);
        if (currentPage === 1) return getFormattedPages(1, 3);
        if (currentPage === totalPages) return getFormattedPages(totalPages - 2, totalPages);
        return getFormattedPages(currentPage - 1, currentPage + 1);
    })();

    const total = table.rowCount;
    const start = table.pageIndex * table.pageSize + 1;
    const end = Math.min((table.pageIndex + 1) * table.pageSize, total);

    return (
        <div className={`flex items-center justify-between ${className}`.trim()}>
            <div className="flex flex-1 items-center gap-2 justify-between">
                <p className="text-sm truncate text-n-slate-11 mb-0">
                    {t('REPORT.PAGINATION.RESULTS', { start, end, total })}
                </p>
                <div className="flex items-center gap-2">
                    {showPageSizeSelector && (
                        <FilterSelect
                            value={String(table.pageSize)}
                            variant="outline"
                            hideIcon
                            className="[&>button]:text-n-slate-11 [&>button]:hover:text-n-slate-12 [&>button]:h-6"
                            options={pageSizeOptions}
                            onChange={value => {
                                table.setPageSize(Number(value));
                                onPageSizeChange?.(Number(value));
                            }}
                        />
                    )}
                    <nav className="isolate inline-flex items-center gap-1.5">
                        <Button
                            icon="i-lucide-chevrons-left"
                            ghost
                            slate
                            sm
                            className="!size-6"
                            disabled={!table.canPreviousPage}
                            onClick={() => table.setPageIndex(0)}
                        />
                        <Button
                            icon="i-lucide-chevron-left"
                            ghost
                            slate
                            sm
                            className="!size-6"
                            disabled={!table.canPreviousPage}
                            onClick={() => table.previousPage()}
                        />
                        {visiblePages.map(page => (
                            <Button
                                key={page}
                                xs
                                outline
                                color={Number(page) === currentPage ? 'blue' : 'slate'}
                                className="!h-6 min-w-6"
                                onClick={() => table.setPageIndex(Number(page) - 1)}
                            >
                                <span className={`text-center${Number(page) === currentPage ? ' text-n-brand' : ''}`}>
                                    {page}
                                </span>
                            </Button>
                        ))}
                        <Button
                            icon="i-lucide-chevron-right"
                            ghost
                            slate
                            sm
                            className="!size-6"
                            disabled={!table.canNextPage}
                            onClick={() => table.nextPage()}
                        />
                        <Button
                            icon="i-lucide-chevrons-right"
                            ghost
                            slate
                            sm
                            className="!size-6"
                            disabled={!table.canNextPage}
                            onClick={() => table.setPageIndex(table.pageCount - 1)}
                        />
                    </nav>
                </div>
            </div>
        </div>
    );
}
