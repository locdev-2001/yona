import { describe, expect, it } from 'vitest';

import { toStickerEdit } from './stickerEdit';
import type { StickerDraft } from './stickerEdit';
import { restoredStickerDraft } from './stickerEditableSource';

const SIZE = { width: 200, height: 100 };

describe('dựng lại bản nháp từ edit đã lưu', () => {
    it('đi một vòng bản nháp → edit → bản nháp ra lại đúng edit đã lưu', () => {
        const draft: StickerDraft = {
            framing: 'custom',
            crop: { left: 40, top: -20, side: 120 },
            removeBackground: true,
            tolerance: 35,
            strokeWidth: 0.03,
            edits: [
                { op: 'wand-remove', x: 0.5, y: 0.4, tolerance: 35 },
                { op: 'brush-keep', points: [[0.3, 0.3], [0.5, 0.6]], radius: 0.05 },
            ],
        };
        const saved = toStickerEdit(draft, SIZE);

        const restored = restoredStickerDraft(saved, SIZE);

        expect(restored).toMatchObject({ framing: 'custom', crop: draft.crop, removeBackground: true, tolerance: 35 });
        expect(toStickerEdit(restored, SIZE)).toEqual(saved);
    });

    it('khung cover là Ôm chủ thể, khung bằng cả ảnh theo cạnh dài là Vừa khung', () => {
        const subject = restoredStickerDraft({ crop: { x: 0.25, y: 0.1, w: 0.4, h: 0.8 } }, SIZE);
        const fit = restoredStickerDraft({ crop: { x: 0, y: -0.5, w: 1, h: 2 }, fit: 'contain' }, SIZE);

        expect(subject).toMatchObject({ framing: 'subject', crop: { left: 50, top: 10, side: 80 } });
        expect(fit).toMatchObject({ framing: 'fit', crop: { left: 0, top: -50, side: 200 } });
    });

    it('sticker cũ không có edit: cả ảnh cover vào ô vuông, xoá nền như mặc định của trình dựng', () => {
        expect(restoredStickerDraft(null, SIZE)).toEqual({
            framing: 'custom',
            crop: { left: 50, top: 0, side: 100 },
            removeBackground: true,
            tolerance: 20,
            strokeWidth: 0,
            edits: [],
        });
    });
});
