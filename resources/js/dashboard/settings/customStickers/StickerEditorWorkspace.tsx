import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { t } from '../../../i18n';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useStickerDisplaySize } from 'shared/sticker/stickerDisplaySize';
import StickerEditStage from './StickerEditStage';
import type { EditorTool, RenderedPreview } from './StickerEditStage';
import { drawComposedSticker, pixelsToCanvas } from './stickerCanvas';
import { canAddStickerEdit, toStickerEdit } from './stickerEdit';
import type { BrushOperation, ImageSize, StickerDraft, StickerEdit, WandOperation } from './stickerEdit';
import { createEditorState, stickerEditorReducer } from './stickerEditorState';
import { parseKeywordInput } from './stickerKeywords';
import {
    CHECKERBOARD_STYLE,
    INPUT_CLASS,
    PRIMARY_BUTTON_CLASS,
    SECONDARY_BUTTON_CLASS,
    TOGGLE_BUTTON_CLASS,
    TOGGLE_OFF_CLASS,
    TOGGLE_ON_CLASS,
} from './stickerLibraryStyles';
import type { PixelRect } from './stickerEdit';
import type { RenderedCrop } from './stickerMaskRender';
import type { StickerMaskRunner } from './stickerMaskRunner';
import type { DecodedStickerSource } from './stickerSourceImage';
import type { StickerUpload } from './stickerLibraryApi';
import { StickerFileTooLargeError } from './stickerUploadFile';

interface StickerEditorWorkspaceProps {
    source: DecodedStickerSource;
    runner: StickerMaskRunner;
    initialDraft: StickerDraft;
    imageSize: number;
    onSave: (upload: StickerUpload) => Promise<void>;
    onSkip: () => void;
}

const DEFAULT_BRUSH_PERCENT = 5;
const MIN_BRUSH_PERCENT = 1;
const MAX_BRUSH_PERCENT = 25;
const ZOOMED_PREVIEW_PIXELS = 256;
const TOOLS: EditorTool[] = ['crop', 'wand', 'brush'];
const TOOL_LABEL: Record<EditorTool, string> = { crop: 'TOOL_CROP', wand: 'TOOL_WAND', brush: 'TOOL_BRUSH' };
const TOOL_HINT: Record<EditorTool, string> = { crop: 'HINT_CROP', wand: 'HINT_WAND', brush: 'HINT_BRUSH' };
const WAND_MODES: { op: WandOperation; label: string }[] = [
    { op: 'wand-remove', label: 'WAND_REMOVE' },
    { op: 'wand-keep', label: 'WAND_KEEP' },
];
const BRUSH_MODES: { op: BrushOperation; label: string }[] = [
    { op: 'brush-remove', label: 'BRUSH_REMOVE' },
    { op: 'brush-keep', label: 'BRUSH_KEEP' },
];
const LABEL_MAX_LENGTH = 100;

const editorText = (key: string, params?: Record<string, string | number>) => t(`STICKER_LIBRARY.EDITOR.${key}`, params);

const saveErrorMessage = (error: unknown) =>
    error instanceof StickerFileTooLargeError
        ? editorText('IMAGE_TOO_LARGE')
        : parseApiErrorMessage(error) || t('STICKER_LIBRARY.UPLOAD_FAILED');

interface MaskPreviewState {
    preview: (RenderedPreview & { opaqueBounds: PixelRect | null }) | null;
    isRendering: boolean;
    hasFailed: boolean;
}

// Mỗi lần bản nháp đổi thì dựng lại bản xem trước; đang dựng dở thì chỉ giữ lượt
// mới nhất để kéo thanh hay tô cọ liên tục không dồn hàng đợi.
function useMaskPreview(runner: StickerMaskRunner, edit: StickerEdit): MaskPreviewState {
    const [state, setState] = useState<MaskPreviewState>({ preview: null, isRendering: true, hasFailed: false });
    const latestEditRef = useRef(edit);
    const isRenderingRef = useRef(false);
    const isMountedRef = useRef(true);
    latestEditRef.current = edit;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (isRenderingRef.current) return;

        const renderLatest = () => {
            const target = latestEditRef.current;
            isRenderingRef.current = true;
            setState(current => ({ ...current, isRendering: true }));
            runner
                .render(target)
                .then(
                    (result: RenderedCrop) => {
                        if (!isMountedRef.current) return;
                        const preview = { edit: target, canvas: pixelsToCanvas(result), opaqueBounds: result.opaqueBounds };
                        setState({ preview, isRendering: false, hasFailed: false });
                    },
                    () => {
                        if (isMountedRef.current) setState(current => ({ ...current, isRendering: false, hasFailed: true }));
                    },
                )
                .finally(() => {
                    isRenderingRef.current = false;
                    if (isMountedRef.current && latestEditRef.current !== target) renderLatest();
                });
        };

        renderLatest();
    }, [runner, edit]);

    return state;
}

