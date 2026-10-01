import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import ConfirmActionDialog from './ConfirmActionDialog';
import type { ConfirmActionRequest } from './ConfirmActionDialog';
import StickerEditorWorkspace from './StickerEditorWorkspace';
import type { BulkSaveSettings } from './StickerEditorWorkspace';
import { describeRejected } from './prepareUploadQueue';
import type { RejectedUpload } from './prepareUploadQueue';
import { toStickerEdit } from './stickerEdit';
import type { StickerDraft } from './stickerEdit';
import { openStickerSource } from './stickerEditableSource';
import type { EditableSource, SavedStickerEdit } from './stickerEditableSource';
import {
    bulkProgress,
    createQueue,
    currentItem,
    editorQueueReducer,
    hasLaterItems,
    remainingCount,
    summarizeQueue,
    unsavedCount,
} from './stickerEditorQueue';
import type { EditorQueueSummary, QueueItem } from './stickerEditorQueue';
import type { StickerUpload, UploadOptions } from './stickerLibraryApi';
import { IconButton, Modal, Spinner, StickerButton } from './stickerLibraryUi';
import type { ModalCloseReason } from './stickerLibraryUi';
import type { StickerLimits } from './stickerLimits';
import { createStickerMaskRunner } from './stickerMaskRunner';
import type { StickerMaskRunner } from './stickerMaskRunner';
import type { LibrarySticker, LibraryStickerChanges, UploadedSticker } from './types';

// Trình chỉnh ảnh thành sticker cho cả hàng chờ ảnh: chọn vùng lấy, xoá nền (loang màu từ mép,
// đũa thần, cọ), xem trước ở cỡ thật rồi gửi ảnh gốc kèm `edit` cho máy chủ dựng bản cuối.
// Chỉnh lại sticker đã lưu cũng dùng trình chỉnh này với ảnh gốc và `edit` đã lưu.
// Hộp có kích thước cố định; đóng giữa chừng thì hỏi, Back trên điện thoại chỉ đóng hộp.

export const EDITOR_HISTORY_STATE = 'stickerImageEditor';

const MODAL_SIZE_CLASS =
    '!h-dvh !max-h-none !rounded-none [&>div:first-child]:hidden md:!h-[min(720px,calc(100dvh-32px))] md:!w-[min(960px,calc(100vw-32px))] md:!max-w-none md:!rounded-xl';

type CloseReason = ModalCloseReason | 'history';

// Mở lại sticker đã lưu: `files` chỉ gồm ảnh gốc của nó.
export interface StickerReedit {
    sticker: Pick<LibrarySticker, 'label' | 'keywords'>;
    edit: SavedStickerEdit | null;
}

interface StickerImageEditorProps {
    files: File[];
    reedit?: StickerReedit;
    rejected: RejectedUpload[];
    imageSize: number;
    limits: StickerLimits;
    onUpload: (file: File, upload: StickerUpload, options: UploadOptions) => Promise<UploadedSticker>;
    onUpdateExisting: (stickerId: number, changes: LibraryStickerChanges) => Promise<unknown>;
    onClose: (summary: EditorQueueSummary) => void;
}

type LoadState =
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'ready'; file: File; source: EditableSource; runner: StickerMaskRunner; initialDraft: StickerDraft };

const editorText = (key: string, params?: Record<string, string | number>) => t(`STICKER_LIBRARY.EDITOR.${key}`, params);

// Null = không mở ảnh nào (đang Lưu tất cả).
function useEditableSource(file: File | null, reedit: StickerReedit | undefined): LoadState {
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const restore = useMemo(() => (reedit ? { edit: reedit.edit } : undefined), [reedit]);

    useEffect(() => {
        if (!file) return undefined;
        let isCurrent = true;
        const runner = createStickerMaskRunner();
        setState({ status: 'loading' });

        openStickerSource(file, runner, restore)
            .then(({ source, initialDraft }) => {
                if (isCurrent) setState({ status: 'ready', file, source, runner, initialDraft });
            })
            .catch(() => {
                if (isCurrent) setState({ status: 'failed' });
            });

        return () => {
            isCurrent = false;
            runner.dispose();
        };
    }, [file, restore]);

    return state;
}

