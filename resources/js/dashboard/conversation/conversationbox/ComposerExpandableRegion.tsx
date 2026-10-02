import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const SLIDE_DURATION_MS = 200;

// Phần ô soạn chỉ hiện khi đang soạn (tab chế độ, người nhận email…): co/giãn
// chiều cao bằng grid 0fr ↔ 1fr để trượt mượt mà không phải đo chiều cao nội
// dung. Chỉ cắt phần tràn khi đang thu/đang trượt; mở hẳn rồi thì để dropdown
// (gợi ý email ở TO/CC…) tràn ra ngoài được. Lúc thu, `inert` đưa cả vùng ra
// khỏi thứ tự Tab và trình đọc màn hình.
export default function ComposerExpandableRegion({ isExpanded, children }: { isExpanded: boolean; children: ReactNode }) {
    const [isFullyOpen, setIsFullyOpen] = useState(isExpanded);

    // Hẹn giờ thay vì transitionend: người dùng tắt hiệu ứng thì không có sự kiện đó.
    useEffect(() => {
        if (!isExpanded) {
            setIsFullyOpen(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setIsFullyOpen(true), SLIDE_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [isExpanded]);

    return (
        <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
            inert={!isExpanded}
        >
            <div className={`min-h-0 ${isFullyOpen ? 'overflow-visible' : 'overflow-hidden'}`}>{children}</div>
        </div>
    );
}
