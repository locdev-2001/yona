export const DEFAULT_STROKE_WIDTH = 0.03;
export const MAX_STROKE_WIDTH = 0.08;
const CHANNELS = 4;
const FAR_DISTANCE = 1e20;

/** Biến đổi khoảng cách bình phương một chiều bằng bao dưới các parabol, O(n). */
function distanceLine(values, length, vertices, boundaries, output) {
    let last = 0;
    vertices[0] = 0;
    boundaries[0] = -Infinity;
    boundaries[1] = Infinity;
    for (let position = 1; position < length; position++) {
        let intersection;
        do {
            const previous = vertices[last];
            intersection = ((values[position] + position * position) - (values[previous] + previous * previous)) / (2 * (position - previous));
            if (intersection > boundaries[last]) break;
            last--;
        } while (last >= 0);
        last++;
        vertices[last] = position;
        boundaries[last] = intersection;
        boundaries[last + 1] = Infinity;
    }
    last = 0;
    for (let position = 0; position < length; position++) {
        while (boundaries[last + 1] < position) last++;
        const delta = position - vertices[last];
        output[position] = delta * delta + values[vertices[last]];
    }
}

function alphaDistances(rgba, side) {
    const distances = new Float64Array(side * side);
    const values = new Float64Array(side);
    const output = new Float64Array(side);
    const vertices = new Int32Array(side);
    const boundaries = new Float64Array(side + 1);
    for (let row = 0; row < side; row++) {
        for (let column = 0; column < side; column++) {
            const alpha = rgba[(row * side + column) * CHANNELS + 3] / 255;
            values[column] = alpha > 0 ? (1 - alpha) ** 2 : FAR_DISTANCE;
        }
        distanceLine(values, side, vertices, boundaries, output);
        distances.set(output, row * side);
    }
    for (let column = 0; column < side; column++) {
        for (let row = 0; row < side; row++) values[row] = distances[row * side + column];
        distanceLine(values, side, vertices, boundaries, output);
        for (let row = 0; row < side; row++) distances[row * side + column] = output[row];
    }

    return distances;
}

function strokeFrame(frame, sourceSide, side, padding, radius) {
    const rgba = new Uint8ClampedArray(side * side * CHANNELS);
    for (let row = 0; row < sourceSide; row++) {
        rgba.set(frame.subarray(row * sourceSide * CHANNELS, (row + 1) * sourceSide * CHANNELS), ((row + padding) * side + padding) * CHANNELS);
    }
    const distances = alphaDistances(rgba, side);
    for (let index = 0; index < distances.length; index++) {
        const offset = index * CHANNELS;
        const sourceAlpha = rgba[offset + 3] / 255;
        if (sourceAlpha === 1) continue;
        const strokeAlpha = Math.max(0, Math.min(1, radius + 0.5 - Math.sqrt(distances[index])));
        const behindAlpha = strokeAlpha * (1 - sourceAlpha);
        const combinedAlpha = sourceAlpha + behindAlpha;
        if (combinedAlpha === 0) {
            rgba.fill(0, offset, offset + CHANNELS);
            continue;
        }
        for (let channel = 0; channel < 3; channel++) {
            rgba[offset + channel] = Math.round((rgba[offset + channel] * sourceAlpha + 255 * behindAlpha) / combinedAlpha);
        }
        rgba[offset + 3] = Math.round(combinedAlpha * 255);
    }

    return rgba;
}

/** Cùng lề cho mọi khung; độ dày tính theo cạnh đầu ra, gồm cả lề mới. */
export function addWhiteStroke(frames, sourceSide, strokeWidth = 0) {
    if (strokeWidth === 0) return { frames, side: sourceSide, padding: 0 };
    if (!Number.isFinite(strokeWidth) || strokeWidth < 0 || strokeWidth > MAX_STROKE_WIDTH) {
        throw new RangeError('strokeWidth is outside the supported range');
    }
    const padding = Math.ceil((sourceSide * strokeWidth + 1) / (1 - 2 * strokeWidth));
    const side = sourceSide + 2 * padding;
    const radius = side * strokeWidth;

    return { frames: frames.map(frame => strokeFrame(frame, sourceSide, side, padding, radius)), side, padding };
}
