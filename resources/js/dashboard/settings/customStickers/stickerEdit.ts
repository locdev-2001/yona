import type { BackgroundMaskEdit } from 'sticker-renderer/image/background-mask.mjs';

// Tham số chỉnh ảnh gửi kèm ảnh gốc (trường `edit` của API tải sticker). Máy chủ và
// bản xem trước cùng dựng từ đúng JSON này nên thấy gì thì ra nấy.
// Toạ độ `crop` chuẩn hoá theo ảnh gốc; toạ độ và bán kính của `edits` chuẩn hoá theo
// ảnh đã cắt (bán kính theo cạnh dài của vùng cắt).

export const MAX_STICKER_EDITS = 200;
export const MAX_BRUSH_STROKE_POINTS = 2000;
// Máy chủ nhận JSON `edit` tối đa 1 MB: mỗi điểm cọ tốn ~16 byte nên giữ tổng số điểm
// dưới trần này, và bỏ các điểm sát nhau (dưới 0,5% cạnh vùng cắt) trước khi gửi.
export const MAX_TOTAL_BRUSH_POINTS = 40000;
const MIN_BRUSH_POINT_SPACING = 0.005;
const COORDINATE_DECIMALS = 4;

export interface NormalizedRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type StickerEditOperation = BackgroundMaskEdit;

export interface StickerEdit {
    crop: NormalizedRect | null;
    removeBackground: boolean;
    tolerance: number;
    feather: number;
    edits: StickerEditOperation[];
}

export interface PixelRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

// Khung cắt vuông, tính bằng điểm ảnh của ảnh đang chỉnh.
export interface CropSquare {
    left: number;
    top: number;
    side: number;
}

export interface ImageSize {
    width: number;
    height: number;
}

export type WandOperation = 'wand-remove' | 'wand-keep';
export type BrushOperation = 'brush-remove' | 'brush-keep';

// Nét chỉnh lưu theo toạ độ ảnh gốc (chuẩn hoá 0..1) để đổi khung cắt sau khi đã
// chỉnh không làm lệch nét; bán kính cọ chuẩn hoá theo cạnh dài ảnh gốc.
export type SourceEdit =
    | { op: WandOperation; x: number; y: number; tolerance: number }
    | { op: BrushOperation; points: [number, number][]; radius: number };