// Ảnh chưa mở trong lượt Lưu tất cả: khung mặc định như khi mở ảnh, xoá nền theo ảnh đang chỉnh.
async function defaultUpload(file: File, settings: BulkSaveSettings): Promise<StickerUpload> {
    const runner = createStickerMaskRunner();
    try {
        const { source, initialDraft } = await openStickerSource(file, runner);

        return { edit: toStickerEdit({ ...initialDraft, ...settings }, source.size), label: null, keywords: [] };
    } finally {
        runner.dispose();
    }
}

// Mở trình chỉnh thêm một mục lịch sử cùng URL: Back (cử chỉ trên điện thoại) đóng hộp thay vì rời
// trang. Mục bên dưới tạm để state null: router Inertia gặp popstate state null chỉ ghi lại state
// trang hiện tại, không dựng lại trang (dựng lại sẽ mất toast, ô vừa thêm nhấp sáng, bộ đang chọn).
const hasEditorEntry = () => Boolean((window.history.state as Record<string, unknown> | null)?.[EDITOR_HISTORY_STATE]);

function useHistoryEntry(onBack: () => void) {
    const onBackRef = useRef(onBack);
    const isReleasingRef = useRef(false);
    onBackRef.current = onBack;

    const push = useCallback(() => {
        const pageState: unknown = window.history.state;
        window.history.replaceState(null, '', window.location.href);
        window.history.pushState({ ...(pageState ?? {}), [EDITOR_HISTORY_STATE]: true }, '', window.location.href);
    }, []);

    useEffect(() => {
        push();
        const onPopState = () => {
            if (!isReleasingRef.current) onBackRef.current();
        };
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, [push]);

    const release = useCallback(() => {
        if (!hasEditorEntry()) return;
        isReleasingRef.current = true;
        window.history.back();
    }, []);

    return { push, release };
}

function useObjectUrls(files: readonly File[]): string[] {
    const urls = useMemo(() => (typeof URL.createObjectURL === 'function' ? files.map(file => URL.createObjectURL(file)) : files.map(() => '')), [files]);

    useEffect(() => () => urls.forEach(url => url && URL.revokeObjectURL(url)), [urls]);

    return urls;
}

const THUMB_STATUS_CLASS: Record<QueueItem['status'], string> = {
    pending: 'border-n-weak',
    saving: 'border-n-weak',
    saved: 'border-n-teal-8',
    existing: 'border-n-amber-8',
    skipped: 'border-n-weak opacity-40',
    failed: 'border-n-ruby-8',
};

function QueueStrip({ items, index, urls }: { items: QueueItem[]; index: number; urls: string[] }) {
    return (
        <ol aria-label={editorText('QUEUE')} className="m-0 flex h-14 shrink-0 list-none items-center gap-2 overflow-x-auto px-4 py-2">
            {items.map((item, itemIndex) => {
                const isCurrent = itemIndex === index;
                return (
                    <li
                        key={`${item.file.name}-${itemIndex}`}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`${item.file.name} · ${editorText(`QUEUE_STATUS.${item.status.toUpperCase()}`)}`}
                        className={`relative size-10 shrink-0 overflow-hidden rounded-md border-2 border-solid ${isCurrent ? 'border-n-brand' : THUMB_STATUS_CLASS[item.status]}`}
                    >
                        {urls[itemIndex] ? <img src={urls[itemIndex]} alt="" className="size-full object-cover" /> : null}
                        {item.status === 'saving' ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-n-solid-1/70">
                                <Spinner size={14} />
                            </span>
                        ) : null}
                        {item.status === 'failed' ? (
                            <span
                                aria-hidden="true"
                                className="absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-tl-md bg-n-ruby-9 text-white"
                            >
                                <span className="i-lucide-x size-3" />
                            </span>
                        ) : null}
                        {item.status === 'saved' || item.status === 'existing' ? (
                            <span
                                aria-hidden="true"
                                className={`absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-tl-md text-white ${item.status === 'saved' ? 'bg-n-teal-9' : 'bg-n-amber-9'}`}
                            >
                                <span className="i-lucide-check size-3" />
                            </span>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

function QueueSummary({ summary, rejectedCount }: { summary: EditorQueueSummary; rejectedCount: number }) {
    const parts = [
        editorText('SUMMARY_ADDED', { count: summary.addedIds.length }),
        ...(summary.skipped > 0 ? [editorText('SUMMARY_SKIPPED', { count: summary.skipped })] : []),
        ...(rejectedCount > 0 ? [editorText('SUMMARY_REJECTED', { count: rejectedCount })] : []),
        ...(summary.existingIds.length > 0 ? [editorText('SUMMARY_EXISTING', { count: summary.existingIds.length })] : []),
        ...(summary.failed.length > 0 ? [editorText('SUMMARY_FAILED', { count: summary.failed.length })] : []),
    ];

    return (
        <div role="status" className="flex min-h-0 flex-col items-center justify-center gap-3 overflow-y-auto p-8 text-center">
            <span
                className={`size-10 ${summary.failed.length > 0 ? 'i-lucide-circle-alert text-n-amber-9' : 'i-lucide-circle-check text-n-teal-9'}`}
                aria-hidden="true"
            />
            <p className="m-0 text-base font-medium text-n-slate-12">{parts.join(' · ')}</p>
            {summary.failed.length > 0 ? (
                <ul aria-label={editorText('SUMMARY_FAILED_LIST')} className="m-0 flex max-w-md list-none flex-col gap-1 p-0 text-left text-sm text-n-ruby-11">
                    {summary.failed.map(({ name, error }, index) => (
                        <li key={`${name}-${index}`} className="break-words">
                            {editorText('SUMMARY_FAILED_ITEM', { name, error })}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function BulkProgress({ done, total }: { done: number; total: number }) {
    return (
        <div role="status" aria-live="polite" className="flex min-h-0 flex-col items-center justify-center gap-3 p-8 text-center">
            <Spinner size={24} />
            <p className="m-0 text-sm font-medium text-n-slate-12">{editorText('BULK_PROGRESS', { done, total })}</p>
        </div>
    );
}

export default function StickerImageEditor({ files, reedit, rejected, imageSize, limits, onUpload, onUpdateExisting, onClose }: StickerImageEditorProps) {
    const [queue, dispatchQueue] = useReducer(editorQueueReducer, files, createQueue);
    const [existing, setExisting] = useState<{ index: number; sticker: UploadedSticker } | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmActionRequest | null>(null);
    const [isRejectedStripOpen, setRejectedStripOpen] = useState(rejected.length > 0);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const dirtyRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);
    const closedRef = useRef(false);
    const urls = useObjectUrls(files);

    const item = currentItem(queue);
    const bulk = bulkProgress(queue);
    const loadState = useEditableSource(bulk ? null : (item?.file ?? files[0]), reedit);
    const isSaving = item?.status === 'saving' || bulk !== null;
    const existingSticker = existing?.index === queue.index ? existing.sticker : null;
    const summary = summarizeQueue(queue);
    const showsSummary = queue.finished && (files.length > 1 || rejected.length > 0);

    const finishRef = useRef<(fromHistory: boolean) => void>(() => undefined);
    const requestCloseRef = useRef<(reason: CloseReason) => void>(() => undefined);
    const historyEntry = useHistoryEntry(() => requestCloseRef.current('history'));

    finishRef.current = fromHistory => {
        if (closedRef.current) return;
        closedRef.current = true;
        abortRef.current?.abort();
        if (!fromHistory) historyEntry.release();
        onClose(summarizeQueue(queue));
    };

    requestCloseRef.current = reason => {
        if (confirmation) return;
        const fromHistory = reason === 'history';
        if (queue.finished) {
            finishRef.current(fromHistory);
            return;
        }
        // Đang gửi thì nút X khoá; Esc và Back vẫn hỏi rồi huỷ lượt gửi (cả lượt Lưu tất cả).
        if (isSaving && (reason === 'button' || reason === 'backdrop')) return;
        const unsaved = unsavedCount(queue);
        if (unsaved === 0 || (!dirtyRef.current && !isSaving && !hasLaterItems(queue))) {
            finishRef.current(fromHistory);
            return;
        }
        setConfirmation({
            title: t('STICKER_LIBRARY.DISCARD_QUEUE_TITLE', { count: unsaved }),
            message: t('STICKER_LIBRARY.DISCARD_QUEUE_MESSAGE'),
            confirmLabel: t('STICKER_LIBRARY.DISCARD'),
            cancelLabel: t('STICKER_LIBRARY.KEEP_EDITING_IMAGES'),
            onConfirm: () => finishRef.current(fromHistory),
            onCancel: fromHistory ? historyEntry.push : undefined,
        });
    };

    useEffect(() => {
        if (queue.finished && !showsSummary) finishRef.current(false);
    }, [queue.finished, showsSummary]);

    const onDirtyChange = useCallback((dirty: boolean) => {
        dirtyRef.current = dirty;
    }, []);

    const save = async (upload: StickerUpload, onThrottleWait: (delayMs: number) => void) => {
        if (!item) return;
        const controller = new AbortController();
        abortRef.current = controller;
        const index = queue.index;
        dispatchQueue({ type: 'saving' });
        try {
            const result = await onUpload(item.file, upload, { signal: controller.signal, onThrottleWait });
            if (controller.signal.aborted) return;
            if (result.existing) setExisting({ index, sticker: result });
            dispatchQueue({ type: 'saved', stickerId: result.id, existing: result.existing });
        } catch (error) {
            if (!controller.signal.aborted) dispatchQueue({ type: 'save-failed' });
            throw error;
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
        }
    };

    const saveAll = async (upload: StickerUpload, settings: BulkSaveSettings, onThrottleWait: (delayMs: number) => void) => {
        if (!item || bulk) return;
        const controller = new AbortController();
        abortRef.current = controller;
        const indexes = queue.items.flatMap((queued, index) => (index >= queue.index && queued.status === 'pending' ? [index] : []));
        dispatchQueue({ type: 'bulk-start' });
        try {
            for (const index of indexes) {
                if (controller.signal.aborted) return;
                const file = queue.items[index].file;
                dispatchQueue({ type: 'bulk-saving', index });
                try {
                    const itemUpload = index === queue.index ? upload : await defaultUpload(file, settings);
                    const result = await onUpload(file, itemUpload, { signal: controller.signal, onThrottleWait });
                    if (controller.signal.aborted) return;
                    dispatchQueue({ type: 'bulk-saved', index, stickerId: result.id, existing: result.existing });
                } catch (error) {
                    if (controller.signal.aborted) return;
                    dispatchQueue({ type: 'bulk-failed', index, error: parseApiErrorMessage(error) || t('STICKER_LIBRARY.UPLOAD_FAILED') });
                }
            }
            dispatchQueue({ type: 'bulk-finish' });
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
        }
    };

    const updateExisting = async ({ label, keywords }: StickerUpload) => {
        if (!existingSticker) return;
        await onUpdateExisting(existingSticker.id, { label, keywords });
        dispatchQueue({ type: 'next' });
    };

    const skip = () => {
        dirtyRef.current = false;
        dispatchQueue({ type: existingSticker ? 'next' : 'skip' });
    };

    const position = queue.index + 1;
    const title = reedit
        ? editorText('REEDIT_TITLE')
        : queue.finished
          ? editorText('TITLE')
          : editorText('TITLE_WITH_POSITION', { index: position, total: files.length });

    const loadingBody = (
        <>
            <div className="flex min-h-0 flex-col items-center justify-center gap-3 p-8 text-center">
                {loadState.status === 'failed' && item ? (
                    <p role="alert" className="m-0 text-sm text-n-ruby-11">
                        {editorText('LOAD_FAILED')}
                    </p>
                ) : (
                    <>
                        <Spinner size={24} />
                        <p className="m-0 text-sm text-n-slate-11">{editorText('LOADING')}</p>
                    </>
                )}
            </div>
            <footer className="flex min-h-16 items-center gap-2 border-0 border-t border-solid border-n-weak px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
                <StickerButton tone="secondary" onClick={files.length > 1 ? skip : () => requestCloseRef.current('button')}>
                    {files.length > 1 ? editorText('SKIP') : editorText('CANCEL')}
                </StickerButton>
            </footer>
        </>
    );

    const summaryBody = (
        <>
            <QueueSummary summary={summary} rejectedCount={rejected.length} />
            <footer className="flex min-h-16 items-center justify-end gap-2 border-0 border-t border-solid border-n-weak px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
                <StickerButton tone="primary" onClick={() => finishRef.current(false)}>
                    {editorText('DONE')}
                </StickerButton>
            </footer>
        </>
    );

    return (
        <>
            <Modal
                open
                title={title}
                hideTitle
                initialFocusRef={titleRef}
                widthClassName={MODAL_SIZE_CLASS}
                onRequestClose={reason => requestCloseRef.current(reason)}
            >
                <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 flex-col border-0 border-b border-solid border-n-weak">
                        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
                            <div className="flex min-w-0 flex-1 flex-col">
                                <h3 ref={titleRef} tabIndex={-1} className="m-0 truncate text-base font-semibold text-n-slate-12 outline-none">
                                    {title}
                                </h3>
                                {item ? <span className="truncate text-xs text-n-slate-11">{item.file.name}</span> : null}
                            </div>
                            <IconButton
                                icon="i-lucide-x"
                                label={editorText('CLOSE')}
                                disabled={isSaving}
                                onClick={() => requestCloseRef.current('button')}
                            />
                        </header>
                        {files.length > 1 && !queue.finished ? <QueueStrip items={queue.items} index={queue.index} urls={urls} /> : null}
                        {isRejectedStripOpen ? (
                            <div role="status" className="flex items-center gap-2 bg-n-amber-3 px-4 py-1.5 text-sm text-n-amber-11">
                                <span className="min-w-0 flex-1">
                                    {editorText('REJECTED_STRIP', { valid: files.length, total: files.length + rejected.length, files: describeRejected(rejected) })}
                                </span>
                                <IconButton icon="i-lucide-x" label={t('STICKER_LIBRARY.DISMISS')} compact onClick={() => setRejectedStripOpen(false)} />
                            </div>
                        ) : null}
                    </div>
                    {showsSummary ? (
                        summaryBody
                    ) : bulk ? (
                        <BulkProgress done={bulk.done} total={bulk.total} />
                    ) : item && loadState.status === 'ready' && loadState.file === item.file ? (
                        <StickerEditorWorkspace
                            key={queue.index}
                            source={loadState.source}
                            runner={loadState.runner}
                            initialDraft={loadState.initialDraft}
                            initialMeta={reedit?.sticker}
                            imageSize={imageSize}
                            limits={limits}
                            position={position}
                            total={files.length}
                            hasLaterImages={hasLaterItems(queue)}
                            remainingImages={remainingCount(queue)}
                            isSaving={isSaving}
                            existing={existingSticker}
                            shortcutsPaused={confirmation !== null}
                            onSave={save}
                            onSaveAll={saveAll}
                            onUpdateExisting={updateExisting}
                            onSkip={skip}
                            onCancel={() => requestCloseRef.current('button')}
                            onDirtyChange={onDirtyChange}
                        />
                    ) : (
                        loadingBody
                    )}
                </div>
            </Modal>
            <ConfirmActionDialog request={confirmation} onClose={() => setConfirmation(null)} />
        </>
    );
}
