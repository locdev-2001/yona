// Hàng chờ ảnh của trình chỉnh: ảnh đang chỉnh, kết quả từng ảnh và bảng tóm tắt khi hết hàng.

export type QueueItemStatus = 'pending' | 'saving' | 'saved' | 'existing' | 'skipped';

export interface QueueItem {
    file: File;
    status: QueueItemStatus;
    stickerId: number | null;
}

export interface EditorQueueState {
    items: QueueItem[];
    index: number;
    finished: boolean;
}

export interface EditorQueueSummary {
    addedIds: number[];
    existingIds: number[];
    skipped: number;
}

export type EditorQueueAction =
    | { type: 'saving' }
    | { type: 'save-failed' }
    | { type: 'saved'; stickerId: number; existing: boolean }
    | { type: 'skip' }
    | { type: 'next' };

export function createQueue(files: readonly File[]): EditorQueueState {
    return { items: files.map(file => ({ file, status: 'pending', stickerId: null })), index: 0, finished: files.length === 0 };
}

const withCurrent = (state: EditorQueueState, changes: Partial<QueueItem>): QueueItem[] =>
    state.items.map((item, index) => (index === state.index ? { ...item, ...changes } : item));

function moveToNextPending(state: EditorQueueState, items: QueueItem[]): EditorQueueState {
    const next = items.findIndex((item, index) => index > state.index && item.status === 'pending');

    return next === -1 ? { items, index: state.index, finished: true } : { items, index: next, finished: false };
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
    }
}

export const currentItem = (state: EditorQueueState): QueueItem | null => (state.finished ? null : (state.items[state.index] ?? null));

/** Ảnh chưa lưu, kể cả ảnh đang chỉnh. */
export const unsavedCount = (state: EditorQueueState) => state.items.filter(item => item.status === 'pending' || item.status === 'saving').length;

export const hasLaterItems = (state: EditorQueueState) => state.items.some((item, index) => index > state.index && item.status === 'pending');

export function summarizeQueue(state: EditorQueueState): EditorQueueSummary {
    const idsWith = (status: QueueItemStatus) =>
        state.items.flatMap(item => (item.status === status && item.stickerId !== null ? [item.stickerId] : []));

    return {
        addedIds: idsWith('saved'),
        existingIds: idsWith('existing'),
        // Ảnh chưa lưu (kể cả lượt gửi bị huỷ khi đóng) tính là bỏ qua.
        skipped: state.items.filter(item => item.status === 'skipped' || item.status === 'pending' || item.status === 'saving').length,
    };
}
