import { useMemo } from 'react';
import { sanitize } from 'lettersanitizer';

import { useInnerHtml } from '../../helpers/useInnerHtml';

// Thay component <Letter> của gói `vue-letter` (bản gốc dùng ở bubble email).
// vue-letter chỉ gọi `lettersanitizer.sanitize` rồi đổ vào một <div class=…>;
// bản React gọi thẳng cùng hàm đó nên giữ nguyên HTML đầu ra.
// LƯU Ý: prop `preserveCssPriority` của vue-letter khai báo kiểu Boolean nên khi
// call-site không truyền, Vue đưa xuống `false` (không phải mặc định `true` của
// sanitize) — giữ đúng `false` để trùng kết quả.
interface LetterProps {
    html: string;
    text?: string;
    className?: string;
    allowedCssProperties?: string[];
}

// Vue tính `sanitize` một lần khi setup (không phải computed) — bản React memo
// theo html/text để tránh sinh id ngẫu nhiên mới ở mỗi lần render.
export default function Letter({ html, text, className, allowedCssProperties }: LetterProps) {
    const sanitized = useMemo(
        () => sanitize(html, text, { allowedCssProperties, preserveCssPriority: false }),
        [html, text, allowedCssProperties],
    );
    const innerHtml = useInnerHtml(sanitized);

    return <div className={className} dangerouslySetInnerHTML={innerHtml} />;
}
