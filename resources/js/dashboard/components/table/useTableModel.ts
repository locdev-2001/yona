import { useMemo, useState } from 'react';

// Thay @tanstack/vue-table của Chatwoot: mô hình bảng tối giản (không sắp xếp)
// — đủ cho Table.tsx/Pagination.tsx dựng đúng DOM gốc.
// Hai chế độ phân trang, đúng như `manualPagination` của bản gốc:
//   - tự động (mặc định): cắt trang ngay trên mảng truyền vào;
//   - thủ công: mảng truyền vào ĐÃ là một trang từ máy chủ, tổng số dòng và
//     trang hiện tại do nơi gọi giữ.

export interface TableModel<TRow> {
    rows: TRow[];
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    rowCount: number;
    canPreviousPage: boolean;
    canNextPage: boolean;
    setPageIndex: (index: number) => void;
    setPageSize: (size: number) => void;
    previousPage: () => void;
    nextPage: () => void;
}

export interface ManualPagination {
    rowCount: number;
    pageIndex: number;
    onPageIndexChange: (index: number) => void;
}

export function useTableModel<TRow>(
    data: TRow[],
    initialPageSize = 10,
    manualPagination?: ManualPagination,
): TableModel<TRow> {
    const [localPageIndex, setLocalPageIndex] = useState(0);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    const rowCount = manualPagination ? manualPagination.rowCount : data.length;
    const pageCount = Math.max(Math.ceil(rowCount / pageSize), 1);
    const requestedPageIndex = manualPagination ? manualPagination.pageIndex : localPageIndex;
    const pageIndex = Math.min(Math.max(requestedPageIndex, 0), pageCount - 1);

    const rows = useMemo(
        () => (manualPagination ? data : data.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)),
        [data, pageIndex, pageSize, manualPagination],
    );

    const goToPage = (index: number) => {
        const next = Math.max(Math.min(index, pageCount - 1), 0);
        if (manualPagination) manualPagination.onPageIndexChange(next);
        else setLocalPageIndex(next);
    };

    return {
        rows,
        pageIndex,
        pageSize,
        pageCount,
        rowCount,
        canPreviousPage: pageIndex > 0,
        canNextPage: pageIndex < pageCount - 1,
        setPageIndex: goToPage,
        setPageSize: size => {
            setPageSizeState(size);
            goToPage(0);
        },
        previousPage: () => goToPage(pageIndex - 1),
        nextPage: () => goToPage(pageIndex + 1),
    };
}
