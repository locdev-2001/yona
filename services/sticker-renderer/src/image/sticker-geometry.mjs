// Hình học vùng lấy và cách đặt lên ô vuông, dùng chung trình duyệt (bản xem trước) và Node (renderer):
// hàm thuần trên số nguyên điểm ảnh, không phụ thuộc, để hai phía ra cùng một kết quả.

export const FIT_COVER = 'cover';
export const FIT_CONTAIN = 'contain';
export const FIT_MODES = Object.freeze([FIT_COVER, FIT_CONTAIN]);
export const DEFAULT_FIT = FIT_COVER;
export const COVER_PADDING_RATIO = 0.04;

// Vùng lấy được vượt biên ảnh tối đa chừng này lần cạnh ảnh về mỗi phía (phần vượt là trong suốt).
export const MAX_CROP_OVERFLOW = 8;
export const MIN_CROP_SIDE = 1e-4;
export const CROP_BOUND_EPSILON = 1e-6;

const CHANNELS = 4;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function sameRectangle(first, second) {
    return first.left === second.left && first.top === second.top && first.width === second.width && first.height === second.height;
}

function isOverflowing(crop) {
    return crop.x < -CROP_BOUND_EPSILON
        || crop.y < -CROP_BOUND_EPSILON
        || crop.x + crop.w > 1 + CROP_BOUND_EPSILON
        || crop.y + crop.h > 1 + CROP_BOUND_EPSILON;
}

/**
 * `frame` = vùng lấy theo điểm ảnh (có thể thò ra ngoài ảnh); `region` = phần giao với ảnh, luôn ≥ 1×1,
 * là phần điểm ảnh thật đem đi xoá nền. Vùng lấy nằm trong ảnh thì frame trùng region.
 */
export function cropGeometry(crop, width, height) {
    if (!crop) {
        const whole = { left: 0, top: 0, width, height };
        return { frame: whole, region: whole };
    }
    const frameLeft = Math.floor(crop.x * width);
    const frameTop = Math.floor(crop.y * height);
    const frameRight = Math.max(frameLeft + 1, Math.ceil((crop.x + crop.w) * width));
    const frameBottom = Math.max(frameTop + 1, Math.ceil((crop.y + crop.h) * height));
    const left = clamp(frameLeft, 0, width - 1);
    const top = clamp(frameTop, 0, height - 1);
    const region = {
        left,
        top,
        width: Math.max(left + 1, Math.min(width, frameRight)) - left,
        height: Math.max(top + 1, Math.min(height, frameBottom)) - top,
    };
    const frame = isOverflowing(crop)
        ? { left: frameLeft, top: frameTop, width: frameRight - frameLeft, height: frameBottom - frameTop }
        : region;

    return { frame, region };
}

/**
 * Toạ độ `edits` chuẩn hoá theo vùng lấy (frame) → chuẩn hoá theo region (phần ảnh thật).
 * Bán kính cọ chuẩn hoá theo cạnh dài nên đổi theo tỉ lệ cạnh dài; nhấp đũa thần rơi vào phần trong suốt bị bỏ.
 */
export function editsInRegion(edits, frame, region) {
    if (edits.length === 0 || sameRectangle(frame, region)) return edits;
    const toRegionX = (x) => (x * frame.width + frame.left - region.left) / region.width;
    const toRegionY = (y) => (y * frame.height + frame.top - region.top) / region.height;
    const radiusScale = Math.max(frame.width, frame.height) / Math.max(region.width, region.height);

    return edits.flatMap((edit) => {
        if (edit.op === 'wand-remove' || edit.op === 'wand-keep') {
            const x = toRegionX(edit.x);
            const y = toRegionY(edit.y);

            return x >= 0 && x < 1 && y >= 0 && y < 1 ? [{ ...edit, x, y }] : [];
        }

        return [{ ...edit, points: edit.points.map(([x, y]) => [toRegionX(x), toRegionY(y)]), radius: edit.radius * radiusScale }];
    });
}

/** Khung bao phần còn thấy được (alpha > 0) của mọi khung, theo điểm ảnh; null khi mọi khung trong suốt hết. */
export function opaqueBounds(frames, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (const frame of frames) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (frame[(y * width + x) * CHANNELS + 3] === 0) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    return maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Cách đặt region lên ô vuông: chép `source` (theo điểm ảnh của region) vào ô cạnh `side` tại (offsetX, offsetY).
 * cover: cắt sát phần còn thấy được của mọi khung (hình động không nhảy), căn giữa, chừa lề 4%.
 * contain: giữ nguyên cả vùng lấy, đặt vào ô vuông theo cạnh dài, phần thiếu là lề trong suốt.
 * `bounds` null (xoá sạch) thì cover đặt cả region.
 */
export function squareLayout(fit, frame, region, bounds) {
    if (fit === FIT_CONTAIN) {
        const side = Math.max(frame.width, frame.height);

        return {
            side,
            offsetX: region.left - frame.left + Math.floor((side - frame.width) / 2),
            offsetY: region.top - frame.top + Math.floor((side - frame.height) / 2),
            source: { left: 0, top: 0, width: region.width, height: region.height },
        };
    }
    const source = bounds ?? { left: 0, top: 0, width: region.width, height: region.height };
    const side = Math.max(1, Math.ceil(Math.max(source.width, source.height) * (1 + 2 * COVER_PADDING_RATIO)));

    return {
        side,
        offsetX: Math.floor((side - source.width) / 2),
        offsetY: Math.floor((side - source.height) / 2),
        source,
    };
}

/**
 * Diện tích ô vuông contain so với diện tích ảnh, theo toạ độ chuẩn hoá; ≥ 1. Renderer dùng để giải mã nhỏ lại
 * khi vùng lấy vượt biên xa, giữ bộ nhớ trong ngân sách.
 */
export function containAreaRatio(fit, crop, width, height) {
    if (fit !== FIT_CONTAIN) return 1;
    const side = Math.max((crop?.w ?? 1) * width, (crop?.h ?? 1) * height);

    return Math.max(1, (side * side) / (width * height));
}
