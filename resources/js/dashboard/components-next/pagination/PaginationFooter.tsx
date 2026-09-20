import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/pagination/PaginationFooter.vue
// (useNumberFormatter: Intl compact/full như bản gốc).
// KHÁC BIỆT CỐ Ý so với bản gốc: gốc ghim 'en' nên số ngăn cách kiểu Anh ở mọi
// ngôn ngữ. Lấy locale của lần render (cùng nguồn với i18n) để tiếng Việt ra đúng.
const activeLocale = () => (typeof document === 'undefined' ? 'en' : document.documentElement.lang || 'en');

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat(activeLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatFullNumber = (value: number) => new Intl.NumberFormat(activeLocale()).format(value);

interface PaginationFooterProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage?: number;
    currentPageInfo?: string;
    className?: string;
    onPageChange: (page: number) => void;
}

export default function PaginationFooter({
    currentPage,
    totalItems,
    itemsPerPage = 16,
    currentPageInfo = '',
    className = '',
    onPageChange,
}: PaginationFooterProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(startItem + itemsPerPage - 1, totalItems);
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            onPageChange(newPage);
        }
    };

    const currentPageInformation = t(currentPageInfo || 'PAGINATION_FOOTER.SHOWING', {
        startItem: formatFullNumber(startItem),
        endItem: formatFullNumber(endItem),
        totalItems: formatCompactNumber(totalItems),
        n: totalItems,
    });

    const pageInfo = t('PAGINATION_FOOTER.CURRENT_PAGE_INFO', {
        currentPage: formatFullNumber(currentPage),
        totalPages: formatCompactNumber(totalPages),
        n: totalPages,
    });

    return (
        <div
            className={`flex justify-between h-[3.375rem] w-full border-t border-n-weak mx-auto bg-n-surface-1 py-3 px-6 items-center before:absolute before:inset-x-0 before:-top-4 before:bg-gradient-to-t before:from-n-surface-1 before:from-0% before:to-transparent before:h-4 before:pointer-events-none ${className}`.trim()}
        >
            <div className="flex items-center gap-3">
                <span className="min-w-0 text-body-main line-clamp-1 text-n-slate-11">{currentPageInformation}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    icon="i-lucide-chevrons-left"
                    variant="ghost"
                    size="sm"
                    color="slate"
                    className="!w-8 !h-6"
                    disabled={isFirstPage}
                    onClick={() => changePage(1)}
                />
                <Button
                    icon="i-lucide-chevron-left"
                    variant="ghost"
                    color="slate"
                    size="sm"
                    className="!w-8 !h-6"
                    disabled={isFirstPage}
                    onClick={() => changePage(currentPage - 1)}
                />
                <div className="inline-flex items-center gap-2 text-sm">
                    <span className="px-3 tabular-nums py-0.5 font-420 bg-n-input-background text-body-main text-n-slate-12 rounded-md">
                        {formatFullNumber(currentPage)}
                    </span>
                    <span className="truncate text-body-main text-n-slate-11">{pageInfo}</span>
                </div>
                <Button
                    icon="i-lucide-chevron-right"
                    variant="ghost"
                    color="slate"
                    size="sm"
                    className="!w-8 !h-6"
                    disabled={isLastPage}
                    onClick={() => changePage(currentPage + 1)}
                />
                <Button
                    icon="i-lucide-chevrons-right"
                    variant="ghost"
                    color="slate"
                    size="sm"
                    className="!w-8 !h-6"
                    disabled={isLastPage}
                    onClick={() => changePage(totalPages)}
                />
            </div>
        </div>
    );
}
