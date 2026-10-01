// React Imports
import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'

// Third-party Imports
import {
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudOffIcon,
  EllipsisVerticalIcon,
  ImagePlusIcon,
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StickerIcon,
  Trash2Icon,
  TriangleAlertIcon
} from 'lucide-react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@admin/components/ui/dropdown-menu'
import { Label } from '@admin/components/ui/label'
import { Separator } from '@admin/components/ui/separator'
import { Skeleton } from '@admin/components/ui/skeleton'
import { Switch } from '@admin/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@admin/components/ui/tooltip'
import StatusBadge from '@admin/views/datatables/status-badge'

// Util Imports
import { cn } from '@admin/lib/utils'

import type { StickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi'
import type { LibraryStickerPack } from 'dashboard/settings/customStickers/types'

import { t } from '../../../i18n'
import ConfirmDialog from './confirm-dialog'
import PackNameDialog from './pack-name-dialog'
import StickerDetailSheet from './sticker-detail-sheet'
import StickerEditorDialog from './sticker-editor-dialog'
import StickerGrid, { StickerThumb } from './sticker-grid'
import { useStickerLibrary } from './use-sticker-library'
import type { PackTransfer } from './use-sticker-library'

const MOBILE_QUERY = '(max-width: 767px)'

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY).matches : false
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setNarrow(media.matches)

    media.addEventListener?.('change', onChange)

    return () => media.removeEventListener?.('change', onChange)
  }, [])

  return narrow
}

function PackCover({ pack }: { pack: LibraryStickerPack }) {
  return pack.cover_url ? (
    <span className='bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md'>
      <img src={pack.cover_url} alt='' className='size-8 object-contain' />
    </span>
  ) : (
    <span className='text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed'>
      <StickerIcon className='size-4' />
    </span>
  )
}

// Một dòng bộ sticker trong cột trái: ảnh bìa, tên, số sticker, trạng thái.
function PackItem({ pack, isSelected, onClick }: { pack: LibraryStickerPack; isSelected: boolean; onClick: () => void }) {
  const status = pack.published ? t('STICKER_LIBRARY.PUBLISHED') : t('STICKER_LIBRARY.DRAFT')

  return (
    <button
      type='button'
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      title={pack.name}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left text-sm transition-colors',
        isSelected ? 'bg-accent border-border' : 'hover:bg-muted/40'
      )}
    >
      <PackCover pack={pack} />
      <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='text-foreground truncate font-medium'>{pack.name}</span>
        <span className='text-muted-foreground truncate text-xs'>
          {t('STICKER_LIBRARY.STICKERS_COUNT', { count: pack.stickers_count ?? 0 })}
        </span>
      </span>
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          pack.published ? 'bg-green-600 dark:bg-green-400' : 'border-muted-foreground/50 border'
        )}
        aria-hidden='true'
      />
      <span className='sr-only'>{status}</span>
    </button>
  )
}

function LibrarySkeleton() {
  return (
    <div
      className='flex min-h-130 overflow-hidden rounded-lg border'
      aria-busy='true'
      aria-label={t('STICKER_LIBRARY.LOADING')}
    >
      <div className='bg-card hidden w-72 shrink-0 flex-col gap-2 border-r p-3 md:flex'>
        <Skeleton className='h-9 w-full' />
        {[0, 1, 2].map(index => (
          <Skeleton key={index} className='h-14 w-full' />
        ))}
      </div>
      <div className='flex flex-1 flex-col gap-4 p-6'>
        <Skeleton className='h-8 w-64' />
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]'>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className='aspect-square rounded-xl' />
          ))}
        </div>
      </div>
    </div>
  )
}

type StickerLibraryProps = {
  api: StickerLibraryApi
  packTransfer?: PackTransfer
  className?: string
}

