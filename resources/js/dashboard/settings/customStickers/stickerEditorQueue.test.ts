import { describe, expect, it } from 'vitest';

import { bulkProgress, createQueue, currentItem, editorQueueReducer, hasLaterItems, remainingCount, summarizeQueue, unsavedCount } from './stickerEditorQueue';
import type { EditorQueueAction, EditorQueueState } from './stickerEditorQueue';

const files = ['a.png', 'b.png', 'c.png', 'd.png'].map(name => new File(['x'], name, { type: 'image/png' }));
const run = (...actions: EditorQueueAction[]): EditorQueueState => actions.reduce(editorQueueReducer, createQueue(files));

describe('hàng chờ trình chỉnh', () => {
    it('lưu, bỏ qua, ảnh trùng dừng lại chờ chọn; hết hàng thì tóm tắt', () => {
        const state = run(
            { type: 'saving' },
            { type: 'saved', stickerId: 11, existing: false },
            { type: 'skip' },
            { type: 'saving' },
            { type: 'saved', stickerId: 5, existing: true },
        );
        expect(currentItem(state)?.file.name).toBe('c.png');
        expect(hasLaterItems(state)).toBe(true);
        expect(unsavedCount(state)).toBe(1);

        const rest: EditorQueueAction[] = [{ type: 'next' }, { type: 'saving' }, { type: 'saved', stickerId: 12, existing: false }];
        const finished = rest.reduce(editorQueueReducer, state);
        expect(finished.finished).toBe(true);
        expect(currentItem(finished)).toBeNull();
        expect(summarizeQueue(finished)).toEqual({ addedIds: [11, 12], existingIds: [5], skipped: 1, failed: [] });
    });

    it('lưu hỏng thì ảnh trở lại chờ chỉnh, không nhảy ảnh', () => {
        const state = run({ type: 'saving' }, { type: 'save-failed' });

        expect(state.index).toBe(0);
        expect(state.items[0].status).toBe('pending');
        expect(unsavedCount(state)).toBe(4);
    });

    it('đóng giữa chừng: ảnh chưa lưu tính là bỏ qua', () => {
        const state = run({ type: 'saving' }, { type: 'saved', stickerId: 1, existing: false });

        expect(summarizeQueue(state)).toEqual({ addedIds: [1], existingIds: [], skipped: 3, failed: [] });
    });

    it('Lưu tất cả: chỉ lấy ảnh chưa lưu từ ảnh đang chỉnh trở đi, đếm tiến độ, trùng và lỗi vào tóm tắt', () => {
        const state = run({ type: 'skip' }, { type: 'bulk-start' }, { type: 'bulk-saving', index: 1 }, { type: 'bulk-saved', index: 1, stickerId: 7, existing: false });

        expect(state.bulkIndexes).toEqual([1, 2, 3]);
        expect(bulkProgress(state)).toEqual({ done: 1, total: 3 });

        const finished = [
            { type: 'bulk-saving', index: 2 },
            { type: 'bulk-saved', index: 2, stickerId: 3, existing: true },
            { type: 'bulk-saving', index: 3 },
            { type: 'bulk-failed', index: 3, error: 'Ảnh hỏng' },
            { type: 'bulk-finish' },
        ].reduce((current, action) => editorQueueReducer(current, action as EditorQueueAction), state);

        expect(finished.finished).toBe(true);
        expect(bulkProgress(finished)).toBeNull();
        expect(summarizeQueue(finished)).toEqual({ addedIds: [7], existingIds: [3], skipped: 1, failed: [{ name: 'd.png', error: 'Ảnh hỏng' }] });
    });

    it('số ảnh còn lại tính cả ảnh đang chỉnh, bỏ ảnh đã xử lý', () => {
        expect(remainingCount(run())).toBe(4);
        expect(remainingCount(run({ type: 'saving' }, { type: 'saved', stickerId: 1, existing: false }, { type: 'skip' }))).toBe(2);
    });
});
