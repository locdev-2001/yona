import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { formatBytes } from 'shared/helpers/FileHelper';
import StickerImage from 'shared/sticker/StickerImage';
import { formatKeywords, parseKeywordInput } from './stickerKeywords';
import ConfirmActionDialog from './ConfirmActionDialog';
import type { ConfirmActionRequest } from './ConfirmActionDialog';
import StickerImageEditor from './StickerImageEditor';
import type { StickerLibraryApi, StickerUpload } from './stickerLibraryApi';
import { isAnimatedImageBytes } from './stickerSourceImage';
import { prepareStickerUpload } from './stickerUploadFile';
import {
    DANGER_BUTTON_CLASS,
    ICON_BUTTON_CLASS,
    INPUT_CLASS,
    PRIMARY_BUTTON_CLASS,
    SECONDARY_BUTTON_CLASS,
} from './stickerLibraryStyles';
import type {
    LibrarySticker,
    LibraryStickerChanges,
    LibraryStickerPack,
    LibraryStickerPackDetail,
    LibraryStickerStatus,
} from './types';

// Màn quản trị kho sticker dùng chung cho Super Admin và tenant: bộ sticker, thêm
// sticker từ ảnh (qua trình chỉnh), sắp xếp, sửa nhãn và từ khoá.

export const PROCESSING_POLL_INTERVAL_MS = 3000;

const STATUS_TONE: Record<LibraryStickerStatus, string> = {
    processing: 'bg-yellow-50 text-yellow-800',
    ready: 'bg-green-50 text-green-800',
    failed: 'bg-red-50 text-red-700',
};

interface EditorQueue {
    packId: number;
    files: File[];
    index: number;
}

// Cạnh tệp sticker khi máy chủ chưa báo (meta.image_size).
const FALLBACK_IMAGE_SIZE = 64;

const fileExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() ?? '';

const errorMessage = (error: unknown) => parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR');

const hasProcessing = (pack: LibraryStickerPackDetail | null) =>
    !!pack?.stickers.some(sticker => sticker.status === 'processing');

function PackListItem({
    pack,
    selected,
    onSelect,
}: {
    pack: LibraryStickerPack;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                aria-current={selected ? 'true' : undefined}
                className={`reset-base flex w-full items-center gap-3 rounded-lg border-0 px-2 py-2 text-left text-slate-900 shadow-none hover:bg-slate-50 ${selected ? 'bg-slate-100 ring-1 ring-woot-500' : 'bg-white'}`}
            >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                    {pack.cover_url ? <img src={pack.cover_url} alt="" className="size-10 object-contain" /> : null}
                </span>
                <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-slate-900">{pack.name}</span>
                    <span className="text-xs text-slate-600">
                        {t('STICKER_LIBRARY.STICKERS_COUNT', { count: pack.stickers_count ?? 0 })} ·{' '}
                        {pack.published ? t('STICKER_LIBRARY.PUBLISHED') : t('STICKER_LIBRARY.DRAFT')}
                    </span>
                </span>
            </button>
        </li>
    );
}

function StickerDetailsForm({
    sticker,
    busy,
    onSave,
    onCancel,
}: {
    sticker: LibrarySticker;
    busy: boolean;
    onSave: (changes: LibraryStickerChanges) => void;
    onCancel: () => void;
}) {
    const [labelDraft, setLabelDraft] = useState(sticker.label ?? '');
    const [keywordsDraft, setKeywordsDraft] = useState(formatKeywords(sticker.keywords));

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSave({ label: labelDraft.trim() || null, keywords: parseKeywordInput(keywordsDraft) });
    };

    return (
        <form className="flex flex-col gap-2" onSubmit={submit}>
            <label className="flex flex-col gap-1 text-xs text-slate-700">
                {t('STICKER_LIBRARY.LABEL')}
                <input
                    className={INPUT_CLASS}
                    value={labelDraft}
                    onChange={event => setLabelDraft(event.target.value)}
                    maxLength={100}
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
            <p className="text-xs text-slate-600">{t('STICKER_LIBRARY.KEYWORDS_HINT')}</p>
            <div className="flex gap-2">
                <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={busy}>
                    {t('STICKER_LIBRARY.SAVE_STICKER')}
                </button>
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onCancel} disabled={busy}>
                    {t('STICKER_LIBRARY.CANCEL')}
                </button>
            </div>
        </form>
    );
}

