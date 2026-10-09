import type { ClientRect, CollisionDetection, UniqueIdentifier } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';

import { closestPinInsideGroup } from './pinDragCollision';

const ROW_HEIGHT = 60;

function rowRect(index: number): ClientRect {
    const top = index * ROW_HEIGHT;

    return { top, bottom: top + ROW_HEIGHT, height: ROW_HEIGHT, left: 8, right: 330, width: 322 };
}

function detect(pointer: { x: number; y: number } | null): UniqueIdentifier[] {
    const droppableRects = new Map<UniqueIdentifier, ClientRect>([
        [11, rowRect(0)],
        [12, rowRect(1)],
        [13, rowRect(2)],
    ]);
    const droppableContainers = [...droppableRects.keys()].map(id => ({ id, key: id, data: { current: {} }, disabled: false, node: { current: null }, rect: { current: droppableRects.get(id) } }));

    return closestPinInsideGroup({
        active: { id: 11 },
        collisionRect: { ...rowRect(0), top: (pointer?.y ?? 0) - 30, bottom: (pointer?.y ?? 0) + 30 },
        droppableRects,
        droppableContainers,
        pointerCoordinates: pointer,
    } as unknown as Parameters<CollisionDetection>[0]).map(collision => collision.id);
}

describe('closestPinInsideGroup', () => {
    it('con trỏ trong nhóm ghim: đích là dòng ghim gần nhất', () => {
        expect(detect({ x: 100, y: 150 })[0]).toBe(13);
    });

    it.each([
        { x: 500, y: 90 },
        { x: 100, y: 400 },
    ])('con trỏ ra ngoài nhóm ghim ($x, $y): không có đích', pointer => {
        expect(detect(pointer)).toEqual([]);
    });

    it('không có toạ độ con trỏ thì không có đích', () => {
        expect(detect(null)).toEqual([]);
    });
});
