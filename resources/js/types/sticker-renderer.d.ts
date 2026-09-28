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
