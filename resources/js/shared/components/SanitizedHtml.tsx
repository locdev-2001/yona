import DOMPurify from 'dompurify';
import type { ElementType } from 'react';

// Tương đương directive `v-dompurify-html` của bản gốc: chuỗi có thẻ HTML
// (i18n kèm <a>, nội dung do người dùng nhập) được render thật sau khi lọc.
interface SanitizedHtmlProps {
    html?: string | null;
    as?: ElementType;
    className?: string;
    title?: string;
}

export default function SanitizedHtml({ html = '', as: Tag = 'span', className, title }: SanitizedHtmlProps) {
    return (
        <Tag
            className={className}
            title={title}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html ?? '') }}
        />
    );
}
