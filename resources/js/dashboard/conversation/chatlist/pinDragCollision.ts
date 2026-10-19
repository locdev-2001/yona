import { closestCenter } from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';

/**
 * Thẻ ghim kéo bay tự do theo con trỏ, nhưng chỉ đổi chỗ khi con trỏ còn nằm trong
 * khung nhóm ghim (hợp các dòng ghim). Ra ngoài thì không có đích: thả là về chỗ cũ.
 */
export const closestPinInsideGroup: CollisionDetection = args => {
    const { pointerCoordinates, droppableRects } = args;
    const rects = [...droppableRects.values()];
    if (!pointerCoordinates || !rects.length) return [];

    const { x, y } = pointerCoordinates;
    const isInsideGroup =
        x >= Math.min(...rects.map(rect => rect.left)) &&
        x <= Math.max(...rects.map(rect => rect.right)) &&
        y >= Math.min(...rects.map(rect => rect.top)) &&
        y <= Math.max(...rects.map(rect => rect.bottom));

    return isInsideGroup ? closestCenter(args) : [];
};
