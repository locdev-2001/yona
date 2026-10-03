import { DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';

import { MAX_BRUSH_STROKE_POINTS } from './stickerEdit';
import type { BrushOperation, CropSquare, SourceEdit, StickerDraft, StickerFraming, WandOperation } from './stickerEdit';

// Trạng thái trình chỉnh sticker: bản nháp hiện tại cùng hai ngăn hoàn tác / làm lại.
// Mỗi thao tác của người dùng (một lần bấm đũa thần, một nét cọ, một lần kéo khung, một lượt
// kéo thanh dung sai, một loạt phím mũi tên liền nhau) là một bước. Khung đổi liên tục khi kéo
// (crop-change) và chỉ ghi bước lúc thả tay (crop-commit).

const MAX_UNDO_STEPS = 100;
// Các lần nhấn phím mũi tên cách nhau dưới ngần này gộp thành một bước hoàn tác.
export const NUDGE_MERGE_MS = 500;

type ActionKind = 'tolerance' | 'stroke-width' | 'nudge' | 'other';

export interface StickerEditorState {
    draft: StickerDraft;
    undoStack: StickerDraft[];
    redoStack: StickerDraft[];
    lastAction: { kind: ActionKind; at: number } | null;
    // Bản nháp lúc bắt đầu kéo khung, để cả lượt kéo thành một bước.
    gestureStart: StickerDraft | null;
}

export type StickerEditorAction =
    | { type: 'set-framing'; framing: StickerFraming; crop: CropSquare }
    | { type: 'crop-change'; crop: CropSquare }
    | { type: 'crop-commit' }
    | { type: 'crop-nudge'; crop: CropSquare; at: number }
    | { type: 'set-remove-background'; enabled: boolean }
    | { type: 'set-tolerance'; tolerance: number }
    | { type: 'set-stroke-width'; strokeWidth: number; merge?: boolean }
    | { type: 'wand'; op: WandOperation; x: number; y: number }
    | { type: 'brush-start'; op: BrushOperation; point: [number, number]; radius: number }
    | { type: 'brush-extend'; point: [number, number] }
    | { type: 'use-original' }
    | { type: 'undo' }
    | { type: 'redo' };

export function createEditorState(draft: StickerDraft): StickerEditorState {
    return { draft, undoStack: [], redoStack: [], lastAction: null, gestureStart: null };
}

function withUndoStep(state: StickerEditorState, kind: ActionKind, draft: StickerDraft, at = 0, before = state.draft): StickerEditorState {
    return {
        draft,
        undoStack: [...state.undoStack, before].slice(-MAX_UNDO_STEPS),
        redoStack: [],
        lastAction: { kind, at },
        gestureStart: null,
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

const sameCrop = (first: CropSquare, second: CropSquare) => first.left === second.left && first.top === second.top && first.side === second.side;

export function stickerEditorReducer(state: StickerEditorState, action: StickerEditorAction): StickerEditorState {
    const { draft } = state;
    switch (action.type) {
        case 'set-framing':
            if (draft.framing === action.framing && sameCrop(draft.crop, action.crop)) return state;
            return withUndoStep(state, 'other', { ...draft, framing: action.framing, crop: action.crop });
        case 'crop-change':
            return { ...state, draft: { ...draft, framing: 'custom', crop: action.crop }, gestureStart: state.gestureStart ?? draft };
        case 'crop-commit': {
            const before = state.gestureStart;
            if (!before) return state;
            if (sameCrop(before.crop, draft.crop)) return { ...state, draft: before, gestureStart: null };
            return withUndoStep(state, 'other', draft, 0, before);
        }
        case 'crop-nudge': {
            if (sameCrop(draft.crop, action.crop)) return state;
            const next = { ...draft, framing: 'custom' as const, crop: action.crop };
            const merges = state.lastAction?.kind === 'nudge' && action.at - state.lastAction.at < NUDGE_MERGE_MS;
            return merges ? { ...state, draft: next, lastAction: { kind: 'nudge', at: action.at } } : withUndoStep(state, 'nudge', next, action.at);
        }
        case 'set-remove-background':
            if (draft.removeBackground === action.enabled) return state;
            return withUndoStep(state, 'other', { ...draft, removeBackground: action.enabled });
        case 'set-tolerance': {
            if (draft.tolerance === action.tolerance) return state;
            const next = { ...draft, tolerance: action.tolerance };
            return state.lastAction?.kind === 'tolerance' ? { ...state, draft: next } : withUndoStep(state, 'tolerance', next);
        }
        case 'set-stroke-width': {
            if ((draft.strokeWidth ?? 0) === action.strokeWidth) return state;
            const next = { ...draft, strokeWidth: action.strokeWidth };
            return action.merge && state.lastAction?.kind === 'stroke-width'
                ? { ...state, draft: next }
                : withUndoStep(state, action.merge ? 'stroke-width' : 'other', next);
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
            if (!draft.removeBackground && draft.edits.length === 0 && draft.tolerance === DEFAULT_TOLERANCE && !draft.strokeWidth) return state;
            return withUndoStep(state, 'other', { ...draft, removeBackground: false, edits: [], tolerance: DEFAULT_TOLERANCE, strokeWidth: 0 });
        case 'undo': {
            const previous = state.undoStack[state.undoStack.length - 1];
            if (!previous) return state;
            return { draft: previous, undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, draft], lastAction: null, gestureStart: null };
        }
        case 'redo': {
            const next = state.redoStack[state.redoStack.length - 1];
            if (!next) return state;
            return { draft: next, undoStack: [...state.undoStack, draft], redoStack: state.redoStack.slice(0, -1), lastAction: null, gestureStart: null };
        }
    }
}
