import type { CSSProperties } from 'react';

import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

// Bo góc bong bóng nằm ở đúng một chỗ: cạnh "đuôi" phía người gửi thu về
// --yona-chat-radius-tail; trong nhóm, cạnh nối giữa hai khối thu về
// --yona-chat-radius-stack. Mọi khối (chữ, lưới ảnh, tệp, thu hồi) gọi chung.
const ROUND = 'var(--yona-chat-radius-bubble)';
const TAIL = 'var(--yona-chat-radius-tail)';
const STACK = 'var(--yona-chat-radius-stack)';

export function bubbleRadius(isOwn: boolean, position: MessageGroupPosition): CSSProperties {
    if (position === 'single') {
        return { borderRadius: isOwn ? `${ROUND} ${ROUND} ${TAIL} ${ROUND}` : `${ROUND} ${ROUND} ${ROUND} ${TAIL}` };
    }

    const top = position === 'first' ? ROUND : STACK;

    return { borderRadius: isOwn ? `${ROUND} ${top} ${STACK} ${ROUND}` : `${top} ${ROUND} ${ROUND} ${STACK}` };
}

// Một tin có thể gồm nhiều khối (chữ, lưới ảnh, tệp); các khối nối nhau như
// những tin liền kề trong nhóm.
export function partPosition(
    messagePosition: MessageGroupPosition,
    partIndex: number,
    partCount: number,
): MessageGroupPosition {
    const joinsAbove = partIndex > 0 || messagePosition === 'middle' || messagePosition === 'last';
    const joinsBelow = partIndex < partCount - 1 || messagePosition === 'first' || messagePosition === 'middle';

    if (joinsAbove) return joinsBelow ? 'middle' : 'last';

    return joinsBelow ? 'first' : 'single';
}
