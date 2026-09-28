import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';

import { t } from '../../../i18n';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { formatBytes } from 'shared/helpers/FileHelper';
import { currentQuery, replaceQuery } from '../../reports/helpers/urlQuery';
import ConfirmActionDialog from './ConfirmActionDialog';
import type { ConfirmActionRequest } from './ConfirmActionDialog';
import StickerDetailPanel from './StickerDetailPanel';
import type { StickerSaveResult } from './StickerDetailPanel';
import StickerGrid from './StickerGrid';
import type { StickerMoveTarget } from './StickerGrid';
import StickerImageEditor from './StickerImageEditor';
import StickerPackHeader from './StickerPackHeader';
import StickerPackList from './StickerPackList';
import { StickerThumb } from './StickerTile';
import type { StickerLibraryApi, StickerLibraryKind, StickerUpload, UploadOptions } from './stickerLibraryApi';
import { DEFAULT_STICKER_LIMITS, stickerLimitsFromMeta, stickerMetaErrorsFromApi } from './stickerLimits';
import {
    MOBILE_QUERY,
    Modal,
    StickerButton,
    StickerToastProvider,
    WIDE_QUERY,
    useMediaQuery,
    useStickerToast,
} from './stickerLibraryUi';
import { describeRejected, prepareUploadQueue } from './prepareUploadQueue';
import type { RejectedUpload } from './prepareUploadQueue';
import type { EditorQueueSummary } from './stickerEditorQueue';
import { prepareStickerUpload } from './stickerUploadFile';
import { useProcessingPoll } from './useProcessingPoll';
import type { LibrarySticker, LibraryStickerChanges, LibraryStickerPack, LibraryStickerPackDetail, StickerLibraryListing } from './types';

export const PACK_QUERY_KEY = 'pack';
export const REORDER_DEBOUNCE_MS = 400;
const FLASH_MS = 1500;
const MOBILE_SCREEN_STATE = 'stickerPackScreen';

type LoadState = 'loading' | 'failed' | 'ready';

// Chuyển bộ đang mở sang kho còn lại; chỉ có khi người dùng được phép.
export interface PackTransfer {
    destination: StickerLibraryKind;
    movePack: (packId: number) => Promise<LibraryStickerPackDetail>;
    openDestination: (packId: number) => void;
}

const MOVE_PACK_COPY: Record<StickerLibraryKind, { menu: string; title: string; message: string; done: string }> = {
    account: {
        menu: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.MENU',
        title: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.TITLE',
        message: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.MESSAGE',
        done: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.DONE',
    },
    platform: {
        menu: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.MENU',
        title: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.TITLE',
        message: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.MESSAGE',
        done: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.DONE',
    },
};

interface Pending {
    creating: boolean;
    rename: boolean;
    publish: boolean;
    reorder: boolean;
    deleting: ReadonlySet<number>;
    saving: ReadonlySet<number>;
}

const IDLE: Pending = { creating: false, rename: false, publish: false, reorder: false, deleting: new Set(), saving: new Set() };

interface EditorSession {
    packId: number;
    files: File[];
    rejected: RejectedUpload[];
}

const POLLED_FIELDS = ['status', 'image_url', 'static_url', 'frames', 'failure_message', 'width', 'height'] as const;

const queryPackId = () => {
    const value = Number(currentQuery()[PACK_QUERY_KEY]);

    return Number.isInteger(value) && value > 0 ? value : null;
};
const withToggled = (set: ReadonlySet<number>, id: number, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);

    return next;
};
const orderStickers = (stickers: LibrarySticker[], ids: number[]) => {
    const byId = new Map(stickers.map(sticker => [sticker.id, sticker]));

    return ids.map(id => byId.get(id)).filter((sticker): sticker is LibrarySticker => sticker !== undefined);
};
const packSummary = (detail: LibraryStickerPackDetail): LibraryStickerPack => ({
    id: detail.id,
    name: detail.name,
    published: detail.published,
    published_at: detail.published_at,
    stickers_count: detail.stickers.length,
    cover_url: detail.stickers[0]?.image_url ?? null,
});

