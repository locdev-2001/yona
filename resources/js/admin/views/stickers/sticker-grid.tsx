// React Imports
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

// Third-party Imports
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  TriangleAlertIcon
} from 'lucide-react'
import Loader from 'shared/components/loader/Loader'

// Component Imports
import { Badge } from '@admin/components/ui/badge'
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@admin/components/ui/dropdown-menu'

// Util Imports
import { cn } from '@admin/lib/utils'

import { REORDER_KEY_ATTRIBUTE, useReorderGrid } from 'dashboard/settings/customStickers/useReorderGrid'
import type { LibrarySticker } from 'dashboard/settings/customStickers/types'
import { columnCount } from 'shared/reorder/reorderGeometry'

import { t } from '../../../i18n'
import { isAnimatedSticker, stickerTitle } from './use-sticker-library'
import type { StickerMoveTarget } from './use-sticker-library'

// Ảnh của sticker: ảnh động chỉ chạy khi rê chuột hoặc đang chọn.
export function StickerThumb({ sticker, animate, className }: { sticker: LibrarySticker; animate: boolean; className?: string }) {
  const source =
    animate || !isAnimatedSticker(sticker) ? (sticker.image_url ?? sticker.static_url) : (sticker.static_url ?? sticker.image_url)

  if (!source) return null

  return <img src={source} alt='' loading='lazy' draggable={false} className={cn('size-[72%] object-contain', className)} />
}

type StickerGridProps = {
  packName: string
  stickers: LibrarySticker[]
  selectedStickerId: number | null
  deletingIds: ReadonlySet<number>
  flashIds: ReadonlySet<number>
  pollExhausted: boolean
  canAdd: boolean
  onOpen: (stickerId: number) => void
  onDelete: (stickerId: number) => void
  onMove: (stickerId: number, target: StickerMoveTarget) => void
  onReorder: (stickerIds: number[]) => void
  onRetryPoll: () => void
  onAdd: () => void
}

const idsOf = (stickers: LibrarySticker[]) => stickers.map(sticker => sticker.id)

