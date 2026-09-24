// Chừa một khoảng để phần tử kế bên ló ra, cho người dùng biết còn cuộn tiếp được.
export const REVEAL_MARGIN_PX = 24;

/**
 * Cuộn ngang khung cuộn gần nhất chứa `element` vừa đủ để thấy trọn nó. Chỉ động tới
 * đúng khung đó: khác scrollIntoView, không kéo trang hay khung bọc ngoài (kể cả
 * khung overflow-hidden) trượt theo làm vỡ bố cục.
 */
export function revealHorizontally(element: HTMLElement, margin = REVEAL_MARGIN_PX): void {
    const scroller = horizontalScrollerOf(element);
    if (!scroller) return;

    const viewport = scroller.getBoundingClientRect();
    const target = element.getBoundingClientRect();

    if (target.left < viewport.left + margin) {
        scroller.scrollLeft -= viewport.left + margin - target.left;
    } else if (target.right > viewport.right - margin) {
        scroller.scrollLeft += target.right - (viewport.right - margin);
    }
}

// Tổ tiên gần nhất cắt tràn ngang; chỉ trả về khi nó cuộn được và đang tràn thật.
function horizontalScrollerOf(element: HTMLElement): HTMLElement | null {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowX } = window.getComputedStyle(node);

        if (overflowX === 'auto' || overflowX === 'scroll') {
            return node.scrollWidth > node.clientWidth ? node : null;
        }

        if (overflowX === 'hidden' || overflowX === 'clip') return null;
    }

    return null;
}
