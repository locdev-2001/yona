// Hàng chờ ảnh của trình chỉnh: ảnh đang chỉnh, kết quả từng ảnh và bảng tóm tắt khi hết hàng.
// Lưu tất cả chạy từng ảnh còn lại theo thứ tự; ảnh trùng hay lỗi không dừng lượt lưu.

export type QueueItemStatus = 'pending' | 'saving' | 'saved' | 'existing' | 'skipped' | 'failed';

export interface QueueItem {
    file: File;
    status: QueueItemStatus;
    stickerId: number | null;
    error: string | null;
}

export interface EditorQueueState {
    items: QueueItem[];
    index: number;
    finished: boolean;
    // Ảnh của lượt Lưu tất cả đang chạy, theo thứ tự lưu; null = đang chỉnh từng ảnh.
    bulkIndexes: number[] | null;
}

export interface EditorQueueSummary {
    addedIds: number[];
    existingIds: number[];
    skipped: number;
    failed: { name: string; error: string }[];
}

export type EditorQueueAction =
    | { type: 'saving' }
    | { type: 'save-failed' }
    | { type: 'saved'; stickerId: number; existing: boolean }
    | { type: 'skip' }
    | { type: 'next' }
    | { type: 'bulk-start' }
    | { type: 'bulk-saving'; index: number }
    | { type: 'bulk-saved'; index: number; stickerId: number; existing: boolean }
    | { type: 'bulk-failed'; index: number; error: string }
    | { type: 'bulk-finish' };

export function createQueue(files: readonly File[]): EditorQueueState {
    return {
        items: files.map(file => ({ file, status: 'pending', stickerId: null, error: null })),
        index: 0,
        finished: files.length === 0,
        bulkIndexes: null,
    };
}

const withItem = (state: EditorQueueState, index: number, changes: Partial<QueueItem>): QueueItem[] =>
    state.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item));

const withCurrent = (state: EditorQueueState, changes: Partial<QueueItem>): QueueItem[] => withItem(state, state.index, changes);

const isUnsaved = (item: QueueItem) => item.status === 'pending' || item.status === 'saving';

function moveToNextPending(state: EditorQueueState, items: QueueItem[]): EditorQueueState {
    const next = items.findIndex((item, index) => index > state.index && item.status === 'pending');

    return next === -1 ? { ...state, items, finished: true } : { ...state, items, index: next };
}

export function editorQueueReducer(state: EditorQueueState, action: EditorQueueAction): EditorQueueState {
    if (state.finished) return state;
    switch (action.type) {
        case 'saving':
            return { ...state, items: withCurrent(state, { status: 'saving' }) };
        case 'save-failed':
            return { ...state, items: withCurrent(state, { status: 'pending' }) };
        case 'saved': {
            const items = withCurrent(state, { status: action.existing ? 'existing' : 'saved', stickerId: action.stickerId });
            // Ảnh trùng dừng lại để người dùng chọn cập nhật nhãn cho sticker cũ hay bỏ qua.
            return action.existing ? { ...state, items } : moveToNextPending(state, items);
        }
        case 'skip':
            return moveToNextPending(state, withCurrent(state, { status: state.items[state.index].status === 'existing' ? 'existing' : 'skipped' }));
        case 'next':
            return moveToNextPending(state, state.items);
        case 'bulk-start': {
            if (state.bulkIndexes) return state;
            const bulkIndexes = state.items.flatMap((item, index) => (index >= state.index && item.status === 'pending' ? [index] : []));

            return { ...state, bulkIndexes };
        }
        case 'bulk-saving':
            return { ...state, index: action.index, items: withItem(state, action.index, { status: 'saving' }) };
        case 'bulk-saved':
            return { ...state, items: withItem(state, action.index, { status: action.existing ? 'existing' : 'saved', stickerId: action.stickerId }) };
        case 'bulk-failed':
            return { ...state, items: withItem(state, action.index, { status: 'failed', error: action.error }) };
        case 'bulk-finish':
            return { ...state, finished: true, bulkIndexes: null };
    }
}

export const currentItem = (state: EditorQueueState): QueueItem | null => (state.finished ? null : (state.items[state.index] ?? null));

/** Ảnh chưa lưu, kể cả ảnh đang chỉnh. */
export const unsavedCount = (state: EditorQueueState) => state.items.filter(isUnsaved).length;

export const hasLaterItems = (state: EditorQueueState) => state.items.some((item, index) => index > state.index && item.status === 'pending');

/** Ảnh còn lại từ ảnh đang chỉnh trở đi: số ảnh nút Lưu tất cả sẽ lưu. */
export const remainingCount = (state: EditorQueueState) => state.items.filter((item, index) => index >= state.index && item.status === 'pending').length;

export function bulkProgress(state: EditorQueueState): { done: number; total: number } | null {
    if (!state.bulkIndexes) return null;

    return { done: state.bulkIndexes.filter(index => !isUnsaved(state.items[index])).length, total: state.bulkIndexes.length };
}

export function summarizeQueue(state: EditorQueueState): EditorQueueSummary {
    const idsWith = (status: QueueItemStatus) =>
        state.items.flatMap(item => (item.status === status && item.stickerId !== null ? [item.stickerId] : []));

    return {
        addedIds: idsWith('saved'),
        existingIds: idsWith('existing'),
        // Ảnh chưa lưu (kể cả lượt gửi bị huỷ khi đóng) tính là bỏ qua.
        skipped: state.items.filter(item => item.status === 'skipped' || isUnsaved(item)).length,
        failed: state.items.flatMap(item => (item.status === 'failed' ? [{ name: item.file.name, error: item.error ?? '' }] : [])),
    };
}