// Màn quản lý một kho sticker: cột trái là các bộ, bên phải là bộ đang mở.
const StickerLibrary = ({ api, packTransfer, className }: StickerLibraryProps) => {
  const isMobile = useIsNarrow()
  const library = useStickerLibrary({ api, packTransfer, isMobile })
  const [nameDialog, setNameDialog] = useState<'create' | 'rename' | null>(null)
  const [isDraggingFiles, setDraggingFiles] = useState(false)
  const [isRetrying, setRetrying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    loadState,
    packs,
    meta,
    limits,
    currentDetail,
    stickers,
    selectedPackId,
    pending,
    editorSession,
    confirmation
  } = library

  const pickFiles = () => fileInputRef.current?.click()

  // Dán ảnh khi không có ô nhập nào đang giữ focus cũng mở hộp tải sticker.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const active = document.activeElement

      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement | null)?.isContentEditable
      )
        return
      if (confirmation || editorSession || !currentDetail) return
      const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'))

      if (files.length === 0) return
      event.preventDefault()
      void library.openEditor(files)
    }

    document.addEventListener('paste', onPaste)

    return () => document.removeEventListener('paste', onPaste)
  })

  if (loadState === 'loading') return <LibrarySkeleton />

  if (loadState === 'failed') {
    return (
      <div className='flex flex-col items-center justify-center gap-3 rounded-lg border py-16 text-center'>
        <CloudOffIcon className='text-muted-foreground size-10' />
        <p className='font-medium'>{t('STICKER_LIBRARY.LOAD_ERROR')}</p>
        <Button
          variant='outline'
          disabled={isRetrying}
          onClick={async () => {
            setRetrying(true)
            await library.retryLoad()
            setRetrying(false)
          }}
        >
          {isRetrying ? <Loader2Icon className='animate-spin' /> : null}
          {t('STICKER_LIBRARY.RETRY')}
        </Button>
      </div>
    )
  }

  const readyCount = stickers.filter(sticker => sticker.status === 'ready').length
  const failedCount = stickers.filter(sticker => sticker.status === 'failed').length
  const canPublish = currentDetail ? readyCount > 0 || currentDetail.published : false
  const showList = !isMobile || selectedPackId === null
  const showDetail = !isMobile || selectedPackId !== null
  const imageSize = meta?.image_size ?? 0

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

  const dropZoneHandlers = {
    onDragEnter: (event: DragEvent) => {
      if (!hasFiles(event) || !currentDetail) return
      event.preventDefault()
      setDraggingFiles(true)
    },
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event) || !currentDetail) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFiles(false)
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      setDraggingFiles(false)
      void library.openEditor(Array.from(event.dataTransfer.files))
    }
  }

  const heading = t('STICKER_LIBRARY.PACKS_HEADING', { count: packs.length })

  const emptyLibrary = (
    <div className='flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center'>
      <div className='bg-(--tone)/15 text-(--tone) flex size-10 items-center justify-center rounded-md'>
        <StickerIcon className='size-5' />
      </div>
      <p className='font-medium'>{t('STICKER_LIBRARY.EMPTY_TITLE')}</p>
      <Button onClick={() => setNameDialog('create')}>
        <PlusIcon />
        {t('STICKER_LIBRARY.CREATE_FIRST')}
      </Button>
    </div>
  )

  return (
    <div className={cn('flex min-h-130 flex-col md:h-[calc(100dvh-16rem)]', className)}>
      <div className='bg-background flex h-full min-h-0 overflow-hidden rounded-lg border'>
        {showList ? (
          <aside className='bg-card flex min-h-0 w-full shrink-0 flex-col md:w-72 md:border-r'>
            <div className='p-3'>
              <Button className='w-full' onClick={() => setNameDialog('create')}>
                <PlusIcon />
                {t('STICKER_LIBRARY.NEW_PACK')}
              </Button>
            </div>
            <Separator />
            <nav aria-label={heading} className='flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-3'>
              <p className='text-muted-foreground px-2 pb-1.5 text-[11px] font-medium uppercase'>{heading}</p>
              {packs.map(pack => (
                <div key={pack.id} className='flex items-center'>
                  <PackItem pack={pack} isSelected={pack.id === selectedPackId} onClick={() => library.selectPack(pack.id)} />
                  {isMobile ? <ChevronRightIcon className='text-muted-foreground size-4 shrink-0' /> : null}
                </div>
              ))}
              {packs.length === 0 && isMobile ? emptyLibrary : null}
            </nav>
          </aside>
        ) : null}

        {showDetail ? (
          <section
            className='relative flex min-h-0 min-w-0 flex-1 flex-col'
            aria-label={currentDetail?.name}
            {...dropZoneHandlers}
          >
            {packs.length === 0 ? (
              emptyLibrary
            ) : !currentDetail ? (
              <div className='flex flex-col gap-4 p-6' aria-busy='true'>
                <Skeleton className='h-8 w-64' />
                <div className='grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]'>
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className='aspect-square rounded-xl' />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className='flex flex-col gap-3 border-b p-4 md:px-6'>
                  <div className='flex items-start gap-2'>
                    {isMobile ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='-ml-2 shrink-0'
                        aria-label={t('STICKER_LIBRARY.BACK')}
                        onClick={library.backToList}
                      >
                        <ChevronLeftIcon />
                      </Button>
                    ) : null}
                    <div className='flex min-w-0 flex-1 flex-col gap-1'>
                      <div className='flex min-w-0 items-center gap-2'>
                        <h2 className='truncate text-xl font-bold' title={currentDetail.name}>
                          {currentDetail.name}
                        </h2>
                        <StatusBadge tone={currentDetail.published ? 'success' : 'neutral'}>
                          {currentDetail.published ? t('STICKER_LIBRARY.PUBLISHED') : t('STICKER_LIBRARY.DRAFT')}
                        </StatusBadge>
                      </div>
                      <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                        <span>
                          {t('STICKER_LIBRARY.PACK_SUMMARY', {
                            count: stickers.length,
                            max: limits.maxStickers,
                            size: imageSize
                          })}
                        </span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button variant='ghost' size='icon-xs' aria-label={t('STICKER_LIBRARY.INFO_LABEL')} />
                            }
                          >
                            <InfoIcon />
                          </TooltipTrigger>
                          <TooltipContent>{t('STICKER_LIBRARY.UPLOAD_INFO', { limit: library.uploadLimit })}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant='outline' size='icon' aria-label={t('STICKER_LIBRARY.PACK_MENU')} />}
                      >
                        <EllipsisVerticalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-auto'>
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setNameDialog('rename')}>
                            <PencilIcon className='size-4' />
                            {t('STICKER_LIBRARY.RENAME')}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={failedCount === 0} onClick={library.failedFirst}>
                            <TriangleAlertIcon className='size-4' />
                            {t('STICKER_LIBRARY.FAILED_FIRST')}
                          </DropdownMenuItem>
                          {library.moveLabel ? (
                            <DropdownMenuItem onClick={library.movePack}>
                              <ArrowRightLeftIcon className='size-4' />
                              {library.moveLabel}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant='destructive' onClick={library.deletePack}>
                            <Trash2Icon className='size-4' />
                            {t('STICKER_LIBRARY.DELETE_PACK')}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <Switch
                        id='sticker-pack-published'
                        checked={currentDetail.published}
                        disabled={!canPublish || pending.publish}
                        onCheckedChange={checked => void library.setPublished(checked)}
                      />
                      <Label htmlFor='sticker-pack-published'>{t('STICKER_LIBRARY.PUBLISH')}</Label>
                      {pending.publish ? <Loader2Icon className='text-muted-foreground size-4 animate-spin' /> : null}
                      {!canPublish ? (
                        <span className='text-muted-foreground text-xs'>{t('STICKER_LIBRARY.PUBLISH_NEEDS_STICKER')}</span>
                      ) : null}
                    </div>
                    <Button disabled={!library.canAddSticker} onClick={pickFiles} className='max-sm:w-full'>
                      <PlusIcon />
                      {t('STICKER_LIBRARY.ADD_STICKER')}
                    </Button>
                  </div>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto p-4 md:p-6'>
                  {stickers.length === 0 ? (
                    <div className='flex min-h-50 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center'>
                      <ImagePlusIcon className='text-muted-foreground size-8' />
                      <p className='font-medium'>
                        {isMobile ? t('STICKER_LIBRARY.EMPTY_PACK_MOBILE') : t('STICKER_LIBRARY.EMPTY_PACK_DROP')}
                      </p>
                      <Button variant='outline' onClick={pickFiles}>
                        {t('STICKER_LIBRARY.CHOOSE_IMAGES')}
                      </Button>
                      <p className='text-muted-foreground text-xs'>
                        {t('STICKER_LIBRARY.EMPTY_PACK_FORMATS', { size: imageSize })}
                      </p>
                    </div>
                  ) : (
                    <StickerGrid
                      packName={currentDetail.name}
                      stickers={stickers}
                      selectedStickerId={library.selectedSticker?.id ?? null}
                      deletingIds={pending.deleting}
                      flashIds={library.flashIds}
                      pollExhausted={library.poll.exhausted}
                      canAdd={library.canAddSticker}
                      onOpen={library.selectSticker}
                      onDelete={stickerId => {
                        const sticker = stickers.find(item => item.id === stickerId)

                        library.deleteSticker(
                          stickerId,
                          sticker ? (
                            <span className='bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg border'>
                              <StickerThumb sticker={sticker} animate={false} className='size-10' />
                            </span>
                          ) : undefined
                        )
                      }}
                      onMove={library.moveSticker}
                      onReorder={library.reorderStickers}
                      onRetryPoll={library.poll.retry}
                      onAdd={pickFiles}
                    />
                  )}
                </div>

                {isDraggingFiles ? (
                  <div className='border-primary bg-primary/10 pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed'>
                    <p className='bg-background rounded-lg px-4 py-2 text-sm font-medium shadow'>
                      {t('STICKER_LIBRARY.DROP_HERE', { name: currentDetail.name })}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type='file'
        multiple
        hidden
        data-testid='sticker-file-input'
        accept={library.acceptedExtensions.map(extension => `.${extension}`).join(',')}
        onChange={event => {
          const files = Array.from(event.target.files ?? [])

          event.target.value = ''
          void library.openEditor(files)
        }}
      />

      <PackNameDialog
        open={nameDialog === 'create'}
        title={t('STICKER_LIBRARY.NEW_PACK')}
        submitLabel={t('STICKER_LIBRARY.CREATE')}
        initialName=''
        maxLength={limits.maxPackNameLength}
        packs={packs}
        busy={pending.creating}
        onSubmit={library.createPack}
        onClose={() => setNameDialog(null)}
      />
      <PackNameDialog
        open={nameDialog === 'rename' && currentDetail !== null}
        title={t('STICKER_LIBRARY.RENAME')}
        submitLabel={t('STICKER_LIBRARY.SAVE')}
        initialName={currentDetail?.name ?? ''}
        maxLength={limits.maxPackNameLength}
        packs={packs}
        exceptPackId={currentDetail?.id}
        busy={pending.rename}
        onSubmit={library.renamePack}
        onClose={() => setNameDialog(null)}
      />

      <StickerDetailSheet
        sticker={library.selectedSticker}
        index={library.selectedIndex}
        total={stickers.length}
        revision={library.detailRevision}
        limits={limits}
        saving={library.selectedSticker ? pending.saving.has(library.selectedSticker.id) : false}
        deleting={library.selectedSticker ? pending.deleting.has(library.selectedSticker.id) : false}
        reediting={library.selectedSticker ? library.openingReeditId === library.selectedSticker.id : false}
        onSave={changes =>
          library.selectedSticker
            ? library.saveSticker(library.selectedSticker.id, changes)
            : Promise.resolve({ ok: false, errors: null })
        }
        onDirtyChange={library.onDirtyChange}
        onRequestClose={library.closeDetail}
        onMove={target => library.selectedSticker && library.moveSticker(library.selectedSticker.id, target)}
        onDelete={() => library.selectedSticker && library.deleteSticker(library.selectedSticker.id)}
        onReedit={() =>
          library.selectedSticker && library.openReedit(library.selectedSticker, library.selectedIndex)
        }
      />

      <ConfirmDialog request={confirmation} onClose={() => library.setConfirmation(null)} />

      {editorSession ? (
        <StickerEditorDialog
          session={editorSession}
          imageSize={imageSize}
          limits={limits}
          onUpload={library.editorUpload}
          onUpdateExisting={library.editorUpdateExisting}
          onClose={library.closeEditor}
        />
      ) : null}
    </div>
  )
}

export default StickerLibrary
