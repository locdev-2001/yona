import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';

import { t } from '../../../i18n';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import StickerEditStage from './StickerEditStage';
import type { EditorTool } from './StickerEditStage';
import { SegmentedControl, StickerPreviewPair, StickerSlider } from './StickerEditorControls';
import StickerMetaFields, { changesFromDraft, draftFromSticker, isDraftChanged } from './StickerMetaFields';
import type { StickerMetaDraft } from './StickerMetaFields';
import { canAddStickerEdit, fitCrop, FRAMINGS, subjectCrop, toStickerEdit } from './stickerEdit';
import type { BrushOperation, StickerDraft, StickerFraming, WandOperation } from './stickerEdit';
import { useFramePlayback, useStickerPreview } from './stickerEditorHooks';
import { createEditorState, stickerEditorReducer } from './stickerEditorState';
import { hasMetaErrors, stickerMetaErrorsFromApi, validateStickerMeta } from './stickerLimits';
import type { StickerLimits, StickerMetaErrors } from './stickerLimits';
import type { StickerUpload } from './stickerLibraryApi';
import { IconButton, MOBILE_QUERY, Spinner, StickerButton, Switch, useMediaQuery } from './stickerLibraryUi';
import type { EditableSource } from './stickerEditableSource';
import type { StickerMaskRunner } from './stickerMaskRunner';
import { StickerFileTooLargeError } from './stickerUploadFile';
import type { LibrarySticker, UploadedSticker } from './types';

// Thông số của ảnh đang chỉnh áp cho các ảnh còn lại khi Lưu tất cả.
export type BulkSaveSettings = Pick<StickerDraft, 'removeBackground' | 'tolerance'>;

interface StickerEditorWorkspaceProps {
    source: EditableSource;
    runner: StickerMaskRunner;
    initialDraft: StickerDraft;
    // Nhãn và từ khoá đang có khi chỉnh lại sticker đã lưu.
    initialMeta?: Pick<LibrarySticker, 'label' | 'keywords'>;
    imageSize: number;
    limits: StickerLimits;
    position: number;
    total: number;
    hasLaterImages: boolean;
    // Ảnh chưa lưu tính từ ảnh đang chỉnh; từ 2 ảnh trở lên thì có nút Lưu tất cả.
    remainingImages: number;
    isSaving: boolean;
    existing: UploadedSticker | null;
    // Có hộp xác nhận chồng lên: phím tắt của trình chỉnh tạm nghỉ.
    shortcutsPaused: boolean;
    onSave: (upload: StickerUpload, onThrottleWait: (delayMs: number) => void) => Promise<void>;
    onSaveAll: (upload: StickerUpload, settings: BulkSaveSettings, onThrottleWait: (delayMs: number) => void) => Promise<void>;
    onUpdateExisting: (upload: StickerUpload) => Promise<void>;
    onSkip: () => void;
    onCancel: () => void;
    onDirtyChange: (dirty: boolean) => void;
}

const DEFAULT_BRUSH_PERCENT = 5;
const MIN_BRUSH_PERCENT = 1;
const MAX_BRUSH_PERCENT = 25;
const BRUSH_PREVIEW_MS = 800;
// Dải chip chế độ đè trên vùng ảnh ở điện thoại: cao 44px cộng lề.
const MOBILE_MODES_OVERLAY_PX = 52;
const THROTTLE_TICK_MS = 250;
const NO_META: Pick<LibrarySticker, 'label' | 'keywords'> = { label: null, keywords: [] };
const TOOL_SHORTCUT: Record<EditorTool, string> = { crop: 'V', wand: 'W', brush: 'B' };
const TOOL_BY_KEY: Record<string, EditorTool> = { v: 'crop', w: 'wand', b: 'brush' };
const TOOL_LABEL: Record<EditorTool, string> = { crop: 'TOOL_FRAMING', wand: 'TOOL_WAND', brush: 'TOOL_BRUSH' };
const FRAMING_LABEL: Record<StickerFraming, string> = { subject: 'FRAMING_SUBJECT', fit: 'FRAMING_FIT', custom: 'FRAMING_CUSTOM' };
const FRAMING_HINT: Record<StickerFraming, string> = { subject: 'HINT_SUBJECT', fit: 'HINT_FIT', custom: 'HINT_CUSTOM' };
const TOOL_HINT: Record<Exclude<EditorTool, 'crop'>, string> = { wand: 'HINT_WAND', brush: 'HINT_BRUSH' };
const TOOLS: EditorTool[] = ['crop', 'wand', 'brush'];
const WAND_MODES: WandOperation[] = ['wand-remove', 'wand-keep'];
const WAND_LABEL: Record<WandOperation, string> = { 'wand-remove': 'WAND_REMOVE', 'wand-keep': 'WAND_KEEP' };
const BRUSH_MODES: BrushOperation[] = ['brush-remove', 'brush-keep'];
const BRUSH_LABEL: Record<BrushOperation, string> = { 'brush-remove': 'BRUSH_REMOVE', 'brush-keep': 'BRUSH_KEEP' };

