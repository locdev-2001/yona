import { escapeHtml } from 'shared/helpers/escapeHtml';
import { highlightSegments } from 'shared/helpers/searchFold';

// Nền nhấn nhẹ + chữ đậm: chỉ in đậm thì trên tên vốn đã đậm vừa (500) gần như
// không thấy. Một kiểu cho mọi chỗ tô từ khoá tìm kiếm, cả giao diện sáng lẫn tối.
export const SEARCH_MATCH_CLASS = 'rounded-sm bg-n-amber-4 font-semibold text-n-slate-12 box-decoration-clone';

/**
 * HTML của `text` với đoạn khớp từ khoá bọc `<mark>` cùng kiểu với kết quả tìm kiếm —
 * cho bảng gợi ý chỉ nhận HTML. Chữ đến từ kênh nên mọi đoạn đều được mã hoá.
 */
export function searchHighlightHtml(text: string, query: string): string {
    return highlightSegments(text, query)
        .map(segment =>
            segment.match ? `<mark class="${SEARCH_MATCH_CLASS}">${escapeHtml(segment.text)}</mark>` : escapeHtml(segment.text),
        )
        .join('');
}