function StickerLibrary({ api, packTransfer }: StickerLibraryManagerProps) {
    const toast = useStickerToast();
    const isMobile = useMediaQuery(MOBILE_QUERY);
    const isWide = useMediaQuery(WIDE_QUERY);

    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [isRetrying, setRetrying] = useState(false);
    const [packs, setPacks] = useState<LibraryStickerPack[]>([]);
    const [meta, setMeta] = useState<StickerLibraryListing['meta'] | null>(null);
    const [requestedPackId, setRequestedPackId] = useState<number | null>(queryPackId);
    const [detail, setDetail] = useState<LibraryStickerPackDetail | null>(null);
    const [pending, setPending] = useState<Pending>(IDLE);
    const [selectedStickerId, setSelectedStickerId] = useState<number | null>(null);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [sortBaseline, setSortBaseline] = useState<number[] | null>(null);
    const [editorSession, setEditorSession] = useState<EditorSession | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmActionRequest | null>(null);
    const [flashIds, setFlashIds] = useState<ReadonlySet<number>>(new Set());
    const [isDraggingFiles, setDraggingFiles] = useState(false);

    const limits = useMemo(() => (meta ? stickerLimitsFromMeta(meta) : DEFAULT_STICKER_LIMITS), [meta]);
    const uploadLimitBytes = (meta?.max_upload_kb ?? 0) * 1024;
    const uploadLimit = formatBytes(uploadLimitBytes, 1);
    const acceptedExtensions = meta?.accepted_extensions ?? [];

    const selectedPackId =
        requestedPackId !== null && packs.some(pack => pack.id === requestedPackId) ? requestedPackId : isMobile ? null : (packs[0]?.id ?? null);
    const currentDetail = detail?.id === selectedPackId ? detail : null;

    const selectedPackRef = useRef(selectedPackId);
    selectedPackRef.current = selectedPackId;
    const loadedPackRef = useRef<number | null>(null);
    loadedPackRef.current = detail?.id ?? null;
    const loadSeq = useRef(0);
    const mutationSeq = useRef(0);
    const detailDirty = useRef(false);
    const reorderTimer = useRef<number | undefined>(undefined);
    const reorderBaseline = useRef<{ packId: number; ids: number[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setPendingFlag = (key: 'creating' | 'rename' | 'publish' | 'reorder', on: boolean) => setPending(current => ({ ...current, [key]: on }));
    const errorToast = useCallback((error: unknown) => toast({ message: parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR'), tone: 'error' }), [toast]);

    const updateDetail = useCallback((packId: number, update: (pack: LibraryStickerPackDetail) => LibraryStickerPackDetail) => {
        mutationSeq.current += 1;
        setDetail(current => (current?.id === packId ? update(current) : current));
    }, []);

    const mergePackSummary = useCallback((summary: Partial<LibraryStickerPack> & { id: number }) => {
        setPacks(current => current.map(pack => (pack.id === summary.id ? { ...pack, ...summary } : pack)));
    }, []);

    const loadPacks = useCallback(
        async (mode: 'initial' | 'refresh') => {
            try {
                const listing = await api.listPacks();
                setPacks(listing.payload);
                setMeta(listing.meta);
                setLoadState('ready');
            } catch {
                if (mode === 'initial') setLoadState(current => (current === 'ready' ? current : 'failed'));
                else toast({ message: t('STICKER_LIBRARY.REFRESH_FAILED'), tone: 'error', action: { label: t('STICKER_LIBRARY.RETRY'), onClick: () => void loadPacks('refresh') } });
            }
        },
        [api, toast],
    );

    useEffect(() => {
        void loadPacks('initial');
    }, [loadPacks]);

    // Chỉ nhận phản hồi của lượt tải mới nhất, cho đúng bộ đang chọn, và chưa bị thao tác nào sau đó vượt mặt.
    const loadDetail = useCallback(
        async (packId: number) => {
            const seq = (loadSeq.current += 1);
            const mutationAtIssue = mutationSeq.current;
            try {
                const pack = await api.getPack(packId);
                if (seq !== loadSeq.current || selectedPackRef.current !== packId) return;
                if (mutationAtIssue !== mutationSeq.current && loadedPackRef.current === packId) {
                    void loadDetail(packId);
                    return;
                }
                setDetail(pack);
                mergePackSummary(packSummary(pack));
            } catch {
                if (selectedPackRef.current === packId) {
                    toast({ message: t('STICKER_LIBRARY.REFRESH_FAILED'), tone: 'error', action: { label: t('STICKER_LIBRARY.RETRY'), onClick: () => void loadDetail(packId) } });
                }
            }
        },
        [api, mergePackSummary, toast],
    );

    useEffect(() => {
        setSelectedStickerId(null);
        setSortBaseline(null);
        if (selectedPackId !== null) void loadDetail(selectedPackId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPackId]);

    useEffect(() => {
        const onPopState = () => setRequestedPackId(queryPackId());
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const writePackQuery = (packId: number | null, push: boolean) => {
        const { [PACK_QUERY_KEY]: _previous, ...others } = currentQuery();
        const params = packId === null ? others : { ...others, [PACK_QUERY_KEY]: String(packId) };
        if (push) {
            const search = new URLSearchParams(params).toString();
            // Mục bên dưới để state null: Back về danh sách thì Inertia không dựng lại cả trang (mất toast, bộ đang chọn).
            const pageState: unknown = window.history.state;
            window.history.replaceState(null, '', window.location.href);
            window.history.pushState({ ...(pageState ?? {}), [MOBILE_SCREEN_STATE]: true }, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
        } else {
            replaceQuery(params);
        }
    };

    const confirmDiscardThen = (action: () => void) => {
        if (!detailDirty.current) {
            action();
            return;
        }
        setConfirmation({
            title: t('STICKER_LIBRARY.DISCARD_CHANGES_TITLE'),
            message: t('STICKER_LIBRARY.DISCARD_CHANGES_MESSAGE'),
            confirmLabel: t('STICKER_LIBRARY.DISCARD'),
            cancelLabel: t('STICKER_LIBRARY.KEEP_EDITING'),
            onConfirm: () => {
                detailDirty.current = false;
                action();
            },
        });
    };

    const selectPack = (packId: number) =>
        confirmDiscardThen(() => {
            setRequestedPackId(packId);
            writePackQuery(packId, isMobile && packId !== selectedPackId);
        });

    const backToList = () =>
        confirmDiscardThen(() => {
            if (window.history.state?.[MOBILE_SCREEN_STATE]) {
                window.history.back();
                return;
            }
            setRequestedPackId(null);
            writePackQuery(null, false);
        });

    const createPack = async (name: string) => {
        setPendingFlag('creating', true);
        try {
            const pack = await api.createPack(name);
            setPacks(current => [...current, packSummary(pack)]);
            setDetail(pack);
            setCreateOpen(false);
            setRequestedPackId(pack.id);
            writePackQuery(pack.id, isMobile);
            void loadPacks('refresh');
        } catch (error) {
            errorToast(error);
        } finally {
            setPendingFlag('creating', false);
        }
    };

    const renamePack = async (name: string): Promise<boolean> => {
        if (!currentDetail) return false;
        const packId = currentDetail.id;
        setPendingFlag('rename', true);
        try {
            const pack = await api.renamePack(packId, name);
            updateDetail(packId, current => ({ ...current, name: pack.name }));
            mergePackSummary({ id: packId, name: pack.name });
            toast({ message: t('STICKER_LIBRARY.RENAMED') });

            return true;
        } catch (error) {
            errorToast(error);

            return false;
        } finally {
            setPendingFlag('rename', false);
        }
    };

    const setPublished = async (published: boolean) => {
        if (!currentDetail) return;
        const { id: packId, name } = currentDetail;
        setPendingFlag('publish', true);
        try {
            const pack = await api.setPublished(packId, published);
            updateDetail(packId, current => ({ ...current, published: pack.published, published_at: pack.published_at }));
            mergePackSummary({ id: packId, published: pack.published, published_at: pack.published_at });
            toast(
                pack.published
                    ? { message: t('STICKER_LIBRARY.PUBLISHED_TOAST', { name }) }
                    : { message: t('STICKER_LIBRARY.UNPUBLISHED_TOAST'), action: { label: t('STICKER_LIBRARY.UNDO'), onClick: () => void republish(packId) } },
            );
        } catch (error) {
            errorToast(error);
        } finally {
            setPendingFlag('publish', false);
        }
    };

    const republish = async (packId: number) => {
        try {
            const pack = await api.setPublished(packId, true);
            updateDetail(packId, current => ({ ...current, published: pack.published, published_at: pack.published_at }));
            mergePackSummary({ id: packId, published: pack.published, published_at: pack.published_at });
        } catch (error) {
            errorToast(error);
        }
    };

    const deletePack = () => {
        if (!currentDetail) return;
        const { id: packId, name } = currentDetail;
        setConfirmation({
            title: t('STICKER_LIBRARY.DELETE_PACK'),
            message: t('STICKER_LIBRARY.DELETE_PACK_CONFIRM', { name, count: currentDetail.stickers.length }),
            confirmLabel: t('STICKER_LIBRARY.DELETE_PACK'),
            onConfirm: async () => {
                try {
                    await api.deletePack(packId);
                    dropPackAndSelectNeighbour(packId);
                    toast({ message: t('STICKER_LIBRARY.PACK_DELETED', { name }) });
                } catch (error) {
                    errorToast(error);
                }
            },
        });
    };

    const movePack = () => {
        if (!currentDetail || !packTransfer) return;
        const { id: packId, name } = currentDetail;
        const copy = MOVE_PACK_COPY[packTransfer.destination];
        setConfirmation({
            title: t(copy.title),
            message: t(copy.message, { name }),
            confirmLabel: t(copy.menu),
            tone: 'primary',
            onConfirm: async () => {
                try {
                    await packTransfer.movePack(packId);
                    dropPackAndSelectNeighbour(packId);
                    toast({
                        message: t(copy.done, { name }),
                        action: { label: t('STICKER_LIBRARY.OPEN_MOVED_PACK'), onClick: () => packTransfer.openDestination(packId) },
                    });
                } catch (error) {
                    errorToast(error);
                }
            },
        });
    };

    const dropPackAndSelectNeighbour = (packId: number) => {
        const index = packs.findIndex(pack => pack.id === packId);
        const remaining = packs.filter(pack => pack.id !== packId);
        const neighbour = remaining[index] ?? remaining[index - 1] ?? null;
        setPacks(remaining);
        setDetail(null);
        const nextId = isMobile ? null : (neighbour?.id ?? null);
        setRequestedPackId(nextId);
        writePackQuery(nextId, false);
        void loadPacks('refresh');
    };

    const persistOrder = (packId: number, ids: number[]) => {
        window.clearTimeout(reorderTimer.current);
        reorderTimer.current = window.setTimeout(async () => {
            setPendingFlag('reorder', true);
            try {
                await api.reorderStickers(packId, ids);
                reorderBaseline.current = null;
                void loadPacks('refresh');
            } catch {
                const baseline = reorderBaseline.current;
                reorderBaseline.current = null;
                if (baseline?.packId === packId) updateDetail(packId, current => ({ ...current, stickers: orderStickers(current.stickers, baseline.ids) }));
                toast({ message: t('STICKER_LIBRARY.REORDER_FAILED'), tone: 'error' });
            } finally {
                setPendingFlag('reorder', false);
            }
        }, REORDER_DEBOUNCE_MS);
    };

    const applyLocalOrder = (ids: number[]) => {
        if (!currentDetail) return;
        const packId = currentDetail.id;
        if (!reorderBaseline.current) reorderBaseline.current = { packId, ids: currentDetail.stickers.map(sticker => sticker.id) };
        updateDetail(packId, current => ({ ...current, stickers: orderStickers(current.stickers, ids) }));
    };

    const reorderStickers = (ids: number[]) => {
        if (!currentDetail) return;
        applyLocalOrder(ids);
        if (sortBaseline === null) persistOrder(currentDetail.id, ids);
    };

    const moveSticker = (stickerId: number, target: StickerMoveTarget) => {
        if (!currentDetail) return;
        const rest = currentDetail.stickers.map(sticker => sticker.id).filter(id => id !== stickerId);
        reorderStickers(target === 'first' ? [stickerId, ...rest] : [...rest, stickerId]);
    };

    const failedFirst = () => {
        if (!currentDetail) return;
        const failed = currentDetail.stickers.filter(sticker => sticker.status === 'failed').map(sticker => sticker.id);
        const others = currentDetail.stickers.filter(sticker => sticker.status !== 'failed').map(sticker => sticker.id);
        reorderStickers([...failed, ...others]);
    };

    const startSort = () => currentDetail && setSortBaseline(currentDetail.stickers.map(sticker => sticker.id));
    const cancelSort = () => {
        if (currentDetail && sortBaseline) updateDetail(currentDetail.id, current => ({ ...current, stickers: orderStickers(current.stickers, sortBaseline) }));
        reorderBaseline.current = null;
        setSortBaseline(null);
    };
    const finishSort = () => {
        if (currentDetail && sortBaseline) {
            const ids = currentDetail.stickers.map(sticker => sticker.id);
            if (ids.join() !== sortBaseline.join()) persistOrder(currentDetail.id, ids);
            else reorderBaseline.current = null;
        }
        setSortBaseline(null);
    };

    const saveSticker = async (stickerId: number, changes: LibraryStickerChanges): Promise<StickerSaveResult> => {
        if (!currentDetail) return { ok: false, errors: null };
        const packId = currentDetail.id;
        setPending(current => ({ ...current, saving: withToggled(current.saving, stickerId, true) }));
        try {
            const updated = await api.updateSticker(packId, stickerId, changes);
            updateDetail(packId, current => ({
                ...current,
                stickers: current.stickers.map(sticker => (sticker.id === updated.id ? { ...sticker, label: updated.label, keywords: updated.keywords } : sticker)),
            }));
            toast({ message: t('STICKER_LIBRARY.SAVED') });

            return { ok: true };
        } catch (error) {
            const fieldErrors = stickerMetaErrorsFromApi(error, changes, limits);
            if (!fieldErrors) errorToast(error);

            return { ok: false, errors: fieldErrors };
        } finally {
            setPending(current => ({ ...current, saving: withToggled(current.saving, stickerId, false) }));
        }
    };

    const deleteSticker = (stickerId: number) => {
        if (!currentDetail) return;
        const packId = currentDetail.id;
        const index = currentDetail.stickers.findIndex(sticker => sticker.id === stickerId);
        const sticker = currentDetail.stickers[index];
        if (!sticker) return;
        const neighbour = currentDetail.stickers[index + 1] ?? currentDetail.stickers[index - 1];
        setConfirmation({
            title: t('STICKER_LIBRARY.DELETE_STICKER'),
            message: t('STICKER_LIBRARY.DELETE_STICKER_CONFIRM', { name: currentDetail.name }),
            confirmLabel: t('STICKER_LIBRARY.DELETE_STICKER'),
            preview: (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-solid border-n-weak bg-n-solid-1">
                    <StickerThumb sticker={sticker} animate={false} className="size-10" />
                </span>
            ),
            onConfirm: async () => {
                setPending(current => ({ ...current, deleting: withToggled(current.deleting, stickerId, true) }));
                try {
                    await api.deleteSticker(packId, stickerId);
                    detailDirty.current = false;
                    updateDetail(packId, current => ({ ...current, stickers: current.stickers.filter(item => item.id !== stickerId) }));
                    setSelectedStickerId(current => (current === stickerId ? null : current));
                    toast({ message: t('STICKER_LIBRARY.STICKER_DELETED') });
                    if (neighbour) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-sticker-id="${neighbour.id}"]`)?.focus());
                    void loadPacks('refresh');
                } catch (error) {
                    errorToast(error);
                } finally {
                    setPending(current => ({ ...current, deleting: withToggled(current.deleting, stickerId, false) }));
                }
            },
        });
    };

    const processingIds = currentDetail?.stickers.filter(sticker => sticker.status === 'processing').map(sticker => sticker.id) ?? [];
    const poll = useProcessingPoll({
        resetKey: `${selectedPackId}:${processingIds.join(',')}`,
        active: processingIds.length > 0,
        poll: async () => {
            if (selectedPackId === null) return;
            const packId = selectedPackId;
            const fresh = await api.getPack(packId);
            if (selectedPackRef.current !== packId) return;
            const freshById = new Map(fresh.stickers.map(sticker => [sticker.id, sticker]));
            setDetail(current =>
                current?.id === packId
                    ? {
                          ...current,
                          stickers: current.stickers.map(sticker => {
                              const polled = freshById.get(sticker.id);
                              if (!polled) return sticker;
                              const merged = { ...sticker };
                              POLLED_FIELDS.forEach(field => Object.assign(merged, { [field]: polled[field] }));

                              return merged;
                          }),
                      }
                    : current,
            );
            if (!fresh.stickers.some(sticker => sticker.status === 'processing')) void loadPacks('refresh');
        },
    });

    const openEditor = async (files: File[]) => {
        if (!currentDetail || files.length === 0 || editorSession) return;
        const packId = currentDetail.id;
        const { valid, rejected } = await prepareUploadQueue(files, { acceptedExtensions, maxBytes: uploadLimitBytes });
        if (valid.length === 0) {
            toast({ message: t('STICKER_LIBRARY.FILES_REJECTED', { count: rejected.length, details: describeRejected(rejected) }), tone: 'error', durationMs: null });
            return;
        }
        setEditorSession({ packId, files: valid, rejected });
    };

    const uploadEditedSticker = async (packId: number, file: File, upload: StickerUpload, options: UploadOptions) => {
        const created = await api.uploadSticker(packId, await prepareStickerUpload(file, uploadLimitBytes), upload, options);
        void loadDetail(packId);

        return created;
    };

    const updateExistingSticker = async (packId: number, stickerId: number, changes: LibraryStickerChanges) => {
        await api.updateSticker(packId, stickerId, changes);
        void loadDetail(packId);
    };

    const closeEditor = (packId: number, summary: EditorQueueSummary) => {
        setEditorSession(null);
        void loadDetail(packId);
        const touchedIds = [...summary.addedIds, ...summary.existingIds];
        if (touchedIds.length === 0) return;
        const parts = summary.addedIds.length > 0 ? [t('STICKER_LIBRARY.STICKERS_ADDED', { count: summary.addedIds.length })] : [];
        if (summary.skipped > 0) parts.push(t('STICKER_LIBRARY.STICKERS_SKIPPED', { count: summary.skipped }));
        if (summary.existingIds.length > 0) parts.push(t('STICKER_LIBRARY.STICKERS_EXISTING', { count: summary.existingIds.length }));
        toast({ message: parts.join(' · ') });
        setFlashIds(new Set(touchedIds));
        window.setTimeout(() => setFlashIds(new Set()), FLASH_MS);
        window.setTimeout(() => document.querySelector<HTMLElement>(`[data-sticker-id="${touchedIds[0]}"]`)?.scrollIntoView?.({ block: 'nearest' }));
    };

    const pickFiles = () => fileInputRef.current?.click();

    // Dán ảnh khi không có ô nhập nào đang giữ focus cũng mở trình chỉnh.
    useEffect(() => {
        const onPaste = (event: ClipboardEvent) => {
            const active = document.activeElement;
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active as HTMLElement | null)?.isContentEditable) return;
            if (confirmation || editorSession || !currentDetail) return;
            const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'));
            if (files.length === 0) return;
            event.preventDefault();
            void openEditor(files);
        };
        document.addEventListener('paste', onPaste);

        return () => document.removeEventListener('paste', onPaste);
    });

    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const dropZoneHandlers = {
        onDragEnter: (event: DragEvent) => {
            if (!hasFiles(event) || !currentDetail) return;
            event.preventDefault();
            setDraggingFiles(true);
        },
        onDragOver: (event: DragEvent) => {
            if (!hasFiles(event) || !currentDetail) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        },
        onDragLeave: (event: DragEvent) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFiles(false);
        },
        onDrop: (event: DragEvent) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setDraggingFiles(false);
            void openEditor(Array.from(event.dataTransfer.files));
        },
    };

    const selectSticker = (stickerId: number) => {
        if (stickerId === selectedStickerId) return;
        confirmDiscardThen(() => setSelectedStickerId(stickerId));
    };
    const closeDetail = () =>
        confirmDiscardThen(() => {
            setSelectedStickerId(null);
            detailDirty.current = false;
        });
    const onDirtyChange = useCallback((dirty: boolean) => {
        detailDirty.current = dirty;
    }, []);

    if (loadState === 'loading') return <LibrarySkeleton />;

    if (loadState === 'failed') {
        return (
            <div className="flex w-full flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="i-lucide-cloud-off size-10 text-n-slate-9" aria-hidden="true" />
                <p className="m-0 text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.LOAD_ERROR')}</p>
                <StickerButton
                    tone="secondary"
                    busy={isRetrying}
                    onClick={async () => {
                        setRetrying(true);
                        await loadPacks('initial');
                        setRetrying(false);
                    }}
                >
                    {t('STICKER_LIBRARY.RETRY')}
                </StickerButton>
            </div>
        );
    }

    const stickers = currentDetail?.stickers ?? [];
    const selectedIndex = stickers.findIndex(sticker => sticker.id === selectedStickerId);
    const selectedSticker = selectedIndex >= 0 ? stickers[selectedIndex] : null;
    const readyCount = stickers.filter(sticker => sticker.status === 'ready').length;
    const failedCount = stickers.filter(sticker => sticker.status === 'failed').length;
    const canAddSticker = stickers.length < limits.maxStickers && editorSession === null;
    const isSorting = sortBaseline !== null;
    const showListScreen = !isMobile || selectedPackId === null;
    const showDetailScreen = !isMobile || selectedPackId !== null;
    const openCreate = () => setCreateOpen(true);

    const detailPanel = selectedSticker && currentDetail ? (
        <StickerDetailPanel
            key={selectedSticker.id}
            sticker={selectedSticker}
            index={selectedIndex}
            total={stickers.length}
            limits={limits}
            saving={pending.saving.has(selectedSticker.id)}
            deleting={pending.deleting.has(selectedSticker.id)}
            reorderEnabled={!isSorting}
            showHeaderClose={isWide}
            onSave={changes => saveSticker(selectedSticker.id, changes)}
            onDirtyChange={onDirtyChange}
            onRequestClose={closeDetail}
            onMove={target => moveSticker(selectedSticker.id, target)}
            onDelete={() => deleteSticker(selectedSticker.id)}
        />
    ) : null;

    return (
        <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
            {showListScreen ? (
                <aside className="flex min-h-0 w-full shrink-0 flex-col md:w-60 md:border-0 md:border-r md:border-solid md:border-n-weak md:pr-4">
                    <StickerPackList
                        packs={packs}
                        selectedPackId={selectedPackId}
                        isMobile={isMobile}
                        isCreating={pending.creating}
                        creatingDraftOpen={isCreateOpen}
                        maxNameLength={limits.maxPackNameLength}
                        onSelect={selectPack}
                        onOpenCreate={openCreate}
                        onCloseCreate={() => setCreateOpen(false)}
                        onCreate={name => void createPack(name)}
                    />
                    {isMobile && packs.length === 0 ? <EmptyLibrary onCreate={openCreate} /> : null}
                </aside>
            ) : null}

            {showDetailScreen ? (
                <section
                    className="relative flex min-h-0 min-w-0 flex-1 flex-col md:overflow-y-auto md:pl-6"
                    aria-label={currentDetail?.name}
                    {...dropZoneHandlers}
                >
                    {packs.length === 0 ? (
                        <EmptyLibrary onCreate={openCreate} />
                    ) : !currentDetail ? (
                        <GridSkeleton />
                    ) : (
                        <>
                            <div className="bg-n-surface-1 md:sticky md:top-0 md:z-10 md:pb-3">
                                <StickerPackHeader
                                    pack={currentDetail}
                                    packs={packs}
                                    stickerCount={stickers.length}
                                    readyCount={readyCount}
                                    failedCount={failedCount}
                                    maxStickers={limits.maxStickers}
                                    maxNameLength={limits.maxPackNameLength}
                                    imageSize={meta?.image_size ?? 0}
                                    uploadLimit={uploadLimit}
                                    isMobile={isMobile}
                                    isRenaming={pending.rename}
                                    isPublishing={pending.publish}
                                    canAddSticker={canAddSticker}
                                    onRename={renamePack}
                                    onTogglePublished={published => void setPublished(published)}
                                    onAddSticker={pickFiles}
                                    onDeletePack={deletePack}
                                    moveLabel={packTransfer ? t(MOVE_PACK_COPY[packTransfer.destination].menu) : null}
                                    onMovePack={movePack}
                                    onFailedFirst={failedFirst}
                                    onStartSort={startSort}
                                    onBack={backToList}
                                />
                            </div>
                            {isSorting ? <p className="m-0 pb-2 text-xs text-n-slate-11">{t('STICKER_LIBRARY.SORT_HINT')}</p> : null}
                            <div className="pb-24 pt-2 md:pb-6">
                                {stickers.length === 0 ? (
                                    <EmptyPackDropZone isMobile={isMobile} imageSize={meta?.image_size ?? 0} onPick={pickFiles} />
                                ) : (
                                    <StickerGrid
                                        packName={currentDetail.name}
                                        stickers={stickers}
                                        selectedStickerId={selectedStickerId}
                                        deletingIds={pending.deleting}
                                        flashIds={flashIds}
                                        pollExhausted={poll.exhausted}
                                        sortMode={isSorting}
                                        reorderEnabled={!isMobile || isSorting}
                                        canAdd={canAddSticker && !isMobile}
                                        onOpen={selectSticker}
                                        onDelete={deleteSticker}
                                        onMove={moveSticker}
                                        onReorder={reorderStickers}
                                        onRetryPoll={poll.retry}
                                        onAdd={pickFiles}
                                    />
                                )}
                            </div>
                            {isDraggingFiles ? (
                                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-n-brand bg-n-brand/10">
                                    <p className="m-0 rounded-lg bg-n-solid-1 px-4 py-2 text-sm font-medium text-n-slate-12 shadow">
                                        {t('STICKER_LIBRARY.DROP_HERE', { name: currentDetail.name })}
                                    </p>
                                </div>
                            ) : null}
                            {isMobile ? (
                                <div className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-16 right-4 z-40 flex gap-2">
                                    {isSorting ? (
                                        <>
                                            <StickerButton tone="secondary" size="lg" className="flex-1 shadow-lg" onClick={cancelSort}>
                                                {t('STICKER_LIBRARY.CANCEL')}
                                            </StickerButton>
                                            <StickerButton tone="primary" size="lg" className="flex-1 shadow-lg" onClick={finishSort}>
                                                {t('STICKER_LIBRARY.SORT_DONE')}
                                            </StickerButton>
                                        </>
                                    ) : (
                                        <StickerButton
                                            tone="primary"
                                            size="lg"
                                            icon="i-lucide-plus"
                                            className="flex-1 shadow-lg"
                                            disabled={!canAddSticker}
                                            onClick={pickFiles}
                                        >
                                            {t('STICKER_LIBRARY.ADD_STICKER')}
                                        </StickerButton>
                                    )}
                                </div>
                            ) : null}
                        </>
                    )}
                </section>
            ) : null}

            {detailPanel && isWide ? (
                <aside className="flex w-80 shrink-0 flex-col border-0 border-l border-solid border-n-weak" aria-label={t('STICKER_LIBRARY.DETAIL_TITLE')}>
                    {detailPanel}
                </aside>
            ) : null}
            {!isWide ? (
                <Modal
                    open={detailPanel !== null}
                    title={t('STICKER_LIBRARY.DETAIL_TITLE')}
                    variant="drawer"
                    onRequestClose={closeDetail}
                >
                    {detailPanel}
                </Modal>
            ) : null}

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
            <ConfirmActionDialog request={confirmation} onClose={() => setConfirmation(null)} />
            {editorSession ? (
                <StickerImageEditor
                    files={editorSession.files}
                    rejected={editorSession.rejected}
                    imageSize={meta?.image_size ?? 0}
                    limits={limits}
                    onUpload={(file, upload, options) => uploadEditedSticker(editorSession.packId, file, upload, options)}
                    onUpdateExisting={(stickerId, changes) => updateExistingSticker(editorSession.packId, stickerId, changes)}
                    onClose={summary => closeEditor(editorSession.packId, summary)}
                />
            ) : null}
        </div>
    );
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="i-lucide-sticker size-10 text-n-slate-9" aria-hidden="true" />
            <p className="m-0 text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.EMPTY_TITLE')}</p>
            <StickerButton tone="primary" icon="i-lucide-plus" onClick={onCreate}>
                {t('STICKER_LIBRARY.CREATE_FIRST')}
            </StickerButton>
        </div>
    );
}

function EmptyPackDropZone({ isMobile, imageSize, onPick }: { isMobile: boolean; imageSize: number; onPick: () => void }) {
    return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-n-slate-7 p-6 text-center">
            <span className="i-lucide-image-plus size-8 text-n-slate-9" aria-hidden="true" />
            <p className="m-0 text-sm font-medium text-n-slate-12">
                {isMobile ? t('STICKER_LIBRARY.EMPTY_PACK_MOBILE') : t('STICKER_LIBRARY.EMPTY_PACK_DROP')}
            </p>
            <StickerButton tone="secondary" onClick={onPick}>
                {t('STICKER_LIBRARY.CHOOSE_IMAGES')}
            </StickerButton>
            <p className="m-0 text-xs text-n-slate-11">{t('STICKER_LIBRARY.EMPTY_PACK_FORMATS', { size: imageSize })}</p>
        </div>
    );
}

const SKELETON_TILES = Array.from({ length: 8 }, (_, index) => index);

function GridSkeleton() {
    return (
        <div aria-busy="true" className="flex flex-col gap-4">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-n-alpha-2" />
            <div className="grid grid-cols-4 gap-2 md:grid-cols-[repeat(auto-fill,88px)]">
                {SKELETON_TILES.map(index => (
                    <div key={index} className="aspect-square animate-pulse rounded-xl bg-n-alpha-2" />
                ))}
            </div>
        </div>
    );
}

function LibrarySkeleton() {
    return (
        <div className="flex w-full flex-col gap-4 md:flex-row" aria-busy="true" aria-label={t('STICKER_LIBRARY.LOADING')}>
            <div className="flex flex-col gap-2 md:w-60 md:pr-4">
                {[0, 1, 2].map(index => (
                    <div key={index} className="h-12 animate-pulse rounded-lg bg-n-alpha-2" />
                ))}
            </div>
            <div className="flex-1 md:pl-6">
                <GridSkeleton />
            </div>
        </div>
    );
}

interface StickerLibraryManagerProps {
    api: StickerLibraryApi;
    packTransfer?: PackTransfer;
}

export default function StickerLibraryManager({ api, packTransfer }: StickerLibraryManagerProps) {
    return (
        <StickerToastProvider>
            <StickerLibrary api={api} packTransfer={packTransfer} />
        </StickerToastProvider>
    );
}
