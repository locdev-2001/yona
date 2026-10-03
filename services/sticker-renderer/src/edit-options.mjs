import { MAX_STROKE_WIDTH } from './image/white-stroke.mjs';
import { DEFAULT_FEATHER, DEFAULT_TOLERANCE, EDIT_OPERATIONS, MAX_FEATHER } from './image/background-mask.mjs';
import { RenderError } from './render-error.mjs';
import { CROP_BOUND_EPSILON, DEFAULT_FIT, FIT_MODES, MAX_CROP_OVERFLOW, MIN_CROP_SIDE } from './image/sticker-geometry.mjs';

const MAX_EDITS = 500;
const MAX_BRUSH_POINTS = 5000;
const MAX_BRUSH_RADIUS = 1;

export const DEFAULT_EDIT = Object.freeze({
    crop: null,
    fit: DEFAULT_FIT,
    removeBackground: true,
    tolerance: DEFAULT_TOLERANCE,
    feather: DEFAULT_FEATHER,
    strokeWidth: 0,
    edits: Object.freeze([]),
});

function invalid(detail) {
    return new RenderError('usage', `Invalid edit: ${detail}`);
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberInRange(value, min, max, field) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw invalid(`${field} must be a number in [${min}, ${max}]`);
    }

    return value;
}

function parseCrop(crop) {
    if (crop === null || crop === undefined) return null;
    if (!isPlainObject(crop)) throw invalid('crop must be an object or null');
    const x = numberInRange(crop.x, -MAX_CROP_OVERFLOW, 1, 'crop.x');
    const y = numberInRange(crop.y, -MAX_CROP_OVERFLOW, 1, 'crop.y');
    const w = numberInRange(crop.w, MIN_CROP_SIDE, 1 + 2 * MAX_CROP_OVERFLOW, 'crop.w');
    const h = numberInRange(crop.h, MIN_CROP_SIDE, 1 + 2 * MAX_CROP_OVERFLOW, 'crop.h');
    if (x + w > 1 + MAX_CROP_OVERFLOW + CROP_BOUND_EPSILON || y + h > 1 + MAX_CROP_OVERFLOW + CROP_BOUND_EPSILON) {
        throw invalid(`crop overflows the image by more than ${MAX_CROP_OVERFLOW}`);
    }
    if (x >= 1 || y >= 1 || x + w <= 0 || y + h <= 0) throw invalid('crop does not overlap the image');

    return { x, y, w, h };
}

function parseFit(fit) {
    if (fit === undefined) return DEFAULT_FIT;
    if (!FIT_MODES.includes(fit)) throw invalid(`fit must be one of ${FIT_MODES.join(', ')}`);

    return fit;
}

function parsePoint(point, field) {
    if (!Array.isArray(point) || point.length !== 2) throw invalid(`${field} must be [x, y]`);

    return [numberInRange(point[0], 0, 1, `${field}[0]`), numberInRange(point[1], 0, 1, `${field}[1]`)];
}

function parseEditOperation(edit, index) {
    const field = `edits[${index}]`;
    if (!isPlainObject(edit) || !EDIT_OPERATIONS.includes(edit.op)) {
        throw invalid(`${field}.op must be one of ${EDIT_OPERATIONS.join(', ')}`);
    }
    if (edit.op.startsWith('wand-')) {
        return {
            op: edit.op,
            x: numberInRange(edit.x, 0, 1, `${field}.x`),
            y: numberInRange(edit.y, 0, 1, `${field}.y`),
            tolerance: edit.tolerance === undefined ? DEFAULT_TOLERANCE : numberInRange(edit.tolerance, 0, 100, `${field}.tolerance`),
        };
    }
    if (!Array.isArray(edit.points) || edit.points.length === 0 || edit.points.length > MAX_BRUSH_POINTS) {
        throw invalid(`${field}.points must hold 1..${MAX_BRUSH_POINTS} points`);
    }

    return {
        op: edit.op,
        points: edit.points.map((point, pointIndex) => parsePoint(point, `${field}.points[${pointIndex}]`)),
        radius: numberInRange(edit.radius, 0, MAX_BRUSH_RADIUS, `${field}.radius`),
    };
}

/** Kiểm và chuẩn hoá edit.json; thiếu khoá nào thì dùng mặc định của khoá đó. */
export function parseEdit(rawEdit) {
    if (!isPlainObject(rawEdit)) throw invalid('root must be an object');
    const edits = rawEdit.edits ?? [];
    if (!Array.isArray(edits) || edits.length > MAX_EDITS) throw invalid(`edits must be an array of at most ${MAX_EDITS}`);
    if (rawEdit.removeBackground !== undefined && typeof rawEdit.removeBackground !== 'boolean') {
        throw invalid('removeBackground must be boolean');
    }

    return {
        crop: parseCrop(rawEdit.crop),
        fit: parseFit(rawEdit.fit),
        removeBackground: rawEdit.removeBackground ?? DEFAULT_EDIT.removeBackground,
        tolerance: rawEdit.tolerance === undefined ? DEFAULT_EDIT.tolerance : numberInRange(rawEdit.tolerance, 0, 100, 'tolerance'),
        feather: rawEdit.feather === undefined ? DEFAULT_EDIT.feather : numberInRange(rawEdit.feather, 0, MAX_FEATHER, 'feather'),
        strokeWidth: rawEdit.strokeWidth === undefined ? 0 : numberInRange(rawEdit.strokeWidth, 0, MAX_STROKE_WIDTH, 'strokeWidth'),
        edits: edits.map(parseEditOperation),
    };
}
