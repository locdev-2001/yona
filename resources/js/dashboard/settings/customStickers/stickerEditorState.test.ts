import { describe, expect, it } from 'vitest';

import { MAX_BRUSH_STROKE_POINTS } from './stickerEdit';
import type { StickerDraft } from './stickerEdit';
import { createEditorState, NUDGE_MERGE_MS, stickerEditorReducer } from './stickerEditorState';
import type { StickerEditorAction, StickerEditorState } from './stickerEditorState';

const INITIAL: StickerDraft = { framing: 'subject', crop: { left: 0, top: 0, side: 100 }, removeBackground: true, tolerance: 20, edits: [] };

const run = (...actions: StickerEditorAction[]): StickerEditorState =>
    actions.reduce(stickerEditorReducer, createEditorState(INITIAL));

describe('trạng thái trình chỉnh sticker', () => {
    it('đũa thần lấy dung sai hiện tại, hoàn tác bỏ đúng lần bấm cuối', () => {
        const afterTwoClicks = run(
            { type: 'wand', op: 'wand-remove', x: 0.2, y: 0.2 },
            { type: 'set-tolerance', tolerance: 35 },
            { type: 'wand', op: 'wand-keep', x: 0.5, y: 0.5 },
        );
        expect(afterTwoClicks.draft.edits).toEqual([
            { op: 'wand-remove', x: 0.2, y: 0.2, tolerance: 20 },
            { op: 'wand-keep', x: 0.5, y: 0.5, tolerance: 35 },
        ]);

        const undone = stickerEditorReducer(afterTwoClicks, { type: 'undo' });
        expect(undone.draft.edits).toEqual([{ op: 'wand-remove', x: 0.2, y: 0.2, tolerance: 20 }]);
        expect(undone.draft.tolerance).toBe(35);
    });

    it('một lượt kéo thanh dung sai là một bước hoàn tác', () => {
        const state = run(
            { type: 'set-tolerance', tolerance: 25 },
            { type: 'set-tolerance', tolerance: 30 },
            { type: 'set-tolerance', tolerance: 42 },
        );
        expect(state.undoStack).toHaveLength(1);
        expect(stickerEditorReducer(state, { type: 'undo' }).draft.tolerance).toBe(20);
    });

    it('một nét cọ là một bước hoàn tác dù nhiều điểm', () => {
        const state = run(
            { type: 'brush-start', op: 'brush-remove', point: [0.1, 0.1], radius: 0.02 },
            { type: 'brush-extend', point: [0.2, 0.1] },
            { type: 'brush-extend', point: [0.3, 0.1] },
        );
        expect(state.draft.edits).toEqual([{ op: 'brush-remove', points: [[0.1, 0.1], [0.2, 0.1], [0.3, 0.1]], radius: 0.02 }]);
        expect(stickerEditorReducer(state, { type: 'undo' }).draft.edits).toEqual([]);
    });

    it('nét cọ quá dài tách sang nét mới nối tiếp, vẫn cùng một bước hoàn tác', () => {
        const extensions: StickerEditorAction[] = Array.from({ length: MAX_BRUSH_STROKE_POINTS }, (_, index) => ({
            type: 'brush-extend',
            point: [index / MAX_BRUSH_STROKE_POINTS, 0.5],
        }));
        const state = run({ type: 'brush-start', op: 'brush-keep', point: [0, 0.5], radius: 0.01 }, ...extensions);

        expect(state.draft.edits).toHaveLength(2);
        expect('points' in state.draft.edits[0] && state.draft.edits[0].points).toHaveLength(MAX_BRUSH_STROKE_POINTS);
        expect(state.undoStack).toHaveLength(1);
    });

    it('kéo khung chỉ ghi một bước khi thả tay, chuyển sang Tuỳ chỉnh; chạm không kéo thì không ghi', () => {
        const moved = run(
            { type: 'crop-change', crop: { left: 10, top: 0, side: 100 } },
            { type: 'crop-change', crop: { left: 20, top: 5, side: 90 } },
            { type: 'crop-commit' },
        );
        expect(moved.draft).toMatchObject({ framing: 'custom', crop: { left: 20, top: 5, side: 90 } });
        expect(moved.undoStack).toHaveLength(1);
        expect(stickerEditorReducer(moved, { type: 'undo' }).draft).toEqual(INITIAL);

        const tapped = run({ type: 'crop-change', crop: INITIAL.crop }, { type: 'crop-commit' });
        expect(tapped.undoStack).toHaveLength(0);
        expect(tapped.draft).toEqual(INITIAL);
    });

    it('phím mũi tên liền nhau gộp một bước; cách nhau quá lâu thì tách bước', () => {
        const nudged = run(
            { type: 'crop-nudge', crop: { left: 1, top: 0, side: 100 }, at: 1000 },
            { type: 'crop-nudge', crop: { left: 2, top: 0, side: 100 }, at: 1100 },
            { type: 'crop-nudge', crop: { left: 3, top: 0, side: 100 }, at: 1200 },
        );
        expect(nudged.undoStack).toHaveLength(1);

        const later = stickerEditorReducer(nudged, { type: 'crop-nudge', crop: { left: 4, top: 0, side: 100 }, at: 1200 + NUDGE_MERGE_MS + 1 });
        expect(later.undoStack).toHaveLength(2);
    });

    it('làm lại lấy lại bước vừa hoàn tác; thao tác mới xoá ngăn làm lại', () => {
        const undone = run({ type: 'wand', op: 'wand-remove', x: 0.2, y: 0.2 }, { type: 'undo' });
        expect(undone.redoStack).toHaveLength(1);

        const redone = stickerEditorReducer(undone, { type: 'redo' });
        expect(redone.draft.edits).toHaveLength(1);

        expect(stickerEditorReducer(undone, { type: 'set-remove-background', enabled: false }).redoStack).toHaveLength(0);
    });

    it('đổi cách lấy vùng là một bước hoàn tác', () => {
        const fitted = run({ type: 'set-framing', framing: 'fit', crop: { left: 0, top: -50, side: 200 } });
        expect(fitted.draft).toMatchObject({ framing: 'fit', crop: { left: 0, top: -50, side: 200 } });
        expect(stickerEditorReducer(fitted, { type: 'undo' }).draft).toEqual(INITIAL);
    });

    it('dùng ảnh gốc tắt xoá nền, bỏ mọi nét chỉnh, dung sai về mặc định; hoàn tác lấy lại', () => {
        const edited = run({ type: 'set-tolerance', tolerance: 60 }, { type: 'wand', op: 'wand-remove', x: 0.2, y: 0.2 }, { type: 'use-original' });
        expect(edited.draft).toMatchObject({ removeBackground: false, edits: [], tolerance: 20 });

        expect(stickerEditorReducer(edited, { type: 'undo' }).draft).toMatchObject({
            removeBackground: true,
            tolerance: 60,
            edits: [{ op: 'wand-remove', x: 0.2, y: 0.2, tolerance: 60 }],
        });
    });

    it('hoàn tác khi chưa có bước nào thì giữ nguyên', () => {
        const state = createEditorState(INITIAL);
        expect(stickerEditorReducer(state, { type: 'undo' })).toBe(state);
    });
});
