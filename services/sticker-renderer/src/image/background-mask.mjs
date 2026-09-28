// Lõi xoá nền dùng chung trình duyệt và Node: hàm thuần trên buffer RGBA, không phụ thuộc.

export const MASK_OPAQUE = 255;
export const MASK_CLEAR = 0;
export const DEFAULT_TOLERANCE = 20;
export const DEFAULT_FEATHER = 0;
export const MAX_FEATHER = 4;
export const EDIT_OPERATIONS = Object.freeze(['wand-remove', 'wand-keep', 'brush-remove', 'brush-keep']);

const MAX_DELTA_E = 100;
const TRANSPARENT_ALPHA = 128;
const TRANSPARENT_EDGE_RATIO = 0.25;
const HISTOGRAM_SHIFT = 4;
const HISTOGRAM_BITS = 8 - HISTOGRAM_SHIFT;
const MAX_CACHED_COLORS = 1 << 16;
const NO_REFERENCE = -1;
const INTERIOR_SEARCH_RADIUS = 3;
const MIN_UNMIX_ALPHA = 0.04;
const MIN_UNMIX_CONTRAST_SQUARED = 30 ** 2;
const MAX_UNMIX_RESIDUAL_SQUARED = 48 ** 2;
const NEIGHBOUR_OFFSETS = Int8Array.from([
    -1, -1, 0, -1, 1, -1,
    -1, 0, 1, 0,
    -1, 1, 0, 1, 1, 1,
]);

const SRGB_TO_LINEAR = (() => {
    const table = new Float64Array(256);
    for (let value = 0; value < 256; value++) {
        const channel = value / 255;
        table[value] = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }

    return table;
})();

const LAB_EPSILON = 216 / 24389;
const LAB_KAPPA = 24389 / 27;
const D65_WHITE = [0.95047, 1, 1.08883];

function labComponent(ratio) {
    return ratio > LAB_EPSILON ? Math.cbrt(ratio) : (LAB_KAPPA * ratio + 16) / 116;
}

