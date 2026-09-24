import { useMemo } from 'react';

// React 19 so `dangerouslySetInnerHTML` theo tham chiếu object: object mới ở mỗi
// lần render là gán lại innerHTML và thay hết text node của tin, nên vùng tô từ
// khoá tìm kiếm và đoạn người dùng đang bôi đen mất theo dù nội dung không đổi.
// Giữ object ổn định theo chuỗi HTML để DOM chỉ thay khi nội dung thật sự đổi.
export function useInnerHtml(html: string): { __html: string } {
    return useMemo(() => ({ __html: html }), [html]);
}
