// Lõi hình học kéo-thả sắp xếp, dùng chung cho danh sách dọc và lưới ô:
// ngưỡng nhấc, tổ tiên cuộn, tự cuộn ở mép và điểm chèn.

export const DRAG_THRESHOLD_PX = 5;
export const AUTO_SCROLL_BAND_PX = 60;
export const AUTO_SCROLL_STEP_PX = 10;

export interface Point {
    x: number;
    y: number;
}

export interface KeyedRect {
    key: string;
    rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
}

export type AutoScrollDirection = -1 | 0 | 1;

export function passedDragThreshold(start: Point, current: Point): boolean {
    return Math.hypot(current.x - start.x, current.y - start.y) >= DRAG_THRESHOLD_PX;
}

export function nearestScrollParent(element: HTMLElement | null): HTMLElement | null {
    let candidate = element?.parentElement ?? null;
    while (candidate) {
        const { overflowY } = getComputedStyle(candidate);
        if (overflowY === 'auto' || overflowY === 'scroll') return candidate;
        candidate = candidate.parentElement;
    }

    return null;
}

export function autoScrollDirection(scroller: HTMLElement, pointerY: number): AutoScrollDirection {
    const rect = scroller.getBoundingClientRect();
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight;
    if (pointerY < rect.top + AUTO_SCROLL_BAND_PX && !atTop) return -1;
    if (pointerY > rect.bottom - AUTO_SCROLL_BAND_PX && !atBottom) return 1;

    return 0;
}

// Khoá phần tử đứng sau `key` trong `orderedKeys`, null khi `key` là phần tử cuối.
export function keyAfter(orderedKeys: readonly string[], key: string): string | null {
    const next = orderedKeys[orderedKeys.indexOf(key) + 1];

    return next ?? null;
}

// Danh sách dọc: con trỏ ở nửa trên thẻ thì chèn trước thẻ, nửa dưới thì chèn sau.
// `orderedKeys` là danh sách đã bỏ phần tử đang kéo.
export function verticalInsertBefore(
    pointerY: number,
    target: KeyedRect,
    orderedKeys: readonly string[],
): string | null {
    const above = pointerY < target.rect.top + target.rect.height / 2;

    return above ? target.key : keyAfter(orderedKeys, target.key);
}

// Số cột của lưới đo từ vị trí thật: số ô cùng hàng với ô đầu.
export function columnCount(cells: readonly KeyedRect[]): number {
    if (cells.length === 0) return 1;
    const firstRowTop = cells[0].rect.top;
    const tolerance = cells[0].rect.height / 2;

    return Math.max(1, cells.filter(cell => Math.abs(cell.rect.top - firstRowTop) < tolerance).length);
}

// Lưới hai chiều: lấy ô có tâm gần con trỏ nhất. Lưới nhiều cột so theo trục x
// (trái tâm = chèn trước), lưới một cột so theo trục y — đúng luật của danh sách dọc.
// `cells` là các ô còn lại theo thứ tự hiển thị, đã bỏ phần tử đang kéo.
export function gridInsertBefore(pointer: Point, cells: readonly KeyedRect[]): string | null {
    if (cells.length === 0) return null;

    let nearest = cells[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const cell of cells) {
        const centerX = cell.rect.left + cell.rect.width / 2;
        const centerY = cell.rect.top + cell.rect.height / 2;
        const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
        if (distance < nearestDistance) {
            nearest = cell;
            nearestDistance = distance;
        }
    }

    const orderedKeys = cells.map(cell => cell.key);
    if (columnCount(cells) === 1) return verticalInsertBefore(pointer.y, nearest, orderedKeys);

    const before = pointer.x < nearest.rect.left + nearest.rect.width / 2;

    return before ? nearest.key : keyAfter(orderedKeys, nearest.key);
}

// Thứ tự mới sau khi thả `movedKey` vào khe trước `insertBefore` (null = cuối).
export function moveKeyBefore(orderedKeys: readonly string[], movedKey: string, insertBefore: string | null): string[] {
    const rest = orderedKeys.filter(key => key !== movedKey);
    const at = insertBefore === null ? -1 : rest.indexOf(insertBefore);
    rest.splice(at === -1 ? rest.length : at, 0, movedKey);

    return rest;
}