export function rgbToLab(red, green, blue) {
    const r = SRGB_TO_LINEAR[red];
    const g = SRGB_TO_LINEAR[green];
    const b = SRGB_TO_LINEAR[blue];
    const fx = labComponent((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / D65_WHITE[0]);
    const fy = labComponent((0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / D65_WHITE[1]);
    const fz = labComponent((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / D65_WHITE[2]);

    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function toleranceToSquaredDeltaE(tolerance) {
    const deltaE = (clamp(Number(tolerance) || 0, 0, 100) / 100) * MAX_DELTA_E;

    return deltaE * deltaE;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function squaredLabDistance(red, green, blue, referenceLab) {
    const [l, a, b] = rgbToLab(red, green, blue);

    return (l - referenceLab[0]) ** 2 + (a - referenceLab[1]) ** 2 + (b - referenceLab[2]) ** 2;
}

/**
 * So mỗi điểm với một màu tham chiếu cố định (không so láng giềng) để vùng loang không chảy qua dải màu chuyển.
 * Điểm trong suốt hẳn luôn khớp: nền đã trong suốt thì loang đi qua được.
 * Nhớ kết quả theo màu vì nền phẳng lặp lại cùng vài màu.
 */
function createColorMatcher(rgba, referenceRgb, tolerance) {
    const referenceLab = rgbToLab(referenceRgb[0], referenceRgb[1], referenceRgb[2]);
    const limit = toleranceToSquaredDeltaE(tolerance);
    const verdictByColor = new Map();

    return (pixelIndex) => {
        const offset = pixelIndex * 4;
        if (rgba[offset + 3] === 0) return true;
        const color = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
        let verdict = verdictByColor.get(color);
        if (verdict === undefined) {
            verdict = squaredLabDistance(rgba[offset], rgba[offset + 1], rgba[offset + 2], referenceLab) <= limit;
            if (verdictByColor.size < MAX_CACHED_COLORS) verdictByColor.set(color, verdict);
        }

        return verdict;
    };
}

function edgePixelIndexes(width, height) {
    const indexes = [];
    for (let x = 0; x < width; x++) {
        indexes.push(x);
        if (height > 1) indexes.push((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
        indexes.push(y * width);
        if (width > 1) indexes.push(y * width + width - 1);
    }

    return indexes;
}

export function hasTransparentEdges(rgba, width, height) {
    const edges = edgePixelIndexes(width, height);
    const transparentCount = edges.reduce((count, index) => count + (rgba[index * 4 + 3] < TRANSPARENT_ALPHA ? 1 : 0), 0);

    return edges.length > 0 && transparentCount / edges.length >= TRANSPARENT_EDGE_RATIO;
}

/** Màu nền trội ở mép: ô histogram 4 bit/kênh đông nhất trong các điểm mép còn đục, lấy trung bình màu thật của ô đó. */
export function dominantEdgeColor(rgba, width, height) {
    const bins = new Map();
    for (const index of edgePixelIndexes(width, height)) {
        const offset = index * 4;
        if (rgba[offset + 3] < TRANSPARENT_ALPHA) continue;
        const red = rgba[offset];
        const green = rgba[offset + 1];
        const blue = rgba[offset + 2];
        const key = ((red >> HISTOGRAM_SHIFT) << (2 * HISTOGRAM_BITS)) | ((green >> HISTOGRAM_SHIFT) << HISTOGRAM_BITS) | (blue >> HISTOGRAM_SHIFT);
        const bin = bins.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
        bin.count++;
        bin.red += red;
        bin.green += green;
        bin.blue += blue;
        bins.set(key, bin);
    }

    let dominant = null;
    for (const bin of bins.values()) {
        if (!dominant || bin.count > dominant.count) dominant = bin;
    }

    return dominant
        ? [Math.round(dominant.red / dominant.count), Math.round(dominant.green / dominant.count), Math.round(dominant.blue / dominant.count)]
        : null;
}

/** Loang 8 hướng từ các hạt giống; trả mảng cờ 1 cho mọi điểm thuộc vùng. */
function floodRegion(width, height, seedIndexes, matches) {
    const region = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    let stackSize = 0;

    for (const seed of seedIndexes) {
        if (visited[seed]) continue;
        visited[seed] = 1;
        if (!matches(seed)) continue;
        region[seed] = 1;
        stack[stackSize++] = seed;
    }

    while (stackSize > 0) {
        const current = stack[--stackSize];
        const x = current % width;
        const y = (current - x) / width;
        for (let offsetIndex = 0; offsetIndex < NEIGHBOUR_OFFSETS.length; offsetIndex += 2) {
            const nx = x + NEIGHBOUR_OFFSETS[offsetIndex];
            const ny = y + NEIGHBOUR_OFFSETS[offsetIndex + 1];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = ny * width + nx;
            if (visited[neighbour]) continue;
            visited[neighbour] = 1;
            if (!matches(neighbour)) continue;
            region[neighbour] = 1;
            stack[stackSize++] = neighbour;
        }
    }

    return region;
}

function packRgb(red, green, blue) {
    return (red << 16) | (green << 8) | blue;
}

function unpackRgb(packed) {
    return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

function clearRegion(region, mask, clearedAgainst, referenceRgb) {
    const reference = referenceRgb ? packRgb(referenceRgb[0], referenceRgb[1], referenceRgb[2]) : NO_REFERENCE;
    for (let index = 0; index < region.length; index++) {
        if (!region[index]) continue;
        mask[index] = MASK_CLEAR;
        clearedAgainst[index] = reference;
    }
}

function removeEdgeBackground(rgba, width, height, tolerance, mask, clearedAgainst) {
    const backgroundColor = dominantEdgeColor(rgba, width, height);
    if (!backgroundColor) return null;
    const region = floodRegion(width, height, edgePixelIndexes(width, height), createColorMatcher(rgba, backgroundColor, tolerance));
    clearRegion(region, mask, clearedAgainst, backgroundColor);

    return backgroundColor;
}

function toPixel(normalized, size) {
    return clamp(Math.floor(Number(normalized) * size), 0, size - 1);
}

function applyWand(rgba, width, height, edit, mask, clearedAgainst) {
    const seed = toPixel(edit.y, height) * width + toPixel(edit.x, width);
    const offset = seed * 4;
    const seedColor = [rgba[offset], rgba[offset + 1], rgba[offset + 2]];
    const region = floodRegion(width, height, [seed], createColorMatcher(rgba, seedColor, edit.tolerance ?? DEFAULT_TOLERANCE));
    if (edit.op === 'wand-remove') {
        clearRegion(region, mask, clearedAgainst, seedColor);
        return;
    }
    for (let index = 0; index < region.length; index++) {
        if (region[index]) mask[index] = MASK_OPAQUE;
    }
}

function paintDisc(mask, clearedAgainst, width, height, centerX, centerY, radius, value) {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
    const radiusSquared = radius * radius;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x + 0.5 - centerX;
            const dy = y + 0.5 - centerY;
            if (dx * dx + dy * dy > radiusSquared) continue;
            mask[y * width + x] = value;
            clearedAgainst[y * width + x] = NO_REFERENCE;
        }
    }
}

/** Bán kính cọ chuẩn hoá theo cạnh dài của ảnh đã cắt; nét cọ nội suy giữa các điểm để không đứt đoạn. */
function applyBrush(width, height, edit, mask, clearedAgainst) {
    const value = edit.op === 'brush-keep' ? MASK_OPAQUE : MASK_CLEAR;
    const radius = Math.max(0.5, Number(edit.radius) * Math.max(width, height));
    const step = Math.max(0.5, radius / 2);
    const points = edit.points.map(([x, y]) => [Number(x) * width, Number(y) * height]);
    points.forEach(([x, y], index) => {
        if (index === 0) {
            paintDisc(mask, clearedAgainst, width, height, x, y, radius, value);
            return;
        }
        const [previousX, previousY] = points[index - 1];
        const distance = Math.hypot(x - previousX, y - previousY);
        const steps = Math.max(1, Math.ceil(distance / step));
        for (let stepIndex = 1; stepIndex <= steps; stepIndex++) {
            const progress = stepIndex / steps;
            paintDisc(mask, clearedAgainst, width, height, previousX + (x - previousX) * progress, previousY + (y - previousY) * progress, radius, value);
        }
    });
}

function forEachNeighbour(index, width, height, radius, visit) {
    const x = index % width;
    const y = (index - x) / width;
    for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
            visit(ny * width + nx, dx * dx + dy * dy);
        }
    }
}

/**
 * Điểm giữ lại sát vùng đã xoá là điểm trộn giữa vật và nền (khử răng cưa, nén JPEG).
 * Coi màu quan sát C = a·F + (1 − a)·bg với F là màu vật gần nhất ở phía trong: ước lượng a bằng chiếu C lên đoạn bg→F,
 * rồi khử màu nền C' = (C − (1 − a)·bg) / a để viền không còn quầng màu nền.
 */
function unmixBoundary(rgba, width, height, mask, clearedAgainst) {
    const boundaryBackground = new Int32Array(mask.length).fill(NO_REFERENCE);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (mask[index] !== MASK_OPAQUE || rgba[index * 4 + 3] === 0) continue;
            for (let offsetIndex = 0; offsetIndex < NEIGHBOUR_OFFSETS.length; offsetIndex += 2) {
                const nx = x + NEIGHBOUR_OFFSETS[offsetIndex];
                const ny = y + NEIGHBOUR_OFFSETS[offsetIndex + 1];
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const neighbour = ny * width + nx;
                if (mask[neighbour] === MASK_CLEAR && clearedAgainst[neighbour] !== NO_REFERENCE) {
                    boundaryBackground[index] = clearedAgainst[neighbour];
                    break;
                }
            }
        }
    }

    const recolor = new Map();
    for (let index = 0; index < mask.length; index++) {
        if (boundaryBackground[index] === NO_REFERENCE) continue;
        const background = unpackRgb(boundaryBackground[index]);
        const foreground = nearestInteriorColor(rgba, width, height, mask, boundaryBackground, index, background);
        if (!foreground) continue;
        const offset = index * 4;
        const observed = [rgba[offset], rgba[offset + 1], rgba[offset + 2]];
        const alpha = projectAlpha(observed, foreground, background);
        if (alpha === null || alpha >= 1) continue;
        if (alpha <= MIN_UNMIX_ALPHA) {
            mask[index] = MASK_CLEAR;
            continue;
        }
        mask[index] = Math.round(alpha * MASK_OPAQUE);
        recolor.set(index, packRgb(...observed.map((channel, channelIndex) => clamp(Math.round((channel - (1 - alpha) * background[channelIndex]) / alpha), 0, 255))));
    }

    return recolor;
}

function nearestInteriorColor(rgba, width, height, mask, boundaryBackground, index, background) {
    let best = null;
    let bestDistance = Infinity;
    let bestContrast = -1;
    forEachNeighbour(index, width, height, INTERIOR_SEARCH_RADIUS, (neighbour, distance) => {
        if (mask[neighbour] !== MASK_OPAQUE || boundaryBackground[neighbour] !== NO_REFERENCE || rgba[neighbour * 4 + 3] === 0) return;
        const offset = neighbour * 4;
        const color = [rgba[offset], rgba[offset + 1], rgba[offset + 2]];
        const contrast = squaredRgbDistance(color, background);
        if (distance < bestDistance || (distance === bestDistance && contrast > bestContrast)) {
            best = color;
            bestDistance = distance;
            bestContrast = contrast;
        }
    });

    return best;
}

function squaredRgbDistance(first, second) {
    return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2;
}

/** Trả a ∈ [0, 1], hoặc null khi vật quá giống nền hay C không nằm gần đoạn bg→F (màu riêng của vật, không phải điểm trộn). */
function projectAlpha(observed, foreground, background) {
    const span = [0, 1, 2].map((channel) => foreground[channel] - background[channel]);
    const spanLengthSquared = span[0] ** 2 + span[1] ** 2 + span[2] ** 2;
    if (spanLengthSquared < MIN_UNMIX_CONTRAST_SQUARED) return null;
    const offset = [0, 1, 2].map((channel) => observed[channel] - background[channel]);
    const alpha = clamp((offset[0] * span[0] + offset[1] * span[1] + offset[2] * span[2]) / spanLengthSquared, 0, 1);
    const residual = squaredRgbDistance(offset, span.map((channel) => channel * alpha));

    return residual > MAX_UNMIX_RESIDUAL_SQUARED ? null : alpha;
}

/** Làm mềm chỉ vào phía trong: lấy min(mask, mask đã làm mờ) để viền không lem màu nền ra ngoài. */
function featherInward(mask, width, height, radius) {
    if (radius < 1) return mask;
    const horizontal = new Float32Array(mask.length);
    const window = radius * 2 + 1;
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let dx = -radius; dx <= radius; dx++) sum += mask[row + clamp(x + dx, 0, width - 1)];
            horizontal[row + x] = sum / window;
        }
    }
    const feathered = new Uint8Array(mask.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let dy = -radius; dy <= radius; dy++) sum += horizontal[clamp(y + dy, 0, height - 1) * width + x];
            const index = y * width + x;
            feathered[index] = Math.min(mask[index], Math.round(sum / window));
        }
    }

    return feathered;
}