function StickerDetails({ sticker }: { sticker: LibrarySticker }) {
    return (
        <div className="flex flex-col gap-1">
            {sticker.label ? <span className="truncate text-sm text-slate-900">{sticker.label}</span> : null}
            {sticker.keywords.length > 0 ? (
                <ul className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label={t('STICKER_LIBRARY.KEYWORDS')}>
                    {sticker.keywords.map(keyword => (
                        <li key={keyword} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
                            {keyword}
                        </li>
                    ))}
                </ul>
            ) : (
                <span className="text-xs text-slate-600">{t('STICKER_LIBRARY.NO_KEYWORDS')}</span>
            )}
        </div>
    );
}

function StickerCard({
    sticker,
    isFirst,
    isLast,
    busy,
    onMove,
    onDelete,
    onSaveDetails,
}: {
    sticker: LibrarySticker;
    isFirst: boolean;
    isLast: boolean;
    busy: boolean;
    onMove: (offset: -1 | 1) => void;
    onDelete: () => void;
    onSaveDetails: (changes: LibraryStickerChanges) => Promise<boolean>;
}) {
    const [isEditing, setEditing] = useState(false);

    const saveDetails = async (changes: LibraryStickerChanges) => {
        if (await onSaveDetails(changes)) setEditing(false);
    };

    return (
        <li className="flex flex-col gap-2 rounded-lg border border-slate-100 p-2" data-testid="library-sticker">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-slate-50">
                {sticker.image_url ? <StickerImage src={sticker.image_url} alt={sticker.label ?? ''} /> : null}
            </div>
            <span className={`self-start rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_TONE[sticker.status]}`}>
                {t(`STICKER_LIBRARY.STATUS.${sticker.status}`)}
            </span>
            {sticker.failure_message ? <p className="text-xs text-red-700">{sticker.failure_message}</p> : null}
            {isEditing ? (
                <StickerDetailsForm
                    sticker={sticker}
                    busy={busy}
                    onSave={changes => void saveDetails(changes)}
                    onCancel={() => setEditing(false)}
                />
            ) : (
                <StickerDetails sticker={sticker} />
            )}
            <div className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    className={ICON_BUTTON_CLASS}
                    onClick={() => onMove(-1)}
                    disabled={busy || isFirst}
                    aria-label={t('STICKER_LIBRARY.MOVE_UP')}
                    title={t('STICKER_LIBRARY.MOVE_UP')}
                >
                    ←
                </button>
                <button
                    type="button"
                    className={ICON_BUTTON_CLASS}
                    onClick={() => onMove(1)}
                    disabled={busy || isLast}
                    aria-label={t('STICKER_LIBRARY.MOVE_DOWN')}
                    title={t('STICKER_LIBRARY.MOVE_DOWN')}
                >
                    →
                </button>
                <button
                    type="button"
                    className={ICON_BUTTON_CLASS}
                    onClick={() => setEditing(editing => !editing)}
                    disabled={busy}
                    aria-label={t('STICKER_LIBRARY.EDIT_STICKER')}
                    aria-expanded={isEditing}
                    title={t('STICKER_LIBRARY.EDIT_STICKER')}
                >
                    ✎
                </button>
                <button
                    type="button"
                    className={`${ICON_BUTTON_CLASS} ml-auto text-red-700`}
                    onClick={onDelete}
                    disabled={busy}
                    aria-label={t('STICKER_LIBRARY.DELETE_STICKER')}
                    title={t('STICKER_LIBRARY.DELETE_STICKER')}
                >
                    ✕
                </button>
            </div>
        </li>
    );
}

