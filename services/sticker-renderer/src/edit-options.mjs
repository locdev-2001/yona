import { DEFAULT_FEATHER, DEFAULT_TOLERANCE, EDIT_OPERATIONS, MAX_FEATHER } from './image/background-mask.mjs';
import { RenderError } from './render-error.mjs';

const MAX_EDITS = 500;
const MAX_BRUSH_POINTS = 5000;
const MAX_BRUSH_RADIUS = 1;
const MIN_CROP_SIDE = 1e-4;

export const DEFAULT_EDIT = Object.freeze({
    crop: null,
    removeBackground: true,
    tolerance: DEFAULT_TOLERANCE,
    feather: DEFAULT_FEATHER,
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
    const x = numberInRange(crop.x, 0, 1, 'crop.x');
    const y = numberInRange(crop.y, 0, 1, 'crop.y');
    const w = numberInRange(crop.w, MIN_CROP_SIDE, 1, 'crop.w');
    const h = numberInRange(crop.h, MIN_CROP_SIDE, 1, 'crop.h');
    if (x + w > 1 + 1e-6 || y + h > 1 + 1e-6) throw invalid('crop exceeds image bounds');

    return { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
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
        removeBackground: rawEdit.removeBackground ?? DEFAULT_EDIT.removeBackground,
        tolerance: rawEdit.tolerance === undefined ? DEFAULT_EDIT.tolerance : numberInRange(rawEdit.tolerance, 0, 100, 'tolerance'),
        feather: rawEdit.feather === undefined ? DEFAULT_EDIT.feather : numberInRange(rawEdit.feather, 0, MAX_FEATHER, 'feather'),
        edits: edits.map(parseEditOperation),
    };
}