function StickerPreview({ preview, imageSize }: { preview: MaskPreviewState['preview']; imageSize: number }) {
    const displaySize = useStickerDisplaySize();
    const zoomedRef = useRef<HTMLCanvasElement>(null);
    const actualRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        for (const target of [zoomedRef.current, actualRef.current]) {
            if (target) drawComposedSticker(target, preview?.canvas ?? null, preview?.opaqueBounds ?? null);
        }
    }, [preview]);

    return (
        <div className="flex items-end gap-4">
            <figure className="m-0 flex flex-col items-center gap-1">
                <canvas
                    ref={zoomedRef}
                    width={ZOOMED_PREVIEW_PIXELS}
                    height={ZOOMED_PREVIEW_PIXELS}
                    className="size-32 border border-slate-200"
                    style={CHECKERBOARD_STYLE}
                    data-testid="sticker-preview-zoomed"
                />
                <figcaption className="text-xs text-slate-600">{editorText('PREVIEW_ZOOMED')}</figcaption>
            </figure>
            <figure className="m-0 flex flex-col items-center gap-1">
                <canvas
                    ref={actualRef}
                    width={imageSize}
                    height={imageSize}
                    className="border border-slate-200"
                    style={{ ...CHECKERBOARD_STYLE, backgroundSize: '8px 8px', width: displaySize, height: displaySize }}
                    data-testid="sticker-preview-actual"
                />
                <figcaption className="text-xs text-slate-600">{editorText('PREVIEW_ACTUAL', { size: imageSize })}</figcaption>
            </figure>
        </div>
    );
}

function ToggleButton({ pressed, onClick, disabled, children }: { pressed: boolean; onClick: () => void; disabled?: boolean; children: string }) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className={`${TOGGLE_BUTTON_CLASS} ${pressed ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`}
        >
            {children}
        </button>
    );
}