export default function StickerLibraryManager({ api }: { api: StickerLibraryApi }) {
    const [packs, setPacks] = useState<LibraryStickerPack[]>([]);
    const [maxUploadKb, setMaxUploadKb] = useState(0);
    const [acceptedExtensions, setAcceptedExtensions] = useState<string[]>([]);
    const [imageSize, setImageSize] = useState(FALLBACK_IMAGE_SIZE);
    const [isLoading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [selectedPack, setSelectedPack] = useState<LibraryStickerPackDetail | null>(null);
    const [newPackName, setNewPackName] = useState('');
    const [nameDraft, setNameDraft] = useState('');
    const [isBusy, setBusy] = useState(false);
    const [editorQueue, setEditorQueue] = useState<EditorQueue | null>(null);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmActionRequest | null>(null);
    const closeConfirmation = useCallback(() => setPendingConfirmation(null), []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadPacks = useCallback(async () => {
        try {
            const listing = await api.listPacks();
            setPacks(listing.payload);
            setMaxUploadKb(listing.meta.max_upload_kb);
            setAcceptedExtensions(listing.meta.accepted_extensions);
            setImageSize(listing.meta.image_size || FALLBACK_IMAGE_SIZE);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        void loadPacks();
    }, [loadPacks]);

    const showPack = (pack: LibraryStickerPackDetail) => {
        setSelectedPack(pack);
        setNameDraft(pack.name);
    };

    const selectedPackId = selectedPack?.id;
    const waitingForRender = hasProcessing(selectedPack);

    useEffect(() => {
        if (!waitingForRender || selectedPackId === undefined) return undefined;

        const timer = window.setTimeout(() => {
            api.getPack(selectedPackId)
                .then(pack => {
                    setSelectedPack(current => (current?.id === pack.id ? pack : current));
                    if (!hasProcessing(pack)) void loadPacks();
                })
                .catch(() => undefined);
        }, PROCESSING_POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [api, loadPacks, selectedPack, selectedPackId, waitingForRender]);

    const runAction = async (action: () => Promise<void>) => {
        setBusy(true);
        setActionError(null);
        try {
            await action();
        } catch (error) {
            setActionError(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const selectPack = (packId: number) =>
        runAction(async () => {
            setUploadErrors([]);
            showPack(await api.getPack(packId));
        });

    const createPack = (event: FormEvent) => {
        event.preventDefault();
        const name = newPackName.trim();
        if (!name) return;

        void runAction(async () => {
            const pack = await api.createPack(name);
            setNewPackName('');
            showPack(pack);
            await loadPacks();
        });
    };

    const renamePack = (event: FormEvent) => {
        event.preventDefault();
        const name = nameDraft.trim();
        if (!selectedPack || !name) return;

        void runAction(async () => {
            showPack(await api.renamePack(selectedPack.id, name));
            await loadPacks();
        });
    };

    const togglePublished = () => {
        if (!selectedPack) return;

        void runAction(async () => {
            showPack(await api.setPublished(selectedPack.id, !selectedPack.published));
            await loadPacks();
        });
    };

    const deletePack = () => {
        if (!selectedPack) return;

        setPendingConfirmation({
            title: t('STICKER_LIBRARY.DELETE_PACK'),
            message: t('STICKER_LIBRARY.DELETE_PACK_CONFIRM', { name: selectedPack.name }),
            confirmLabel: t('STICKER_LIBRARY.DELETE_PACK'),
            onConfirm: () =>
                void runAction(async () => {
                    await api.deletePack(selectedPack.id);
                    setSelectedPack(null);
                    await loadPacks();
                }),
        });
    };

    const uploadLimitBytes = maxUploadKb * 1024;
    const uploadLimit = formatBytes(uploadLimitBytes, 1);

    // Ảnh tĩnh quá nặng sẽ được thu nhỏ lúc lưu; chỉ ảnh động quá nặng mới bị từ chối ngay.
    const rejectionOf = async (file: File): Promise<string | null> => {
        if (!acceptedExtensions.includes(fileExtension(file))) {
            return t('STICKER_LIBRARY.FILE_TYPE_REJECTED', { filename: file.name });
        }
        if (uploadLimitBytes > 0 && file.size > uploadLimitBytes && isAnimatedImageBytes(new Uint8Array(await file.arrayBuffer()))) {
            return t('STICKER_LIBRARY.FILE_ANIMATED_TOO_LARGE', { filename: file.name, limit: uploadLimit });
        }
        return null;
    };

    const openEditor = async (files: File[]) => {
        if (!selectedPack || files.length === 0) return;
        const packId = selectedPack.id;
        const rejections = await Promise.all(files.map(rejectionOf));
        const editable = files.filter((_, index) => rejections[index] === null);
        setUploadErrors(rejections.filter((message): message is string => message !== null));
        if (editable.length > 0) setEditorQueue({ packId, files: editable, index: 0 });
    };

    const refreshPack = (packId: number) =>
        runAction(async () => {
            const pack = await api.getPack(packId);
            setSelectedPack(current => (current?.id === pack.id ? pack : current));
            await loadPacks();
        });

    const advanceEditor = () =>
        setEditorQueue(queue => (queue && queue.index + 1 < queue.files.length ? { ...queue, index: queue.index + 1 } : null));

    const saveEditedSticker = async (upload: StickerUpload) => {
        if (!editorQueue) return;
        const { packId, files, index } = editorQueue;
        await api.uploadSticker(packId, await prepareStickerUpload(files[index], uploadLimitBytes), upload);
        advanceEditor();
        void refreshPack(packId);
    };

    const moveSticker = (stickerId: number, offset: -1 | 1) => {
        if (!selectedPack) return;
        const orderedIds = selectedPack.stickers.map(sticker => sticker.id);
        const from = orderedIds.indexOf(stickerId);
        const to = from + offset;
        if (from < 0 || to < 0 || to >= orderedIds.length) return;
        [orderedIds[from], orderedIds[to]] = [orderedIds[to], orderedIds[from]];

        void runAction(async () => {
            showPack(await api.reorderStickers(selectedPack.id, orderedIds));
            await loadPacks();
        });
    };

    const saveStickerDetails = async (stickerId: number, changes: LibraryStickerChanges): Promise<boolean> => {
        if (!selectedPack) return false;
        const packId = selectedPack.id;
        let saved = false;

        await runAction(async () => {
            const updated = await api.updateSticker(packId, stickerId, changes);
            setSelectedPack(current =>
                current?.id === packId
                    ? { ...current, stickers: current.stickers.map(sticker => (sticker.id === updated.id ? updated : sticker)) }
                    : current,
            );
            saved = true;
        });

        return saved;
    };

    const deleteSticker = (stickerId: number) => {
        if (!selectedPack) return;

        setPendingConfirmation({
            title: t('STICKER_LIBRARY.DELETE_STICKER'),
            message: t('STICKER_LIBRARY.DELETE_STICKER_CONFIRM'),
            confirmLabel: t('STICKER_LIBRARY.DELETE_STICKER'),
            onConfirm: () =>
                void runAction(async () => {
                    await api.deleteSticker(selectedPack.id, stickerId);
                    showPack(await api.getPack(selectedPack.id));
                    await loadPacks();
                }),
        });
    };

    if (isLoading) {
        return <p className="p-4 text-sm text-slate-600">{t('STICKER_LIBRARY.LOADING')}</p>;
    }

    if (loadFailed) {
        return (
            <div className="flex items-center gap-3 p-4 text-sm text-red-700">
                <span>{t('STICKER_LIBRARY.LOAD_ERROR')}</span>
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => void loadPacks()}>
                    {t('STICKER_LIBRARY.RETRY')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-start">
            <aside className="flex w-full flex-col gap-3 md:w-72 md:shrink-0">
                <h2 className="text-sm font-semibold text-slate-900">{t('STICKER_LIBRARY.PACKS_TITLE')}</h2>
                <form className="flex gap-2" onSubmit={createPack}>
                    <input
                        className={INPUT_CLASS}
                        value={newPackName}
                        onChange={event => setNewPackName(event.target.value)}
                        placeholder={t('STICKER_LIBRARY.NEW_PACK_PLACEHOLDER')}
                        aria-label={t('STICKER_LIBRARY.NEW_PACK_PLACEHOLDER')}
                        maxLength={100}
                    />
                    <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={isBusy || !newPackName.trim()}>
                        {t('STICKER_LIBRARY.CREATE_PACK')}
                    </button>
                </form>
                {packs.length === 0 ? (
                    <p className="text-sm text-slate-600">{t('STICKER_LIBRARY.EMPTY')}</p>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {packs.map(pack => (
                            <PackListItem
                                key={pack.id}
                                pack={pack}
                                selected={pack.id === selectedPackId}
                                onSelect={() => void selectPack(pack.id)}
                            />
                        ))}
                    </ul>
                )}
            </aside>

            <section className="flex min-w-0 flex-1 flex-col gap-4 rounded-lg border border-slate-100 bg-white p-4">
                {actionError ? (
                    <p role="alert" className="text-sm text-red-700">
                        {actionError}
                    </p>
                ) : null}
                {!selectedPack ? (
                    <p className="text-sm text-slate-600">{t('STICKER_LIBRARY.SELECT_PACK')}</p>
                ) : (
                    <>
                        <form className="flex flex-wrap items-end gap-2" onSubmit={renamePack}>
                            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-slate-700">
                                {t('STICKER_LIBRARY.PACK_NAME_LABEL')}
                                <input
                                    className={INPUT_CLASS}
                                    value={nameDraft}
                                    onChange={event => setNameDraft(event.target.value)}
                                    maxLength={100}
                                />
                            </label>
                            <button
                                type="submit"
                                className={SECONDARY_BUTTON_CLASS}
                                disabled={isBusy || !nameDraft.trim() || nameDraft.trim() === selectedPack.name}
                            >
                                {t('STICKER_LIBRARY.SAVE_NAME')}
                            </button>
                            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={togglePublished} disabled={isBusy}>
                                {selectedPack.published ? t('STICKER_LIBRARY.UNPUBLISH') : t('STICKER_LIBRARY.PUBLISH')}
                            </button>
                            <button type="button" className={DANGER_BUTTON_CLASS} onClick={deletePack} disabled={isBusy}>
                                {t('STICKER_LIBRARY.DELETE_PACK')}
                            </button>
                        </form>

                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className={PRIMARY_BUTTON_CLASS}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isBusy || editorQueue !== null}
                                >
                                    {t('STICKER_LIBRARY.UPLOAD')}
                                </button>
                                <span className="text-xs text-slate-600">
                                    {t('STICKER_LIBRARY.UPLOAD_HINT', { limit: uploadLimit, size: imageSize })}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    hidden
                                    data-testid="sticker-file-input"
                                    accept={acceptedExtensions.map(extension => `.${extension}`).join(',')}
                                    onChange={event => {
                                        const files = Array.from(event.target.files ?? []);
                                        event.target.value = '';
                                        void openEditor(files);
                                    }}
                                />
                            </div>
                            {uploadErrors.length > 0 ? (
                                <ul role="alert" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-red-700">
                                    {uploadErrors.map(message => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>

                        {selectedPack.stickers.length === 0 ? (
                            <p className="text-sm text-slate-600">{t('STICKER_LIBRARY.NO_STICKERS')}</p>
                        ) : (
                            <ul className="m-0 grid list-none grid-cols-2 p-0 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {selectedPack.stickers.map((sticker, index) => (
                                    <StickerCard
                                        key={sticker.id}
                                        sticker={sticker}
                                        isFirst={index === 0}
                                        isLast={index === selectedPack.stickers.length - 1}
                                        busy={isBusy}
                                        onMove={offset => moveSticker(sticker.id, offset)}
                                        onDelete={() => deleteSticker(sticker.id)}
                                        onSaveDetails={changes => saveStickerDetails(sticker.id, changes)}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </section>
            <ConfirmActionDialog request={pendingConfirmation} onClose={closeConfirmation} />
            {editorQueue ? (
                <StickerImageEditor
                    key={`${editorQueue.packId}-${editorQueue.index}`}
                    file={editorQueue.files[editorQueue.index]}
                    position={editorQueue.index + 1}
                    total={editorQueue.files.length}
                    imageSize={imageSize}
                    onSave={saveEditedSticker}
                    onSkip={advanceEditor}
                    onClose={() => setEditorQueue(null)}
                />
            ) : null}
        </div>
    );
}
