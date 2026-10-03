import { DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';
import { FIT_CONTAIN } from 'sticker-renderer/image/sticker-geometry.mjs';

import { pixelsToCanvas } from './stickerCanvas';
import { clampCrop, fitCrop, subjectCrop } from './stickerEdit';
import type { CropSquare, ImageSize, SourceEdit, StickerDraft, StickerEdit, StickerFraming } from './stickerEdit';
import type { LoadedStickerSource } from './stickerMaskRender';
import type { StickerMaskRunner } from './stickerMaskRunner';
import { decodeStickerSource } from './stickerSourceImage';

// Mở một ảnh cho trình chỉnh: giải mã, nạp vào bộ tách nền rồi dựng bản nháp đầu tiên.
// Ảnh mới lấy khung mặc định và không xoá nền; sticker đã lưu dựng lại đúng bản nháp
// từ `edit` máy chủ giữ. Lưu hàng loạt cũng mở ảnh qua đây để ra cùng khung mặc định.

// `edit` đã lưu của sticker: máy chủ chỉ giữ khoá đã gửi, khoá vắng mặt dùng mặc định
// của trình dựng (null = không chỉnh: cả ảnh, xoá nền).
export type SavedStickerEdit = Partial<StickerEdit>;

const RENDERER_DEFAULT_REMOVE_BACKGROUND = true;

export interface EditableSource {
    size: ImageSize;
    sourceCanvas: HTMLCanvasElement | null;
    loaded: LoadedStickerSource;
}

export interface OpenedStickerSource {
    source: EditableSource;
    initialDraft: StickerDraft;
}

/** Ảnh động không giải mã được từng khung, hoặc các vật chính không cùng lọt một ô vuông trong ảnh: lấy cả ảnh. */
function defaultFraming(loaded: LoadedStickerSource): StickerFraming {
    if (loaded.animationUnavailable) return 'fit';
    const large = loaded.subject.largeSubject;

    return large && Math.max(large.width, large.height) > Math.min(loaded.width, loaded.height) ? 'fit' : 'subject';
}

export function newStickerDraft(loaded: LoadedStickerSource): StickerDraft {
    const size = { width: loaded.width, height: loaded.height };
    const framing = defaultFraming(loaded);

    return {
        framing,
        crop: framing === 'fit' ? fitCrop(size) : subjectCrop(loaded.subject.subject, size),
        removeBackground: false,
        strokeWidth: 0,
        tolerance: DEFAULT_TOLERANCE,
        edits: [],
    };
}

const sameCrop = (first: CropSquare, second: CropSquare) => first.left === second.left && first.top === second.top && first.side === second.side;

// Không có crop là cả ảnh đặt cover vào ô vuông, tức ô vuông cạnh ngắn ở giữa ảnh.
function savedCrop(saved: SavedStickerEdit, size: ImageSize): CropSquare {
    if (!saved.crop) {
        const side = Math.min(size.width, size.height);

        return { side, left: Math.floor((size.width - side) / 2), top: Math.floor((size.height - side) / 2) };
    }

    return clampCrop(
        { left: Math.round(saved.crop.x * size.width), top: Math.round(saved.crop.y * size.height), side: Math.round(saved.crop.w * size.width) },
        size,
    );
}

function savedFraming(saved: SavedStickerEdit, crop: CropSquare, size: ImageSize): StickerFraming {
    if (saved.crop && saved.fit !== FIT_CONTAIN) return 'subject';

    return sameCrop(crop, fitCrop(size)) ? 'fit' : 'custom';
}

/** Chiều ngược của toStickerEdit: nét chỉnh lưu theo vùng lấy, bản nháp giữ theo ảnh gốc. */
export function restoredStickerDraft(saved: SavedStickerEdit | null, size: ImageSize): StickerDraft {
    const edit = saved ?? {};
    const crop = savedCrop(edit, size);
    const tolerance = edit.tolerance ?? DEFAULT_TOLERANCE;
    const toSource = ([x, y]: [number, number]): [number, number] => [(x * crop.side + crop.left) / size.width, (y * crop.side + crop.top) / size.height];
    const edits: SourceEdit[] = (edit.edits ?? []).map(operation => {
        if ('points' in operation) {
            return { op: operation.op, points: operation.points.map(toSource), radius: (operation.radius * crop.side) / Math.max(size.width, size.height) };
        }
        const [x, y] = toSource([operation.x, operation.y]);

        return { op: operation.op, x, y, tolerance: operation.tolerance ?? tolerance };
    });

    return {
        framing: savedFraming(edit, crop, size),
        crop,
        removeBackground: edit.removeBackground ?? RENDERER_DEFAULT_REMOVE_BACKGROUND,
        strokeWidth: edit.strokeWidth ?? 0,
        tolerance,
        edits,
    };
}

/** `restore` có mặt = mở lại sticker đã lưu với `edit` của nó. */
export async function openStickerSource(file: File, runner: StickerMaskRunner, restore?: { edit: SavedStickerEdit | null }): Promise<OpenedStickerSource> {
    const decoded = await decodeStickerSource(file);
    const loaded = await runner.load(
        decoded.animated
            ? { kind: 'animation', bytes: decoded.bytes, type: file.type || 'image/gif', firstFrame: decoded.pixels }
            : { kind: 'still', pixels: decoded.pixels },
    );
    const size = { width: loaded.width, height: loaded.height };

    return {
        source: { size, sourceCanvas: pixelsToCanvas({ ...size, rgba: loaded.firstFrame }), loaded },
        initialDraft: restore ? restoredStickerDraft(restore.edit, size) : newStickerDraft(loaded),
    };
}
