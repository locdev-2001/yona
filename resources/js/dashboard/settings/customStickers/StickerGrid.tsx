import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { t } from '../../../i18n';
import { columnCount } from 'shared/reorder/reorderGeometry';
import StickerTile, { StickerThumb, stickerTitle } from './StickerTile';
import type { MenuItem } from './stickerLibraryUi';
import { REORDER_KEY_ATTRIBUTE, useReorderGrid } from './useReorderGrid';
import type { LibrarySticker } from './types';

export type StickerMoveTarget = 'first' | 'last';

interface StickerGridProps {
    packName: string;
    stickers: LibrarySticker[];
    selectedStickerId: number | null;
    deletingIds: ReadonlySet<number>;
    flashIds: ReadonlySet<number>;
    pollExhausted: boolean;
    sortMode: boolean;
    reorderEnabled: boolean;
    canAdd: boolean;
    onOpen: (stickerId: number) => void;
    onDelete: (stickerId: number) => void;
    onMove: (stickerId: number, target: StickerMoveTarget) => void;
    onReorder: (stickerIds: number[]) => void;
    onRetryPoll: () => void;
    onAdd: () => void;
}

const idsOf = (stickers: LibrarySticker[]) => stickers.map(sticker => sticker.id);

// Lưới ô sticker: listbox có roving tabindex, mũi tên đi theo hình học lưới, Space nhấc/thả để dời chỗ.
export default function StickerGrid({
    packName,
    stickers,
    selectedStickerId,
    deletingIds,
    flashIds,
    pollExhausted,
    sortMode,
    reorderEnabled,
    canAdd,
    onOpen,
    onDelete,
    onMove,
    onReorder,
    onRetryPoll,
    onAdd,
}: StickerGridProps) {
    const [focusedId, setFocusedId] = useState<number | null>(null);
    const [lifted, setLifted] = useState<{ id: number; originalIds: number[]; previewIds: number[] } | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const stickerById = useMemo(() => new Map(stickers.map(sticker => [sticker.id, sticker])), [stickers]);

    const orderedStickers = lifted
        ? lifted.previewIds.map(id => stickerById.get(id)).filter((sticker): sticker is LibrarySticker => sticker !== undefined)
        : stickers;
    const keys = orderedStickers.map(sticker => String(sticker.id));

    const reorder = useReorderGrid({
        keys,
        enabled: reorderEnabled && lifted === null,
        touchEnabled: sortMode,
        onCommit: orderedKeys => onReorder(orderedKeys.map(Number)),
    });
    const listRef = reorder.containerRef;
    const pendingFocusId = useRef<number | null>(null);

    const focusTargetId = focusedId !== null && stickerById.has(focusedId) ? focusedId : (selectedStickerId ?? orderedStickers[0]?.id ?? null);

    useEffect(() => {
        if (pendingFocusId.current === null) return;
        listRef.current?.querySelector<HTMLElement>(`[data-sticker-id="${pendingFocusId.current}"]`)?.focus();
        pendingFocusId.current = null;
    });

    const focusSticker = (stickerId: number) => {
        setFocusedId(stickerId);
        pendingFocusId.current = stickerId;
    };

    const columns = () =>
        columnCount(
            Array.from(listRef.current?.querySelectorAll<HTMLElement>(`[${REORDER_KEY_ATTRIBUTE}]`) ?? []).map(node => ({
                key: node.getAttribute(REORDER_KEY_ATTRIBUTE) ?? '',
                rect: node.getBoundingClientRect(),
            })),
        );

    const stepFor = (key: string): number | null => {
        if (key === 'ArrowRight') return 1;
        if (key === 'ArrowLeft') return -1;
        if (key === 'ArrowDown') return columns();
        if (key === 'ArrowUp') return -columns();

        return null;
    };

    const onTileKeyDown = (sticker: LibrarySticker, index: number, event: KeyboardEvent<HTMLDivElement>) => {
        const step = stepFor(event.key);

        if (lifted) {
            if (step !== null) {
                event.preventDefault();
                const target = Math.max(0, Math.min(lifted.previewIds.length - 1, index + step));
                const previewIds = lifted.previewIds.filter(id => id !== lifted.id);
                previewIds.splice(target, 0, lifted.id);
                setLifted({ ...lifted, previewIds });
                setAnnouncement(t('STICKER_LIBRARY.MOVED_TO', { index: target + 1, total: previewIds.length }));
                pendingFocusId.current = lifted.id;
            } else if (event.key === ' ') {
                event.preventDefault();
                setLifted(null);
                if (lifted.previewIds.join() !== lifted.originalIds.join()) onReorder(lifted.previewIds);
                setAnnouncement(t('STICKER_LIBRARY.MOVED_TO', { index: index + 1, total: lifted.previewIds.length }));
                pendingFocusId.current = lifted.id;
            } else if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setLifted(null);
                setAnnouncement(t('STICKER_LIBRARY.REORDER_CANCELLED'));
                pendingFocusId.current = lifted.id;
            }
            return;
        }

        if (step !== null || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const target =
                event.key === 'Home' ? 0 : event.key === 'End' ? orderedStickers.length - 1 : Math.max(0, Math.min(orderedStickers.length - 1, index + (step ?? 0)));
            focusSticker(orderedStickers[target].id);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            onOpen(sticker.id);
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            onDelete(sticker.id);
        } else if (event.key === ' ' && reorderEnabled && orderedStickers.length > 1) {
            event.preventDefault();
            const originalIds = idsOf(orderedStickers);
            setLifted({ id: sticker.id, originalIds, previewIds: originalIds });
            setAnnouncement(t('STICKER_LIBRARY.LIFTED', { label: stickerTitle(sticker, index) }));
        }
    };

    const menuItemsFor = (sticker: LibrarySticker, index: number): MenuItem[] => [
        { key: 'edit', label: t('STICKER_LIBRARY.EDIT_STICKER'), icon: 'i-lucide-pencil', onSelect: () => onOpen(sticker.id) },
        {
            key: 'first',
            label: t('STICKER_LIBRARY.MOVE_FIRST'),
            icon: 'i-lucide-arrow-up-to-line',
            disabled: index === 0 || !reorderEnabled,
            onSelect: () => onMove(sticker.id, 'first'),
        },
        {
            key: 'last',
            label: t('STICKER_LIBRARY.MOVE_LAST'),
            icon: 'i-lucide-arrow-down-to-line',
            disabled: index === orderedStickers.length - 1 || !reorderEnabled,
            onSelect: () => onMove(sticker.id, 'last'),
        },
        {
            key: 'delete',
            label: t('STICKER_LIBRARY.DELETE_STICKER'),
            icon: 'i-lucide-trash-2',
            danger: true,
            separatorBefore: true,
            onSelect: () => onDelete(sticker.id),
        },
    ];

    const ghostSticker = reorder.ghost ? stickerById.get(Number(reorder.ghost.key)) : undefined;

    return (
        <div
            ref={listRef}
            className={`relative grid grid-cols-4 gap-2 md:grid-cols-[repeat(auto-fill,88px)] ${sortMode ? 'touch-none' : ''}`}
        >
            <div role="listbox" aria-label={t('STICKER_LIBRARY.GRID_LABEL', { name: packName })} className="contents">
                {orderedStickers.map((sticker, index) => (
                    <StickerTile
                        key={sticker.id}
                        sticker={sticker}
                        index={index}
                        isSelected={sticker.id === selectedStickerId}
                        isFocusTarget={sticker.id === focusTargetId}
                        isDragging={reorder.draggingKey === String(sticker.id)}
                        isLifted={lifted?.id === sticker.id}
                        isDeleting={deletingIds.has(sticker.id)}
                        isFlashing={flashIds.has(sticker.id)}
                        pollExhausted={pollExhausted}
                        sortMode={sortMode}
                        menuItems={menuItemsFor(sticker, index)}
                        dragProps={reorder.itemProps(String(sticker.id))}
                        onActivate={() => {
                            if (sortMode) return;
                            if (sticker.status === 'processing' && pollExhausted) onRetryPoll();
                            else onOpen(sticker.id);
                        }}
                        onKeyDown={event => onTileKeyDown(sticker, index, event)}
                        onFocus={() => setFocusedId(sticker.id)}
                    />
                ))}
            </div>
            {canAdd && !sortMode ? (
                <button
                    type="button"
                    onClick={onAdd}
                    className="reset-base flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-n-slate-7 bg-transparent text-xs font-medium text-n-slate-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-brand [@media(hover:hover)]:hover:border-n-brand [@media(hover:hover)]:hover:text-n-brand"
                >
                    <span className="i-lucide-plus size-5" aria-hidden="true" />
                    {t('STICKER_LIBRARY.ADD_SHORT')}
                </button>
            ) : null}
            {reorder.indicator ? (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute w-[3px] rounded-full bg-n-brand"
                    style={{ left: reorder.indicator.left, top: reorder.indicator.top, height: reorder.indicator.height }}
                />
            ) : null}
            <span className="sr-only" aria-live="assertive">
                {announcement}
            </span>
            {reorder.ghost && ghostSticker
                ? createPortal(
                      <div
                          aria-hidden="true"
                          className="pointer-events-none fixed left-0 top-0 z-[70] flex items-center justify-center rounded-xl border border-solid border-n-brand bg-n-solid-1 shadow-xl"
                          style={{
                              width: reorder.ghost.width,
                              height: reorder.ghost.height,
                              transform: `translate(${reorder.ghost.x}px, ${reorder.ghost.y}px)`,
                          }}
                      >
                          <StickerThumb sticker={ghostSticker} animate={false} />
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}