export interface StickerDraft {
    crop: CropSquare;
    removeBackground: boolean;
    tolerance: number;
    edits: SourceEdit[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundCoordinate = (value: number) => {
    const factor = 10 ** COORDINATE_DECIMALS;

    return clamp(Math.round(value * factor) / factor, 0, 1);
};

export function minimumCropSide(size: ImageSize): number {
    const shortSide = Math.min(size.width, size.height);

    return Math.min(shortSide, Math.max(8, Math.round(shortSide * 0.05)));
}

/** Không làm tròn: x + w làm tròn lên có thể vượt 1 và bị máy chủ từ chối. */
export function normalizedCrop(crop: CropSquare, size: ImageSize): NormalizedRect {
    const x = crop.left / size.width;
    const y = crop.top / size.height;

    return { x, y, w: Math.min(crop.side / size.width, 1 - x), h: Math.min(crop.side / size.height, 1 - y) };
}

/** Cùng cách làm tròn với renderer: mép trái/trên làm tròn xuống, mép phải/dưới làm tròn lên. */
export function cropPixelRect(crop: NormalizedRect | null, size: ImageSize): PixelRect {
    if (!crop) return { left: 0, top: 0, width: size.width, height: size.height };
    const left = Math.min(size.width - 1, Math.floor(crop.x * size.width));
    const top = Math.min(size.height - 1, Math.floor(crop.y * size.height));
    const right = Math.max(left + 1, Math.min(size.width, Math.ceil((crop.x + crop.w) * size.width)));
    const bottom = Math.max(top + 1, Math.min(size.height, Math.ceil((crop.y + crop.h) * size.height)));

    return { left, top, width: right - left, height: bottom - top };
}

/** Khung vuông ôm phần không phải nền, chừa lề; không có vật thì lấy hình vuông lớn nhất ở giữa. */
export function defaultCrop(subject: PixelRect | null, size: ImageSize, paddingRatio = 0.08): CropSquare {
    const maxSide = Math.min(size.width, size.height);
    const bounds = subject ?? { left: 0, top: 0, width: size.width, height: size.height };
    const side = clamp(
        Math.ceil(Math.max(bounds.width, bounds.height) * (1 + 2 * paddingRatio)),
        minimumCropSide(size),
        maxSide,
    );
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    return {
        left: clamp(Math.round(centerX - side / 2), 0, size.width - side),
        top: clamp(Math.round(centerY - side / 2), 0, size.height - side),
        side,
    };
}

export function moveCrop(crop: CropSquare, deltaX: number, deltaY: number, size: ImageSize): CropSquare {
    return {
        side: crop.side,
        left: clamp(Math.round(crop.left + deltaX), 0, size.width - crop.side),
        top: clamp(Math.round(crop.top + deltaY), 0, size.height - crop.side),
    };
}

export type CropCorner = 'nw' | 'ne' | 'sw' | 'se';

/** Kéo một góc: góc đối diện đứng yên, cạnh theo trục kéo xa hơn, không ra ngoài ảnh. */
export function resizeCrop(crop: CropSquare, corner: CropCorner, pointerX: number, pointerY: number, size: ImageSize): CropSquare {
    const growsRight = corner === 'ne' || corner === 'se';
    const growsDown = corner === 'sw' || corner === 'se';
    const anchorX = growsRight ? crop.left : crop.left + crop.side;
    const anchorY = growsDown ? crop.top : crop.top + crop.side;
    const roomX = growsRight ? size.width - anchorX : anchorX;
    const roomY = growsDown ? size.height - anchorY : anchorY;
    const requested = Math.max(Math.abs(pointerX - anchorX), Math.abs(pointerY - anchorY));
    const side = Math.round(clamp(requested, minimumCropSide(size), Math.min(roomX, roomY)));

    return {
        side,
        left: growsRight ? anchorX : anchorX - side,
        top: growsDown ? anchorY : anchorY - side,
    };
}

export function resizeCropAroundCenter(crop: CropSquare, delta: number, size: ImageSize): CropSquare {
    const side = Math.round(clamp(crop.side + delta, minimumCropSide(size), Math.min(size.width, size.height)));
    const centerX = crop.left + crop.side / 2;
    const centerY = crop.top + crop.side / 2;

    return {
        side,
        left: clamp(Math.round(centerX - side / 2), 0, size.width - side),
        top: clamp(Math.round(centerY - side / 2), 0, size.height - side),
    };
}

type Point = [number, number];

const isInsideUnit = ([x, y]: Point) => x >= 0 && x <= 1 && y >= 0 && y <= 1;

/** Cắt đoạn thẳng theo hình vuông đơn vị (Liang–Barsky); trả null nếu đoạn nằm ngoài hẳn. */
function clipSegment(start: Point, end: Point): [Point, Point] | null {
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    let enter = 0;
    let leave = 1;
    const edges: [number, number][] = [
        [-deltaX, start[0]],
        [deltaX, 1 - start[0]],
        [-deltaY, start[1]],
        [deltaY, 1 - start[1]],
    ];
    for (const [direction, distance] of edges) {
        if (direction === 0) {
            if (distance < 0) return null;
            continue;
        }
        const ratio = distance / direction;
        if (direction < 0) enter = Math.max(enter, ratio);
        else leave = Math.min(leave, ratio);
        if (enter > leave) return null;
    }

    // Đầu mút không bị cắt giữ nguyên giá trị để nối đúng với đoạn kế (không lệch số thực).
    return [
        enter === 0 ? start : [start[0] + enter * deltaX, start[1] + enter * deltaY],
        leave === 1 ? end : [start[0] + leave * deltaX, start[1] + leave * deltaY],
    ];
}

/** Tách nét cọ thành các đoạn nằm trong khung cắt; nét đi ra rồi vào lại thành hai nét. */
function clipStroke(points: Point[]): Point[][] {
    if (points.length === 1) return isInsideUnit(points[0]) ? [points] : [];
    const runs: Point[][] = [];
    let current: Point[] = [];
    for (let index = 1; index < points.length; index++) {
        const clipped = clipSegment(points[index - 1], points[index]);
        if (!clipped) {
            if (current.length) runs.push(current);
            current = [];
            continue;
        }
        const [entry, exit] = clipped;
        const last = current[current.length - 1];
        if (!last || last[0] !== entry[0] || last[1] !== entry[1]) {
            if (current.length) runs.push(current);
            current = [entry];
        }
        current.push(exit);
        const leftCrop = exit[0] !== points[index][0] || exit[1] !== points[index][1];
        if (leftCrop) {
            runs.push(current);
            current = [];
        }
    }
    if (current.length) runs.push(current);

    return runs;
}

function toCropEdits(edit: SourceEdit, crop: CropSquare, size: ImageSize): StickerEditOperation[] {
    const toCrop = (x: number, y: number): Point => [
        (x * size.width - crop.left) / crop.side,
        (y * size.height - crop.top) / crop.side,
    ];
    if (!('points' in edit)) {
        const point = toCrop(edit.x, edit.y);
        if (!isInsideUnit(point)) return [];

        return [{ op: edit.op, x: roundCoordinate(point[0]), y: roundCoordinate(point[1]), tolerance: edit.tolerance }];
    }
    const radius = roundCoordinate((edit.radius * Math.max(size.width, size.height)) / crop.side);
    if (radius <= 0) return [];

    return clipStroke(edit.points.map(([x, y]) => toCrop(x, y))).map(run => ({
        op: edit.op,
        points: thinStroke(run.map(([x, y]): Point => [roundCoordinate(x), roundCoordinate(y)])),
        radius,
    }));
}

/** Bỏ điểm quá sát điểm giữ trước đó; luôn giữ điểm đầu và điểm cuối để nét không bị hụt. */
function thinStroke(points: Point[]): Point[] {
    const kept: Point[] = [points[0]];
    for (let index = 1; index < points.length; index++) {
        const [x, y] = points[index];
        const [lastX, lastY] = kept[kept.length - 1];
        const isLast = index === points.length - 1;
        const distance = Math.hypot(x - lastX, y - lastY);
        if (distance >= MIN_BRUSH_POINT_SPACING || (isLast && distance > 0)) kept.push(points[index]);
    }

    return kept.slice(0, MAX_BRUSH_STROKE_POINTS);
}

/** Cắt bớt nét cọ cuối cùng khi vượt trần tổng số điểm; bản xem trước dùng đúng kết quả này. */
function withinPointBudget(edits: StickerEditOperation[]): StickerEditOperation[] {
    let remaining = MAX_TOTAL_BRUSH_POINTS;
    const limited: StickerEditOperation[] = [];
    for (const edit of edits.slice(0, MAX_STICKER_EDITS)) {
        if (!('points' in edit)) {
            limited.push(edit);
            continue;
        }
        if (remaining <= 0) break;
        const points = edit.points.slice(0, remaining);
        remaining -= points.length;
        limited.push({ ...edit, points });
    }

    return limited;
}

export function brushPointCount(edit: StickerEdit): number {
    return edit.edits.reduce((count, operation) => count + ('points' in operation ? operation.points.length : 0), 0);
}

/** Còn thêm được một lượt chỉnh (đũa thần hay nét cọ) mà không vượt giới hạn gửi lên. */
export function canAddStickerEdit(edit: StickerEdit): boolean {
    return edit.edits.length < MAX_STICKER_EDITS && brushPointCount(edit) < MAX_TOTAL_BRUSH_POINTS;
}

/** Nguồn duy nhất dựng JSON `edit`: bản xem trước và lượt tải lên cùng gọi hàm này. */
export function toStickerEdit(draft: StickerDraft, size: ImageSize): StickerEdit {
    return {
        crop: normalizedCrop(draft.crop, size),
        removeBackground: draft.removeBackground,
        tolerance: draft.tolerance,
        feather: 0,
        edits: withinPointBudget(draft.edits.flatMap(edit => toCropEdits(edit, draft.crop, size))),
    };
}