// Lưới sticker: kéo thả để sắp xếp; bàn phím đi theo lưới, Space nhấc/thả để dời chỗ.
const StickerGrid = ({
  packName,
  stickers,
  selectedStickerId,
  deletingIds,
  flashIds,
  pollExhausted,
  canAdd,
  onOpen,
  onDelete,
  onMove,
  onReorder,
  onRetryPoll,
  onAdd
}: StickerGridProps) => {
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [lifted, setLifted] = useState<{ id: number; originalIds: number[]; previewIds: number[] } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const stickerById = useMemo(() => new Map(stickers.map(sticker => [sticker.id, sticker])), [stickers])

  const orderedStickers = lifted
    ? lifted.previewIds.map(id => stickerById.get(id)).filter((sticker): sticker is LibrarySticker => sticker !== undefined)
    : stickers

  const reorder = useReorderGrid({
    keys: orderedStickers.map(sticker => String(sticker.id)),
    enabled: lifted === null,
    touchEnabled: false,
    onCommit: orderedKeys => onReorder(orderedKeys.map(Number))
  })

  const listRef = reorder.containerRef
  const pendingFocusId = useRef<number | null>(null)

  const focusTargetId = focusedId !== null && stickerById.has(focusedId) ? focusedId : (selectedStickerId ?? orderedStickers[0]?.id ?? null)

  useEffect(() => {
    if (pendingFocusId.current === null) return
    listRef.current?.querySelector<HTMLElement>(`[data-sticker-id="${pendingFocusId.current}"]`)?.focus()
    pendingFocusId.current = null
  })

  const focusSticker = (stickerId: number) => {
    setFocusedId(stickerId)
    pendingFocusId.current = stickerId
  }

  const columns = () =>
    columnCount(
      Array.from(listRef.current?.querySelectorAll<HTMLElement>(`[${REORDER_KEY_ATTRIBUTE}]`) ?? []).map(node => ({
        key: node.getAttribute(REORDER_KEY_ATTRIBUTE) ?? '',
        rect: node.getBoundingClientRect()
      }))
    )

  const stepFor = (key: string): number | null => {
    if (key === 'ArrowRight') return 1
    if (key === 'ArrowLeft') return -1
    if (key === 'ArrowDown') return columns()
    if (key === 'ArrowUp') return -columns()

    return null
  }

  const onTileKeyDown = (sticker: LibrarySticker, index: number, event: KeyboardEvent<HTMLDivElement>) => {
    const step = stepFor(event.key)

    if (lifted) {
      if (step !== null) {
        event.preventDefault()
        const target = Math.max(0, Math.min(lifted.previewIds.length - 1, index + step))
        const previewIds = lifted.previewIds.filter(id => id !== lifted.id)

        previewIds.splice(target, 0, lifted.id)
        setLifted({ ...lifted, previewIds })
        setAnnouncement(t('STICKER_LIBRARY.MOVED_TO', { index: target + 1, total: previewIds.length }))
        pendingFocusId.current = lifted.id
      } else if (event.key === ' ') {
        event.preventDefault()
        setLifted(null)
        if (lifted.previewIds.join() !== lifted.originalIds.join()) onReorder(lifted.previewIds)
        setAnnouncement(t('STICKER_LIBRARY.MOVED_TO', { index: index + 1, total: lifted.previewIds.length }))
        pendingFocusId.current = lifted.id
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setLifted(null)
        setAnnouncement(t('STICKER_LIBRARY.REORDER_CANCELLED'))
        pendingFocusId.current = lifted.id
      }

      return
    }

    if (step !== null || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const target =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? orderedStickers.length - 1
            : Math.max(0, Math.min(orderedStickers.length - 1, index + (step ?? 0)))

      focusSticker(orderedStickers[target].id)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onOpen(sticker.id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete(sticker.id)
    } else if (event.key === ' ' && orderedStickers.length > 1) {
      event.preventDefault()
      const originalIds = idsOf(orderedStickers)

      setLifted({ id: sticker.id, originalIds, previewIds: originalIds })
      setAnnouncement(t('STICKER_LIBRARY.LIFTED', { label: stickerTitle(sticker, index) }))
    }
  }

  const ghostSticker = reorder.ghost ? stickerById.get(Number(reorder.ghost.key)) : undefined
  const anyLacksKeywords = stickers.some(sticker => sticker.status === 'ready' && sticker.keywords.length === 0)

  return (
    <>
      <div ref={listRef} className='relative grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]'>
        <div role='listbox' aria-label={t('STICKER_LIBRARY.GRID_LABEL', { name: packName })} className='contents'>
          {orderedStickers.map((sticker, index) => {
            const isProcessing = sticker.status === 'processing'
            const isFailed = sticker.status === 'failed'
            const isStuck = isProcessing && pollExhausted
            const isSelected = sticker.id === selectedStickerId
            const isDeleting = deletingIds.has(sticker.id)
            const lacksKeywords = sticker.status === 'ready' && sticker.keywords.length === 0
            const title = stickerTitle(sticker, index)

            return (
              <div
                key={sticker.id}
                className={cn(
                  'group relative aspect-square',
                  reorder.draggingKey === String(sticker.id) && 'opacity-40',
                  isDeleting && 'pointer-events-none opacity-50'
                )}
                onMouseEnter={() => setHoveredId(sticker.id)}
                onMouseLeave={() => setHoveredId(current => (current === sticker.id ? null : current))}
                {...reorder.itemProps(String(sticker.id))}
              >
                <div
                  role='option'
                  data-sticker-id={sticker.id}
                  aria-selected={isSelected}
                  aria-busy={isProcessing || isDeleting || undefined}
                  aria-label={title}
                  title={title}
                  tabIndex={sticker.id === focusTargetId ? 0 : -1}
                  onClick={() => {
                    if (isStuck) onRetryPoll()
                    else onOpen(sticker.id)
                  }}
                  onKeyDown={event => onTileKeyDown(sticker, index, event)}
                  onFocus={() => setFocusedId(sticker.id)}
                  className={cn(
                    'bg-card border-border focus-visible:ring-ring/50 flex size-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border transition-shadow outline-none select-none focus-visible:ring-[3px]',
                    isFailed && 'bg-destructive/10 ring-destructive/30',
                    isProcessing && !isStuck && 'bg-muted animate-pulse',
                    !isFailed && !isProcessing && 'hover:border-primary/40',
                    isSelected && 'ring-primary ring-2',
                    lifted?.id === sticker.id && 'ring-primary ring-2',
                    flashIds.has(sticker.id) && 'ring-primary/60 ring-2'
                  )}
                >
                  {isFailed ? (
                    <TriangleAlertIcon className='text-destructive size-6' aria-hidden='true' />
                  ) : isStuck ? (
                    <span className='text-muted-foreground flex flex-col items-center gap-1 px-1 text-center text-[11px] leading-tight'>
                      <RefreshCwIcon className='size-4' aria-hidden='true' />
                      {t('STICKER_LIBRARY.POLL_EXHAUSTED')}
                    </span>
                  ) : isProcessing ? (
                    <Loader size={20} className='text-muted-foreground' />
                  ) : (
                    <StickerThumb sticker={sticker} animate={hoveredId === sticker.id || isSelected} />
                  )}
                </div>
                {lacksKeywords ? (
                  <span
                    className='pointer-events-none absolute top-2 left-2 size-1.5 rounded-full bg-amber-500'
                    title={t('STICKER_LIBRARY.NO_KEYWORDS_DOT')}
                    aria-hidden='true'
                  />
                ) : null}
                {isAnimatedSticker(sticker) && !isProcessing ? (
                  <Badge variant='secondary' className='pointer-events-none absolute right-1.5 bottom-1.5 h-4 rounded-sm px-1 text-[10px]'>
                    {t('STICKER_LIBRARY.ANIMATED_BADGE')}
                  </Badge>
                ) : null}
                <div
                  data-no-drag=''
                  className='absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-aria-expanded:opacity-100 max-md:opacity-100'
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size='icon-xs'
                          variant='outline'
                          className='bg-background/95'
                          aria-label={t('STICKER_LIBRARY.STICKER_MENU')}
                        />
                      }
                    >
                      <EllipsisVerticalIcon aria-hidden='true' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-auto'>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onOpen(sticker.id)}>
                          <PencilIcon className='size-4' />
                          {t('STICKER_LIBRARY.EDIT_STICKER')}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index === 0} onClick={() => onMove(sticker.id, 'first')}>
                          <ArrowUpToLineIcon className='size-4' />
                          {t('STICKER_LIBRARY.MOVE_FIRST')}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index === orderedStickers.length - 1} onClick={() => onMove(sticker.id, 'last')}>
                          <ArrowDownToLineIcon className='size-4' />
                          {t('STICKER_LIBRARY.MOVE_LAST')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant='destructive' onClick={() => onDelete(sticker.id)}>
                          <Trash2Icon className='size-4' />
                          {t('STICKER_LIBRARY.DELETE_STICKER')}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
        {canAdd ? (
          <button
            type='button'
            onClick={onAdd}
            className='text-muted-foreground hover:border-primary hover:text-primary focus-visible:ring-ring/50 flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]'
          >
            <PlusIcon className='size-5' aria-hidden='true' />
            {t('STICKER_LIBRARY.ADD_SHORT')}
          </button>
        ) : null}
        {reorder.indicator ? (
          <span
            aria-hidden='true'
            className='bg-primary pointer-events-none absolute w-[3px] rounded-full'
            style={{ left: reorder.indicator.left, top: reorder.indicator.top, height: reorder.indicator.height }}
          />
        ) : null}
        <span className='sr-only' aria-live='assertive'>
          {announcement}
        </span>
        {reorder.ghost && ghostSticker
          ? createPortal(
              <div
                aria-hidden='true'
                className='bg-card ring-primary pointer-events-none fixed top-0 left-0 z-[70] flex items-center justify-center rounded-xl shadow-xl ring-2'
                style={{
                  width: reorder.ghost.width,
                  height: reorder.ghost.height,
                  transform: `translate(${reorder.ghost.x}px, ${reorder.ghost.y}px)`
                }}
              >
                <StickerThumb sticker={ghostSticker} animate={false} />
              </div>,
              document.body
            )
          : null}
      </div>
      {anyLacksKeywords ? (
        // Chú giải cho chấm cam ở góc ô sticker.
        <p className='text-muted-foreground mt-3 flex items-center gap-2 text-xs'>
          <span className='size-1.5 shrink-0 rounded-full bg-amber-500' aria-hidden='true' />
          {t('STICKER_LIBRARY.NO_KEYWORDS_DOT')}
        </p>
      ) : null}
    </>
  )
}

export default StickerGrid
