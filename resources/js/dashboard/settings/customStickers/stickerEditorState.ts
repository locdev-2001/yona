import { MAX_BRUSH_STROKE_POINTS } from './stickerEdit';
import type { BrushOperation, CropSquare, SourceEdit, StickerDraft, WandOperation } from './stickerEdit';

// Trạng thái trình chỉnh sticker: bản nháp hiện tại và các bước để hoàn tác.
// Mỗi thao tác của người dùng (một lần bấm đũa thần, một nét cọ, một lần kéo khung,
// một lượt kéo thanh dung sai) là một bước hoàn tác. Khung cắt đổi liên tục khi kéo
// (crop-change) và chỉ ghi bước hoàn tác lúc thả tay (crop-commit, kèm khung trước khi kéo).

const MAX_UNDO_STEPS = 100;

type ActionKind = 'crop' | 'tolerance' | 'other';

export interface StickerEditorState {
    draft: StickerDraft;
    undoStack: StickerDraft[];
    lastActionKind: ActionKind | null;
}

export type StickerEditorAction =
    | { type: 'reset'; draft: StickerDraft }
    | { type: 'crop-change'; crop: CropSquare }
    | { type: 'crop-commit'; before: CropSquare }
    | { type: 'set-remove-background'; enabled: boolean }
    | { type: 'set-tolerance'; tolerance: number }
    | { type: 'wand'; op: WandOperation; x: number; y: number }
    | { type: 'brush-start'; op: BrushOperation; point: [number, number]; radius: number }
    | { type: 'brush-extend'; point: [number, number] }
    | { type: 'use-original' }
    | { type: 'undo' };

export function createEditorState(draft: StickerDraft): StickerEditorState {
    return { draft, undoStack: [], lastActionKind: null };
}

function withUndoStep(state: StickerEditorState, kind: ActionKind, draft: StickerDraft): StickerEditorState {
    return {
        draft,
        undoStack: [...state.undoStack, state.draft].slice(-MAX_UNDO_STEPS),
        lastActionKind: kind,
    };
}

function extendLastStroke(edits: SourceEdit[], point: [number, number]): SourceEdit[] {
    const stroke = edits[edits.length - 1];
    if (!stroke || !('points' in stroke)) return edits;
    if (stroke.points.length < MAX_BRUSH_STROKE_POINTS) {
        return [...edits.slice(0, -1), { ...stroke, points: [...stroke.points, point] }];
    }
    const lastPoint = stroke.points[stroke.points.length - 1];

    return [...edits, { op: stroke.op, radius: stroke.radius, points: [lastPoint, point] }];
}

export function stickerEditorReducer(state: StickerEditorState, action: StickerEditorAction): StickerEditorState {
    const { draft } = state;
    switch (action.type) {
        case 'reset':
            return createEditorState(action.draft);
        case 'crop-change':
            return { ...state, draft: { ...draft, crop: action.crop } };
        case 'crop-commit': {
            const { before } = action;
            const unchanged = before.left === draft.crop.left && before.top === draft.crop.top && before.side === draft.crop.side;
            if (unchanged) return state;
            return withUndoStep({ ...state, draft: { ...draft, crop: before } }, 'crop', draft);
        }
        case 'set-remove-background':
            if (draft.removeBackground === action.enabled) return state;
            return withUndoStep(state, 'other', { ...draft, removeBackground: action.enabled });
        case 'set-tolerance': {
            if (draft.tolerance === action.tolerance) return state;
            const next = { ...draft, tolerance: action.tolerance };
            return state.lastActionKind === 'tolerance' ? { ...state, draft: next } : withUndoStep(state, 'tolerance', next);
        }
        case 'wand':
            return withUndoStep(state, 'other', {
                ...draft,
                edits: [...draft.edits, { op: action.op, x: action.x, y: action.y, tolerance: draft.tolerance }],
            });
        case 'brush-start':
            return withUndoStep(state, 'other', {
                ...draft,
                edits: [...draft.edits, { op: action.op, points: [action.point], radius: action.radius }],
            });
        case 'brush-extend':
            return { ...state, draft: { ...draft, edits: extendLastStroke(draft.edits, action.point) } };
        case 'use-original':
            if (!draft.removeBackground && draft.edits.length === 0) return state;
            return withUndoStep(state, 'other', { ...draft, removeBackground: false, edits: [] });
        case 'undo': {
            const previous = state.undoStack[state.undoStack.length - 1];
            if (!previous) return state;
            return { draft: previous, undoStack: state.undoStack.slice(0, -1), lastActionKind: null };
        }
    }
}