export default function StickerEditorWorkspace({ source, runner, initialDraft, imageSize, onSave, onSkip }: StickerEditorWorkspaceProps) {
    const [state, dispatch] = useReducer(stickerEditorReducer, initialDraft, createEditorState);
    const { draft } = state;
    const size: ImageSize = useMemo(() => ({ width: source.pixels.width, height: source.pixels.height }), [source]);
    const sourceCanvas = useMemo(() => pixelsToCanvas(source.pixels), [source]);
    const edit = useMemo(() => toStickerEdit(draft, size), [draft, size]);
    const { preview, isRendering, hasFailed } = useMaskPreview(runner, edit);

    const [tool, setTool] = useState<EditorTool>('crop');
    const [wandMode, setWandMode] = useState<WandOperation>('wand-remove');
    const [brushMode, setBrushMode] = useState<BrushOperation>('brush-remove');
    const [brushPercent, setBrushPercent] = useState(DEFAULT_BRUSH_PERCENT);
    const [labelDraft, setLabelDraft] = useState('');
    const [keywordsDraft, setKeywordsDraft] = useState('');
    const [isSaving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const canEdit = canAddStickerEdit(edit);
    const isEmptyResult = preview !== null && preview.edit === edit && preview.opaqueBounds === null;
    const canSave = !isSaving && !hasFailed && preview !== null && !isEmptyResult;
    const brushRadiusOfCrop = brushPercent / 100;

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSave) return;
        setSaving(true);
        setSaveError(null);
        try {
            await onSave({ edit, label: labelDraft.trim() || null, keywords: parseKeywordInput(keywordsDraft) });
        } catch (error) {
            setSaveError(saveErrorMessage(error));
            setSaving(false);
        }
    };

    const undoOnShortcut = (event: KeyboardEvent<HTMLFormElement>) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') return;
        if (event.key.toLowerCase() !== 'z' || !(event.ctrlKey || event.metaKey) || event.shiftKey) return;
        event.preventDefault();
        dispatch({ type: 'undo' });
    };

    return (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => void save(event)} onKeyDown={undoOnShortcut}>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex gap-2" role="group" aria-label={editorText('TOOLS')}>
                        {TOOLS.map(item => (
                            <ToggleButton key={item} pressed={tool === item} onClick={() => setTool(item)}>
                                {editorText(TOOL_LABEL[item])}
                            </ToggleButton>
                        ))}
                    </div>
                    {tool === 'wand' ? (
                        <div className="flex gap-2">
                            {WAND_MODES.map(mode => (
                                <ToggleButton key={mode.op} pressed={wandMode === mode.op} onClick={() => setWandMode(mode.op)}>
                                    {editorText(mode.label)}
                                </ToggleButton>
                            ))}
                        </div>
                    ) : null}
                    {tool === 'brush' ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                {BRUSH_MODES.map(mode => (
                                    <ToggleButton key={mode.op} pressed={brushMode === mode.op} onClick={() => setBrushMode(mode.op)}>
                                        {editorText(mode.label)}
                                    </ToggleButton>
                                ))}
                            </div>
                            <label className="flex items-center gap-3 text-xs text-slate-700">
                                <span className="shrink-0">{editorText('BRUSH_SIZE')}</span>
                                <input
                                    type="range"
                                    min={MIN_BRUSH_PERCENT}
                                    max={MAX_BRUSH_PERCENT}
                                    value={brushPercent}
                                    onChange={event => setBrushPercent(Number(event.target.value))}
                                    className="h-11 min-w-0 flex-1 accent-woot-500 md:h-9"
                                />
                            </label>
                        </div>
                    ) : null}
                    <p className="m-0 text-xs text-slate-600">{editorText(TOOL_HINT[tool])}</p>
                    <div className="p-4">
                        <StickerEditStage
                            sourceCanvas={sourceCanvas}
                            size={size}
                            crop={draft.crop}
                            tool={tool}
                            rendered={preview}
                            brushRadius={brushRadiusOfCrop}
                            canEdit={canEdit}
                            onCropChange={crop => dispatch({ type: 'crop-change', crop })}
                            onCropCommit={before => dispatch({ type: 'crop-commit', before })}
                            onWand={([x, y]) => dispatch({ type: 'wand', op: wandMode, x, y })}
                            onBrushStart={point =>
                                dispatch({
                                    type: 'brush-start',
                                    op: brushMode,
                                    point,
                                    radius: (brushRadiusOfCrop * draft.crop.side) / Math.max(size.width, size.height),
                                })
                            }
                            onBrushExtend={point => dispatch({ type: 'brush-extend', point })}
                        />
                    </div>
                    {source.animated ? <p className="m-0 text-xs text-slate-600">{editorText('ANIMATED_NOTE')}</p> : null}
                    {!canEdit ? (
                        <p role="status" className="m-0 text-xs text-yellow-800">
                            {editorText('EDIT_LIMIT')}
                        </p>
                    ) : null}
                </div>

                <div className="flex w-full flex-col gap-4 md:w-72 md:shrink-0">
                    <div className="flex flex-col gap-2">
                        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-900 md:min-h-9">
                            <input
                                type="checkbox"
                                checked={draft.removeBackground}
                                onChange={event => dispatch({ type: 'set-remove-background', enabled: event.target.checked })}
                                className="size-4 accent-woot-500"
                            />
                            {editorText('REMOVE_BACKGROUND')}
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-700">
                            <span className="flex justify-between">
                                <span>{editorText('TOLERANCE')}</span>
                                <span className="tabular-nums text-slate-900">{draft.tolerance}</span>
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={draft.tolerance}
                                onChange={event => dispatch({ type: 'set-tolerance', tolerance: Number(event.target.value) })}
                                className="h-11 w-full accent-woot-500 md:h-9"
                            />
                        </label>
                        <p className="m-0 text-xs text-slate-600">{editorText('TOLERANCE_HINT')}</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`${SECONDARY_BUTTON_CLASS} flex-1`}
                                onClick={() => dispatch({ type: 'undo' })}
                                disabled={state.undoStack.length === 0}
                            >
                                {editorText('UNDO')}
                            </button>
                            <button
                                type="button"
                                className={`${SECONDARY_BUTTON_CLASS} flex-1`}
                                onClick={() => dispatch({ type: 'use-original' })}
                                disabled={!draft.removeBackground && draft.edits.length === 0}
                            >
                                {editorText('USE_ORIGINAL')}
                            </button>
                        </div>
                    </div>

                    <section className="flex flex-col gap-2" aria-label={editorText('PREVIEW')}>
                        <div className="flex items-center justify-between">
                            <h4 className="m-0 text-sm font-medium text-slate-900">{editorText('PREVIEW')}</h4>
                            {isRendering ? <span className="text-xs text-slate-600">{editorText('PROCESSING')}</span> : null}
                        </div>
                        <StickerPreview preview={preview} imageSize={imageSize} />
                        {hasFailed ? (
                            <p role="alert" className="m-0 text-xs text-red-700">
                                {editorText('PROCESS_FAILED')}
                            </p>
                        ) : null}
                        {isEmptyResult ? (
                            <p role="status" className="m-0 text-xs text-yellow-800">
                                {editorText('EMPTY_RESULT')}
                            </p>
                        ) : null}
                    </section>

                    <div className="flex flex-col gap-2">
                        <label className="flex flex-col gap-1 text-xs text-slate-700">
                            {t('STICKER_LIBRARY.LABEL')}
                            <input
                                className={INPUT_CLASS}
                                value={labelDraft}
                                onChange={event => setLabelDraft(event.target.value)}
                                maxLength={LABEL_MAX_LENGTH}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-700">
                            {t('STICKER_LIBRARY.KEYWORDS')}
                            <input
                                className={INPUT_CLASS}
                                value={keywordsDraft}
                                onChange={event => setKeywordsDraft(event.target.value)}
                                placeholder={t('STICKER_LIBRARY.KEYWORDS_PLACEHOLDER')}
                            />
                        </label>
                        <p className="m-0 text-xs text-slate-600">{t('STICKER_LIBRARY.KEYWORDS_HINT')}</p>
                    </div>
                </div>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
                {saveError ? (
                    <p role="alert" className="m-0 mr-auto text-sm text-red-700">
                        {saveError}
                    </p>
                ) : null}
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onSkip} disabled={isSaving}>
                    {editorText('SKIP')}
                </button>
                <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={!canSave}>
                    {isSaving ? editorText('SAVING') : editorText('SAVE')}
                </button>
            </footer>
        </form>
    );
}