type SettingsTab = 'image' | 'details';

const editorText = (key: string, params?: Record<string, string | number>) => t(`STICKER_LIBRARY.EDITOR.${key}`, params);

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;

    return target instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button'].includes(target.type);
};

function useThrottleCountdown(isSaving: boolean) {
    const [until, setUntil] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isSaving) setUntil(null);
    }, [isSaving]);

    useEffect(() => {
        if (until === null) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), THROTTLE_TICK_MS);

        return () => window.clearInterval(timer);
    }, [until]);

    const seconds = until === null ? null : Math.max(0, Math.ceil((until - now) / 1000));

    return { seconds, startWaiting: (delayMs: number) => { setNow(Date.now()); setUntil(Date.now() + delayMs); } };
}

export default function StickerEditorWorkspace({
    source,
    runner,
    initialDraft,
    initialMeta = NO_META,
    imageSize,
    limits,
    position,
    total,
    hasLaterImages,
    remainingImages,
    isSaving,
    existing,
    shortcutsPaused,
    onSave,
    onSaveAll,
    onUpdateExisting,
    onSkip,
    onCancel,
    onDirtyChange,
}: StickerEditorWorkspaceProps) {
    const isMobile = useMediaQuery(MOBILE_QUERY);
    const [state, dispatch] = useReducer(stickerEditorReducer, initialDraft, createEditorState);
    const { draft } = state;
    const { size, loaded } = source;
    const edit = useMemo(() => toStickerEdit(draft, size), [draft, size]);
    const { preview, isRendering, hasFailed } = useStickerPreview(runner, edit);
    const playback = useFramePlayback(loaded.delays);
    const throttle = useThrottleCountdown(isSaving);

    const [tool, setTool] = useState<EditorTool>('crop');
    const [wandMode, setWandMode] = useState<WandOperation>('wand-remove');
    const [brushMode, setBrushMode] = useState<BrushOperation>('brush-remove');
    const [brushPercent, setBrushPercent] = useState(DEFAULT_BRUSH_PERCENT);
    const [showBrushPreview, setShowBrushPreview] = useState(false);
    const [meta, setMeta] = useState<StickerMetaDraft>(() => draftFromSticker(initialMeta));
    const [apiErrors, setApiErrors] = useState<StickerMetaErrors>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isUpdatingExisting, setUpdatingExisting] = useState(false);
    const [settingsTab, setSettingsTab] = useState<SettingsTab>('image');

    const changes = changesFromDraft(meta);
    const localErrors = validateStickerMeta(changes, limits);
    const metaErrors: StickerMetaErrors = { label: apiErrors.label ?? localErrors.label, keywords: apiErrors.keywords ?? localErrors.keywords };
    const isMetaValid = !hasMetaErrors(localErrors);
    const canEdit = canAddStickerEdit(edit);
    const isPreviewCurrent = preview !== null && preview.edit === edit && !isRendering;
    const isEmptyResult = isPreviewCurrent && preview.isEmpty;
    const canSave = !isSaving && !hasFailed && isPreviewCurrent && !preview.isEmpty && isMetaValid && existing === null;
    const brushRadius = brushPercent / 100;
    const isAnimated = loaded.delays.length > 1;
    const isDirty = state.undoStack.length > 0 || isDraftChanged(meta, initialMeta);
    const canSaveAll = canSave && remainingImages > 1;

    useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

    useEffect(() => {
        if (!showBrushPreview) return undefined;
        const timer = window.setTimeout(() => setShowBrushPreview(false), BRUSH_PREVIEW_MS);

        return () => window.clearTimeout(timer);
    }, [showBrushPreview, brushPercent]);

    const changeBrushPercent = (next: number) => {
        const clamped = Math.min(MAX_BRUSH_PERCENT, Math.max(MIN_BRUSH_PERCENT, next));
        setBrushPercent(clamped);
        setShowBrushPreview(true);
    };

    const chooseFraming = (framing: StickerFraming) => {
        const crop = framing === 'subject' ? subjectCrop(loaded.subject.subject, size) : framing === 'fit' ? fitCrop(size) : draft.crop;
        dispatch({ type: 'set-framing', framing, crop });
    };

    const upload = (): StickerUpload => ({ edit, ...changes });

    const save = async () => {
        if (!canSave) return;
        setSaveError(null);
        try {
            await onSave(upload(), throttle.startWaiting);
        } catch (error) {
            if (isAbort(error)) return;
            const fieldErrors = stickerMetaErrorsFromApi(error, changes, limits);
            if (fieldErrors) {
                setApiErrors(fieldErrors);
                if (isMobile) setSettingsTab('details');
                return;
            }
            setSaveError(
                error instanceof StickerFileTooLargeError ? editorText('IMAGE_TOO_LARGE') : parseApiErrorMessage(error) || t('STICKER_LIBRARY.UPLOAD_FAILED'),
            );
        }
    };

    const saveAll = async () => {
        if (!canSaveAll) return;
        setSaveError(null);
        await onSaveAll(upload(), { removeBackground: draft.removeBackground, tolerance: draft.tolerance }, throttle.startWaiting);
    };

    const updateExisting = async () => {
        setUpdatingExisting(true);
        setSaveError(null);
        try {
            await onUpdateExisting(upload());
        } catch (error) {
            setSaveError(parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR'));
            setUpdatingExisting(false);
        }
    };

    // Phím tắt nghe ở cấp hộp thoại (focus có thể đang ở nền canvas, không ở ô nào).
    const shortcutRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
    shortcutRef.current = event => {
        if (shortcutsPaused || event.altKey) return;
        const withModifier = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        if (withModifier && event.key === 'Enter') {
            event.preventDefault();
            void save();
            return;
        }
        if (isTypingTarget(event.target)) return;
        if (withModifier && (key === 'z' || key === 'y')) {
            event.preventDefault();
            dispatch({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' });
            return;
        }
        if (withModifier) return;
        if (TOOL_BY_KEY[key]) {
            event.preventDefault();
            setTool(TOOL_BY_KEY[key]);
        } else if (event.key === '[' || event.key === ']') {
            event.preventDefault();
            setTool('brush');
            changeBrushPercent(brushPercent + (event.key === ']' ? 1 : -1));
        }
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => shortcutRef.current(event);
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void save();
    };

    const toolbar = (
        <div className="flex h-11 shrink-0 items-center gap-2">
            <div className="min-w-0 flex-1">
                <SegmentedControl
                    label={editorText('TOOLS')}
                    options={TOOLS.map(item => ({ value: item, label: editorText(TOOL_LABEL[item]), shortcut: TOOL_SHORTCUT[item] }))}
                    value={tool}
                    onChange={setTool}
                />
            </div>
            <IconButton icon="i-lucide-undo-2" label={editorText('UNDO')} aria-keyshortcuts="Control+Z" disabled={state.undoStack.length === 0} onClick={() => dispatch({ type: 'undo' })} />
            <IconButton icon="i-lucide-redo-2" label={editorText('REDO')} aria-keyshortcuts="Control+Shift+Z" disabled={state.redoStack.length === 0} onClick={() => dispatch({ type: 'redo' })} />
        </div>
    );

    const toolModes = (
        <div className="flex h-11 shrink-0 items-center gap-2">
            {tool === 'crop' ? (
                <div className="min-w-0 flex-1">
                    <SegmentedControl
                        label={editorText('FRAMING')}
                        options={FRAMINGS.map(framing => ({ value: framing, label: editorText(FRAMING_LABEL[framing]) }))}
                        value={draft.framing}
                        onChange={chooseFraming}
                    />
                </div>
            ) : null}
            {tool === 'wand' ? (
                <div className="min-w-0 flex-1">
                    <SegmentedControl
                        label={editorText('WAND_MODE')}
                        options={WAND_MODES.map(mode => ({ value: mode, label: editorText(WAND_LABEL[mode]) }))}
                        value={wandMode}
                        onChange={setWandMode}
                    />
                </div>
            ) : null}
            {tool === 'brush' ? (
                <>
                    <div className="min-w-0 flex-1">
                        <SegmentedControl
                            label={editorText('BRUSH_MODE')}
                            options={BRUSH_MODES.map(mode => ({ value: mode, label: editorText(BRUSH_LABEL[mode]) }))}
                            value={brushMode}
                            onChange={setBrushMode}
                        />
                    </div>
                    <div role="group" aria-label={editorText('BRUSH_SIZE')} className="flex shrink-0 items-center">
                        <IconButton
                            icon="i-lucide-minus"
                            label={editorText('DECREASE', { label: editorText('BRUSH_SIZE') })}
                            aria-keyshortcuts="["
                            disabled={brushPercent <= MIN_BRUSH_PERCENT}
                            onClick={() => changeBrushPercent(brushPercent - 1)}
                        />
                        <span className="w-10 text-center text-sm tabular-nums text-n-slate-12" aria-live="polite">
                            {editorText('BRUSH_SIZE_VALUE', { size: brushPercent })}
                        </span>
                        <IconButton
                            icon="i-lucide-plus"
                            label={editorText('INCREASE', { label: editorText('BRUSH_SIZE') })}
                            aria-keyshortcuts="]"
                            disabled={brushPercent >= MAX_BRUSH_PERCENT}
                            onClick={() => changeBrushPercent(brushPercent + 1)}
                        />
                    </div>
                </>
            ) : null}
        </div>
    );

    const hint = tool === 'crop' ? FRAMING_HINT[draft.framing] : TOOL_HINT[tool];
    const canvasArea = (
        <div className={`relative overflow-hidden rounded-lg bg-n-alpha-1 ${isMobile ? 'h-[min(45dvh,100vw)] shrink-0' : 'min-h-0 flex-1'}`}>
            <StickerEditStage
                sourceCanvas={source.sourceCanvas}
                size={size}
                crop={draft.crop}
                tool={tool}
                preview={preview}
                frameIndex={playback.frameIndex}
                motionBounds={isAnimated ? loaded.subject.subject : null}
                brushRadius={brushRadius}
                showBrushPreview={showBrushPreview}
                canEdit={canEdit}
                topInsetPx={isMobile ? MOBILE_MODES_OVERLAY_PX : 0}
                onCropChange={crop => dispatch({ type: 'crop-change', crop })}
                onCropCommit={() => dispatch({ type: 'crop-commit' })}
                onCropNudge={crop => dispatch({ type: 'crop-nudge', crop, at: Date.now() })}
                onWand={([x, y]) => dispatch({ type: 'wand', op: wandMode, x, y })}
                onBrushStart={point =>
                    dispatch({
                        type: 'brush-start',
                        op: brushMode,
                        point,
                        radius: (brushRadius * draft.crop.side) / Math.max(size.width, size.height),
                    })
                }
                onBrushExtend={point => dispatch({ type: 'brush-extend', point })}
            />
            {isMobile ? (
                <div className="absolute inset-x-2 top-2 z-10 rounded-lg bg-n-solid-1/90 px-1 shadow-sm">{toolModes}</div>
            ) : null}
            {isAnimated ? (
                <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-lg bg-n-solid-1/90 pr-2 shadow-sm">
                    <IconButton
                        icon={playback.isPlaying ? 'i-lucide-pause' : 'i-lucide-play'}
                        label={editorText(playback.isPlaying ? 'PAUSE' : 'PLAY')}
                        onClick={playback.togglePlaying}
                    />
                    <span className="text-xs tabular-nums text-n-slate-12">
                        {editorText('FRAME_OF', { index: playback.frameIndex + 1, total: playback.frameCount })}
                    </span>
                </div>
            ) : null}
            {isEmptyResult ? (
                <div role="status" className="absolute inset-x-2 bottom-2 z-20 flex items-center gap-2 rounded-lg bg-n-amber-3 px-3 py-1.5 text-sm text-n-amber-11 shadow">
                    <span className="min-w-0 flex-1">{editorText('EMPTY_RESULT')}</span>
                    <StickerButton tone="secondary" icon="i-lucide-undo-2" disabled={state.undoStack.length === 0} onClick={() => dispatch({ type: 'undo' })}>
                        {editorText('UNDO')}
                    </StickerButton>
                </div>
            ) : null}
        </div>
    );

    const notices = (
        <>
            {loaded.animationUnavailable ? <p className="m-0 text-xs text-n-slate-11">{editorText('ANIMATION_UNAVAILABLE')}</p> : null}
            {!canEdit ? (
                <p role="status" className="m-0 text-xs text-n-amber-11">
                    {editorText('EDIT_LIMIT')}
                </p>
            ) : null}
            {hasFailed ? (
                <p role="alert" className="m-0 text-xs text-n-ruby-11">
                    {editorText('PROCESS_FAILED')}
                </p>
            ) : null}
        </>
    );

    const backgroundSettings = (
        <div className="flex flex-col gap-2">
            <Switch
                checked={draft.removeBackground}
                label={editorText('REMOVE_BACKGROUND')}
                onChange={enabled => dispatch({ type: 'set-remove-background', enabled })}
            />
            <div className="flex flex-col gap-1">
                <span className={`text-xs ${draft.removeBackground ? 'text-n-slate-11' : 'text-n-slate-10'}`}>{editorText('TOLERANCE')}</span>
                <StickerSlider
                    label={editorText('TOLERANCE')}
                    value={draft.tolerance}
                    min={0}
                    max={100}
                    disabled={!draft.removeBackground}
                    onChange={tolerance => dispatch({ type: 'set-tolerance', tolerance })}
                />
            </div>
            {draft.removeBackground ? <p className="m-0 text-xs text-n-slate-11">{editorText('TOLERANCE_HINT')}</p> : null}
        </div>
    );

    const useOriginal = (
        <button
            type="button"
            className="reset-base self-start border-0 bg-transparent p-0 text-sm font-medium text-n-brand underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-n-slate-10 disabled:no-underline"
            disabled={!draft.removeBackground && draft.edits.length === 0 && draft.tolerance === DEFAULT_TOLERANCE}
            onClick={() => dispatch({ type: 'use-original' })}
        >
            {editorText('USE_ORIGINAL')}
        </button>
    );

    const metaFields = (
        <StickerMetaFields
            draft={meta}
            limits={limits}
            errors={metaErrors}
            disabled={isSaving}
            onChange={(next, field) => {
                setMeta(next);
                setApiErrors(current => ({ ...current, [field]: undefined }));
            }}
        />
    );

    const preview128 = <StickerPreviewPair preview={preview} frameIndex={playback.frameIndex} imageSize={imageSize} isRendering={isRendering} />;

    const saveLabel: ReactNode =
        throttle.seconds !== null
            ? editorText('WAITING_FOR_SERVER', { seconds: throttle.seconds })
            : isSaving
              ? editorText('SAVING')
              : hasLaterImages
                ? editorText('SAVE_AND_NEXT', { index: position, total })
                : editorText('SAVE');

    return (
        <form className="contents" onSubmit={submit} noValidate>
            <div className="flex min-h-0 flex-col">
                {existing ? (
                    <div role="status" className="flex shrink-0 flex-wrap items-center gap-2 border-0 border-b border-solid border-n-weak bg-n-amber-3 px-4 py-2 text-sm text-n-amber-11">
                        <span className="min-w-0 flex-1">
                            {existing.label
                                ? editorText('EXISTING_LABELLED', { slot: existing.position + 1, label: existing.label })
                                : editorText('EXISTING', { slot: existing.position + 1 })}
                        </span>
                        <StickerButton tone="secondary" busy={isUpdatingExisting} disabled={!isMetaValid} onClick={() => void updateExisting()}>
                            {editorText('UPDATE_EXISTING')}
                        </StickerButton>
                        <StickerButton tone="ghost" disabled={isUpdatingExisting} onClick={onSkip}>
                            {editorText('SKIP_EXISTING')}
                        </StickerButton>
                    </div>
                ) : null}
                {isMobile ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 flex-col gap-1 px-4 pt-2">
                            {canvasArea}
                            {toolbar}
                        </div>
                        <div role="tablist" aria-label={editorText('SETTINGS')} className="flex shrink-0 gap-1 border-0 border-b border-solid border-n-weak px-4">
                            {(['image', 'details'] as const).map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={settingsTab === tab}
                                    onClick={() => setSettingsTab(tab)}
                                    className={`reset-base h-11 flex-1 border-0 border-b-2 border-solid bg-transparent text-sm font-medium ${
                                        settingsTab === tab ? 'border-n-brand text-n-slate-12' : 'border-transparent text-n-slate-11'
                                    }`}
                                >
                                    {editorText(tab === 'image' ? 'TAB_IMAGE' : 'TAB_DETAILS')}
                                    {tab === 'details' && hasMetaErrors(metaErrors) ? <span className="ml-1 text-n-ruby-11">•</span> : null}
                                </button>
                            ))}
                        </div>
                        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-4">
                            {settingsTab === 'image' ? (
                                <>
                                    <p className="m-0 text-xs text-n-slate-11">{editorText(hint)}</p>
                                    {notices}
                                    {preview128}
                                    {backgroundSettings}
                                    {useOriginal}
                                </>
                            ) : (
                                metaFields
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
                        <div className="flex min-h-0 flex-col gap-2 p-4">
                            {toolbar}
                            {toolModes}
                            {canvasArea}
                            <p className="m-0 h-4 shrink-0 truncate text-xs text-n-slate-11">{editorText(hint)}</p>
                        </div>
                        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overflow-x-hidden border-0 border-l border-solid border-n-weak p-4">
                            {preview128}
                            {notices}
                            {backgroundSettings}
                            {metaFields}
                            {useOriginal}
                        </div>
                    </div>
                )}
            </div>

            <footer className="flex min-h-16 flex-wrap items-center gap-2 border-0 border-t border-solid border-n-weak px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:flex-nowrap md:pb-3">
                <StickerButton tone="secondary" disabled={isSaving} onClick={total > 1 ? onSkip : onCancel}>
                    {total > 1 ? editorText('SKIP') : editorText('CANCEL')}
                </StickerButton>
                <p role={saveError ? 'alert' : undefined} className="m-0 min-w-0 flex-1 truncate text-sm text-n-ruby-11" title={saveError ?? undefined}>
                    {saveError}
                </p>
                {existing || remainingImages < 2 ? null : (
                    <StickerButton tone="secondary" className="max-md:order-first max-md:w-full" disabled={!canSaveAll} onClick={() => void saveAll()}>
                        {editorText('SAVE_ALL', { count: remainingImages })}
                    </StickerButton>
                )}
                {existing ? null : (
                    <StickerButton type="submit" tone="primary" disabled={!canSave} aria-keyshortcuts="Control+Enter">
                        {isRendering || isSaving ? (
                            <span aria-hidden="true" className="inline-flex">
                                <Spinner size={16} className="text-white" />
                            </span>
                        ) : null}
                        {saveLabel}
                    </StickerButton>
                )}
            </footer>
        </form>
    );
}
