import { Fragment } from 'react';

import { highlightSegments } from 'shared/helpers/searchFold';

interface HighlightedTextProps {
    text: string;
    query: string;
    className?: string;
}

// Nền nhấn nhẹ + chữ đậm: chỉ in đậm thì trên tên vốn đã đậm vừa (500) gần như
// không thấy. Cùng một kiểu cho mọi kết quả tìm, cả giao diện sáng lẫn tối.
export const SEARCH_MATCH_CLASS = 'rounded-sm bg-n-amber-4 font-semibold text-n-slate-12 box-decoration-clone';

// Chữ thường của React (không HTML thô), đoạn khớp từ khoá không dấu được tô nền.
export default function HighlightedText({ text, query, className }: HighlightedTextProps) {
    return (
        <span className={className}>
            {highlightSegments(text, query).map((segment, index) =>
                segment.match ? (
                    <mark key={index} className={SEARCH_MATCH_CLASS}>
                        {segment.text}
                    </mark>
                ) : (
                    <Fragment key={index}>{segment.text}</Fragment>
                ),
            )}
        </span>
    );
}
