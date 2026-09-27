import { gunzipSync } from 'node:zlib';
import { RenderError } from './render-error.mjs';

const MAX_DECOMPRESSED_BYTES = 4 * 1024 * 1024;
const GZIP_MAGIC = [0x1f, 0x8b];
const POSTER_MARKER_NAME = 'poster';

function isGzip(bytes) {
    return bytes.length >= GZIP_MAGIC.length && GZIP_MAGIC.every((byte, index) => bytes[index] === byte);
}

function decompressGzip(bytes) {
    try {
        return gunzipSync(bytes, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
    } catch (error) {
        if (error.code === 'ERR_BUFFER_TOO_LARGE') {
            throw new RenderError('input_too_large');
        }
        throw new RenderError('invalid_gzip', error.message);
    }
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function assertLottieShape(document) {
    const isObject = document !== null && typeof document === 'object' && !Array.isArray(document);
    const hasTimeline = isObject
        && isFiniteNumber(document.fr) && document.fr > 0
        && isFiniteNumber(document.ip) && isFiniteNumber(document.op) && document.op > document.ip;
    const hasCanvas = isObject
        && isFiniteNumber(document.w) && document.w > 0
        && isFiniteNumber(document.h) && document.h > 0
        && Array.isArray(document.layers);

    if (!hasTimeline || !hasCanvas) {
        throw new RenderError('invalid_lottie');
    }
}

export function decodeLottie(inputBytes) {
    const jsonBytes = isGzip(inputBytes) ? decompressGzip(inputBytes) : inputBytes;
    if (jsonBytes.length > MAX_DECOMPRESSED_BYTES) {
        throw new RenderError('input_too_large');
    }

    const json = jsonBytes.toString('utf8');
    let document;
    try {
        document = JSON.parse(json);
    } catch (error) {
        throw new RenderError('invalid_json', error.message);
    }
    assertLottieShape(document);

    return { json, document };
}

function findPosterMarker(document) {
    const markers = Array.isArray(document.markers) ? document.markers : [];

    return markers.find((marker) => typeof marker?.cm === 'string'
        && marker.cm.trim().toLowerCase() === POSTER_MARKER_NAME
        && isFiniteNumber(marker.tm));
}

export function choosePosterFrame(document) {
    const middleFrame = Math.floor((document.ip + document.op) / 2);
    const posterMarker = findPosterMarker(document);

    if (!posterMarker) {
        return { frame: middleFrame, warnings: ['poster_marker_missing'] };
    }
    if (posterMarker.tm < document.ip || posterMarker.tm >= document.op) {
        return { frame: middleFrame, warnings: ['poster_marker_out_of_range'] };
    }

    return { frame: posterMarker.tm, warnings: [] };
}
