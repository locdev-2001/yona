// Kiểu cho lõi xoá nền dùng chung với renderer sticker (ESM thuần, không có d.ts).
declare module 'sticker-renderer/image/background-mask.mjs' {
    export type BackgroundMaskEdit =
        | { op: 'wand-remove' | 'wand-keep'; x: number; y: number; tolerance?: number }
        | { op: 'brush-remove' | 'brush-keep'; points: [number, number][]; radius: number };

    export interface BackgroundMaskOptions {
        tolerance?: number;
        seeds?: 'edges' | 'none';
        edits?: readonly BackgroundMaskEdit[];
        feather?: number;
    }

    export interface BackgroundMatte {
        alpha: Uint8Array;
        recolor: Map<number, number>;
        autoRemoved: number | null;
    }

    export const DEFAULT_TOLERANCE: number;
    export const DEFAULT_FEATHER: number;
    export const MAX_FEATHER: number;
    export const EDIT_OPERATIONS: readonly BackgroundMaskEdit['op'][];

    export function buildMask(
        rgba: Uint8Array | Uint8ClampedArray,
        width: number,
        height: number,
        options?: BackgroundMaskOptions,
    ): BackgroundMatte;

    export function applyMask<T extends Uint8Array | Uint8ClampedArray>(rgba: T, matte: BackgroundMatte): T;
}

// Hình học vùng lấy + đặt lên ô vuông, dùng chung bản xem trước và renderer.
declare module 'sticker-renderer/image/sticker-geometry.mjs' {
    export interface GeometryRect {
        left: number;
        top: number;
        width: number;
        height: number;
    }

    export interface NormalizedCropRect {
        x: number;
        y: number;
        w: number;
        h: number;
    }

    export type FitMode = 'cover' | 'contain';

    export interface SquareLayout {
        side: number;
        offsetX: number;
        offsetY: number;
        source: GeometryRect;
    }

    export const FIT_COVER: 'cover';
    export const FIT_CONTAIN: 'contain';
    export const FIT_MODES: readonly FitMode[];
    export const DEFAULT_FIT: FitMode;
    export const COVER_PADDING_RATIO: number;
    export const MAX_CROP_OVERFLOW: number;
    export const MIN_CROP_SIDE: number;
    export const CROP_BOUND_EPSILON: number;

    export function cropGeometry(crop: NormalizedCropRect | null, width: number, height: number): { frame: GeometryRect; region: GeometryRect };
    export function editsInRegion<T extends import('sticker-renderer/image/background-mask.mjs').BackgroundMaskEdit>(
        edits: readonly T[],
        frame: GeometryRect,
        region: GeometryRect,
    ): T[];
    export function opaqueBounds(frames: readonly (Uint8Array | Uint8ClampedArray)[], width: number, height: number): GeometryRect | null;
    export function squareLayout(fit: FitMode | undefined, frame: GeometryRect, region: GeometryRect, bounds: GeometryRect | null): SquareLayout;
    export function containAreaRatio(fit: FitMode | undefined, crop: NormalizedCropRect | null, width: number, height: number): number;
}

// Renderer ở Node (sharp); chỉ test so khớp bản xem trước với kết quả dựng thật mới nạp.
declare module 'sticker-renderer/image/sticker-image.mjs' {
    export interface RenderedStickerImage {
        stickerWebp: Uint8Array;
        staticPng: Uint8Array;
        outboundGif: Uint8Array;
        details: { width: number; height: number; staticSize: number; frames: number; durationMs: number; warnings: string[] };
    }

    export function renderStickerImage(
        inputBytes: Uint8Array,
        edit: {
            crop: import('sticker-renderer/image/sticker-geometry.mjs').NormalizedCropRect | null;
            fit?: import('sticker-renderer/image/sticker-geometry.mjs').FitMode;
            removeBackground: boolean;
            tolerance: number;
            feather: number;
            edits: readonly import('sticker-renderer/image/background-mask.mjs').BackgroundMaskEdit[];
        },
        options: { size: number; staticSize?: number },
    ): Promise<RenderedStickerImage>;
}