/**
 * Dựng matte cho một khung RGBA: { alpha (0..255), recolor (chỉ số điểm → màu RGB đóng gói đã khử màu nền), autoRemoved }.
 * seeds 'edges': xoá nền loang từ mép (bỏ qua nếu mép ảnh đã trong suốt sẵn); 'none': không xoá tự động.
 * edits áp theo thứ tự sau lượt tự động, toạ độ chuẩn hoá 0..1 theo ảnh đang xử lý.
 * autoRemoved: số điểm lượt tự động đã xoá, null nếu lượt tự động không chạy.
 */
export function buildMask(rgba, width, height, { tolerance = DEFAULT_TOLERANCE, seeds = 'edges', edits = [], feather = DEFAULT_FEATHER } = {}) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) {
        throw new RangeError('rgba buffer does not match width × height × 4');
    }
    const mask = new Uint8Array(width * height).fill(MASK_OPAQUE);
    const clearedAgainst = new Int32Array(width * height).fill(NO_REFERENCE);
    let autoRemoved = null;

    if (seeds === 'edges' && !hasTransparentEdges(rgba, width, height)) {
        removeEdgeBackground(rgba, width, height, tolerance, mask, clearedAgainst);
        autoRemoved = mask.reduce((count, value) => count + (value === MASK_CLEAR ? 1 : 0), 0);
    }

    for (const edit of edits) {
        if (edit.op === 'wand-remove' || edit.op === 'wand-keep') {
            applyWand(rgba, width, height, edit, mask, clearedAgainst);
        } else if (edit.op === 'brush-remove' || edit.op === 'brush-keep') {
            applyBrush(width, height, edit, mask, clearedAgainst);
        } else {
            throw new RangeError(`Unknown edit op: ${edit.op}`);
        }
    }

    const recolor = unmixBoundary(rgba, width, height, mask, clearedAgainst);
    const featherRadius = Math.round(clamp(Number(feather) || 0, 0, MAX_FEATHER));

    return { alpha: featherInward(mask, width, height, featherRadius), recolor, autoRemoved };
}

/** Áp matte tại chỗ: nhân alpha, thay màu điểm viền đã khử nền, điểm trong suốt hẳn thì RGB = 0. */
export function applyMask(rgba, matte) {
    const { alpha: mask, recolor } = matte;
    for (let index = 0; index < mask.length; index++) {
        const offset = index * 4;
        const alpha = Math.round((rgba[offset + 3] * mask[index]) / MASK_OPAQUE);
        rgba[offset + 3] = alpha;
        if (alpha === 0) {
            rgba[offset] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            continue;
        }
        const packed = recolor.get(index);
        if (packed === undefined) continue;
        [rgba[offset], rgba[offset + 1], rgba[offset + 2]] = unpackRgb(packed);
    }

    return rgba;
}
