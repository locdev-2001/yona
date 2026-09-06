import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useTableModel } from './useTableModel';

// Kiểm hai chế độ phân trang (tương ứng `manualPagination` của @tanstack/table).

describe('useTableModel', () => {
    it('cắt trang ngay trên dữ liệu khi phân trang tự động', () => {
        const rows = Array.from({ length: 25 }, (_, index) => index);
        const { result } = renderHook(() => useTableModel(rows, 10));

        expect(result.current.rows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(result.current.pageCount).toBe(3);
        expect(result.current.canPreviousPage).toBe(false);

        act(() => result.current.nextPage());
        expect(result.current.rows[0]).toBe(10);
        expect(result.current.canPreviousPage).toBe(true);

        act(() => result.current.setPageIndex(99));
        expect(result.current.pageIndex).toBe(2);
        expect(result.current.canNextPage).toBe(false);
    });

    it('giữ nguyên trang máy chủ và báo trang mới ra ngoài khi phân trang thủ công', () => {
        const onPageIndexChange = vi.fn();
        const serverPage = [{ id: 26 }, { id: 27 }];
        const { result } = renderHook(() =>
            useTableModel(serverPage, 25, { rowCount: 60, pageIndex: 1, onPageIndexChange }),
        );

        expect(result.current.rows).toBe(serverPage);
        expect(result.current.rowCount).toBe(60);
        expect(result.current.pageCount).toBe(3);
        expect(result.current.canPreviousPage).toBe(true);
        expect(result.current.canNextPage).toBe(true);

        act(() => result.current.nextPage());
        expect(onPageIndexChange).toHaveBeenCalledWith(2);
    });
});
