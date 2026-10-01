// React Imports
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

// Third-party Imports
import { CircleAlertIcon, CircleCheckIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'

// Component Imports
import { Alert, AlertDescription } from '@admin/components/ui/alert'
import { Button } from '@admin/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@admin/components/ui/dialog'
import { Label } from '@admin/components/ui/label'
import { Progress } from '@admin/components/ui/progress'
import { Switch } from '@admin/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@admin/components/ui/toggle-group'

// Util Imports
import { cn } from '@admin/lib/utils'

import { parseApiErrorMessage } from 'dashboard/helper/apiClient'
import { describeRejected } from 'dashboard/settings/customStickers/prepareUploadQueue'
import { fitCrop, subjectCrop, toStickerEdit } from 'dashboard/settings/customStickers/stickerEdit'
import type { StickerDraft, StickerFraming } from 'dashboard/settings/customStickers/stickerEdit'
import { openStickerSource } from 'dashboard/settings/customStickers/stickerEditableSource'
import type { EditableSource } from 'dashboard/settings/customStickers/stickerEditableSource'
import { useStickerPreview } from 'dashboard/settings/customStickers/stickerEditorHooks'
import {
  bulkProgress,
  createQueue,
  currentItem,
  editorQueueReducer,
  hasLaterItems,
  remainingCount,
  summarizeQueue,
  unsavedCount
} from 'dashboard/settings/customStickers/stickerEditorQueue'
import type { EditorQueueSummary } from 'dashboard/settings/customStickers/stickerEditorQueue'
import type { StickerUpload, UploadOptions } from 'dashboard/settings/customStickers/stickerLibraryApi'
import {
  hasMetaErrors,
  stickerMetaErrorsFromApi,
  validateStickerMeta
} from 'dashboard/settings/customStickers/stickerLimits'
import type { StickerLimits, StickerMetaErrors } from 'dashboard/settings/customStickers/stickerLimits'
import { createStickerMaskRunner } from 'dashboard/settings/customStickers/stickerMaskRunner'
import type { StickerMaskRunner } from 'dashboard/settings/customStickers/stickerMaskRunner'
import { StickerFileTooLargeError } from 'dashboard/settings/customStickers/stickerUploadFile'
import type { LibraryStickerChanges, UploadedSticker } from 'dashboard/settings/customStickers/types'

import { t } from '../../../i18n'
import ConfirmDialog from './confirm-dialog'
import StickerMetaFields, { changesFromDraft, draftFromSticker, isDraftChanged } from './sticker-meta-fields'
import type { StickerMetaDraft } from './sticker-meta-fields'
import type { ConfirmRequest, EditorSession } from './use-sticker-library'

const editorText = (key: string, params?: Record<string, string | number>) => t(`STICKER_LIBRARY.EDITOR.${key}`, params)

const FRAMING_LABEL: Record<StickerFraming, string> = {
  subject: 'FRAMING_SUBJECT',
  fit: 'FRAMING_FIT',
  custom: 'FRAMING_CUSTOM'
}

const FRAMING_HINT: Record<StickerFraming, string> = { subject: 'HINT_SUBJECT', fit: 'HINT_FIT', custom: 'HINT_CUSTOM' }

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; file: File; source: EditableSource; runner: StickerMaskRunner; initialDraft: StickerDraft }

// Mở ảnh đang chỉnh: giải mã, nạp bộ tách nền, dựng bản nháp đầu (null = không mở ảnh nào).
function useEditableSource(file: File | null, session: EditorSession): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const restore = useMemo(() => (session.reedit ? { edit: session.reedit.sticker.edit } : undefined), [session])

  useEffect(() => {
    if (!file) return undefined
    let isCurrent = true
    const runner = createStickerMaskRunner()

    setState({ status: 'loading' })

    openStickerSource(file, runner, restore)
      .then(({ source, initialDraft }) => {
        if (isCurrent) setState({ status: 'ready', file, source, runner, initialDraft })
      })
      .catch(() => {
        if (isCurrent) setState({ status: 'failed' })
      })

    return () => {
      isCurrent = false
      runner.dispose()
    }
  }, [file, restore])

  return state
}

// Ảnh chưa mở trong lượt Lưu tất cả: khung mặc định như khi mở ảnh, xoá nền theo ảnh đang chỉnh.
async function defaultUpload(file: File, removeBackground: boolean): Promise<StickerUpload> {
  const runner = createStickerMaskRunner()

  try {
    const { source, initialDraft } = await openStickerSource(file, runner)

    return { edit: toStickerEdit({ ...initialDraft, removeBackground }, source.size), label: null, keywords: [] }
  } finally {
    runner.dispose()
  }
}

// Ô xem trước: vẽ ô vuông đúng như renderer dựng.
function PreviewCanvas({ canvas, size }: { canvas: HTMLCanvasElement | null; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const target = ref.current
    const context = target?.getContext('2d')

    if (!target || !context) return
    context.clearRect(0, 0, target.width, target.height)
    if (canvas) context.drawImage(canvas, 0, 0, target.width, target.height)
  }, [canvas])

  return <canvas ref={ref} width={size} height={size} className='size-full object-contain' />
}

type WorkspaceProps = {
  source: EditableSource
  runner: StickerMaskRunner
  initialDraft: StickerDraft
  initialMeta: { label: string | null; keywords: string[] }
  limits: StickerLimits
  imageSize: number
  isSaving: boolean
  waitSeconds: number | null
  existing: UploadedSticker | null
  remainingImages: number
  hasLaterImages: boolean
  position: number
  total: number
  onSave: (upload: StickerUpload) => Promise<void>
  onSaveAll: (upload: StickerUpload, removeBackground: boolean) => Promise<void>
  onUpdateExisting: (changes: LibraryStickerChanges) => Promise<void>
  onSkip: () => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}

// Chỉnh một ảnh: cách lấy vùng, xoá nền, nhãn và từ khoá, xem trước đúng cỡ sticker.
function EditorWorkspace({
  source,
  runner,
  initialDraft,
  initialMeta,
  limits,
  imageSize,
  isSaving,
  waitSeconds,
  existing,
  remainingImages,
  hasLaterImages,
  position,
  total,
  onSave,
  onSaveAll,
  onUpdateExisting,
  onSkip,
  onCancel,
  onDirtyChange
}: WorkspaceProps) {
  const [draft, setDraft] = useState<StickerDraft>(initialDraft)
  const [meta, setMeta] = useState<StickerMetaDraft>(() => draftFromSticker(initialMeta))
  const [apiErrors, setApiErrors] = useState<StickerMetaErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isUpdatingExisting, setUpdatingExisting] = useState(false)
  const { size, loaded } = source
  const edit = useMemo(() => toStickerEdit(draft, size), [draft, size])
  const { preview, isRendering, hasFailed } = useStickerPreview(runner, edit)

  const changes = changesFromDraft(meta)
  const localErrors = validateStickerMeta(changes, limits)

  const metaErrors: StickerMetaErrors = {
    label: apiErrors.label ?? localErrors.label,
    keywords: apiErrors.keywords ?? localErrors.keywords
  }

  const isPreviewCurrent = preview !== null && preview.edit === edit && !isRendering
  const isEmptyResult = isPreviewCurrent && preview.isEmpty

  const canSave =
    !isSaving && !hasFailed && isPreviewCurrent && !preview.isEmpty && !hasMetaErrors(localErrors) && existing === null

  const isDirty = draft !== initialDraft || isDraftChanged(meta, initialMeta)
  const framings: StickerFraming[] = initialDraft.framing === 'custom' ? ['subject', 'fit', 'custom'] : ['subject', 'fit']

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])

  const chooseFraming = (framing: StickerFraming) => {
    const crop =
      framing === 'subject'
        ? subjectCrop(loaded.subject.subject, size)
        : framing === 'fit'
          ? fitCrop(size)
          : initialDraft.crop

    setDraft(current => ({ ...current, framing, crop }))
  }

  const upload = (): StickerUpload => ({ edit, ...changes })

  const handleError = (error: unknown) => {
    if (isAbort(error)) return
    const fieldErrors = stickerMetaErrorsFromApi(error, changes, limits)

    if (fieldErrors) {
      setApiErrors(fieldErrors)

      return
    }

    setSaveError(
      error instanceof StickerFileTooLargeError
        ? editorText('IMAGE_TOO_LARGE')
        : parseApiErrorMessage(error) || t('STICKER_LIBRARY.UPLOAD_FAILED')
    )
  }

  const save = async () => {
    if (!canSave) return
    setSaveError(null)

    try {
      await onSave(upload())
    } catch (error) {
      handleError(error)
    }
  }

  const saveAll = async () => {
    if (!canSave) return
    setSaveError(null)

    try {
      await onSaveAll(upload(), draft.removeBackground)
    } catch (error) {
      handleError(error)
    }
  }

  const updateExisting = async () => {
    setUpdatingExisting(true)

    try {
      await onUpdateExisting(changes)
    } catch (error) {
      handleError(error)
    } finally {
      setUpdatingExisting(false)
    }
  }

  const square = preview?.squareCanvases[0] ?? null
  const isFirstOfMany = total > 1

  return (
    <div className='grid min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
      <div className='flex flex-col gap-3'>
        <div className='bg-muted relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,var(--color-background)_0%_50%)] bg-size-[24px_24px]'>
          {square ? <PreviewCanvas canvas={square} size={imageSize || 256} /> : null}
          {isRendering || !preview ? (
            <span className='bg-background/70 absolute inset-0 flex items-center justify-center'>
              <Loader2Icon className='text-muted-foreground size-6 animate-spin' />
            </span>
          ) : null}
        </div>
        <p className='text-muted-foreground text-xs'>
          {editorText('PREVIEW_ACTUAL', { size: imageSize })}
          {loaded.animationUnavailable ? ` · ${editorText('ANIMATION_UNAVAILABLE')}` : ''}
        </p>
        {isEmptyResult ? (
          <Alert variant='destructive'>
            <TriangleAlertIcon />
            <AlertDescription>{editorText('EMPTY_RESULT')}</AlertDescription>
          </Alert>
        ) : null}
        {hasFailed ? (
          <Alert variant='destructive'>
            <CircleAlertIcon />
            <AlertDescription>{editorText('PROCESS_FAILED')}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className='flex min-w-0 flex-col gap-6'>
        <div className='w-full space-y-2'>
          <Label>{editorText('FRAMING')}</Label>
          <ToggleGroup
            variant='outline'
            spacing={0}
            className='w-full'
            value={[draft.framing]}
            onValueChange={(value: string[]) => {
              const next = value[0] as StickerFraming | undefined

              if (next) chooseFraming(next)
            }}
          >
            {framings.map(framing => (
              <ToggleGroupItem key={framing} value={framing} className='flex-1'>
                {editorText(FRAMING_LABEL[framing])}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className='text-muted-foreground text-xs'>{editorText(FRAMING_HINT[draft.framing])}</p>
        </div>

        <div className='flex items-center justify-between gap-4 rounded-lg border px-4 py-3'>
          <Label htmlFor='sticker-remove-background'>{editorText('REMOVE_BACKGROUND')}</Label>
          <Switch
            id='sticker-remove-background'
            checked={draft.removeBackground}
            onCheckedChange={checked => setDraft(current => ({ ...current, removeBackground: checked }))}
          />
        </div>

        <StickerMetaFields
          draft={meta}
          limits={limits}
          errors={metaErrors}
          disabled={isSaving}
          onChange={(next, field) => {
            setMeta(next)
            setApiErrors(current => ({ ...current, [field]: undefined }))
          }}
        />

        {existing ? (
          <Alert>
            <CircleCheckIcon />
            <AlertDescription className='flex flex-col items-start gap-3'>
              {existing.label
                ? editorText('EXISTING_LABELLED', { slot: existing.position + 1, label: existing.label })
                : editorText('EXISTING', { slot: existing.position + 1 })}
              <div className='flex flex-wrap gap-2'>
                <Button size='sm' disabled={isUpdatingExisting} onClick={() => void updateExisting()}>
                  {isUpdatingExisting ? <Loader2Icon className='animate-spin' /> : null}
                  {editorText('UPDATE_EXISTING')}
                </Button>
                <Button size='sm' variant='outline' onClick={onSkip}>
                  {editorText('SKIP_EXISTING')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {saveError ? (
          <Alert variant='destructive'>
            <CircleAlertIcon />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        <div className='mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end'>
          <Button variant='outline' disabled={isSaving} onClick={isFirstOfMany ? onSkip : onCancel}>
            {isFirstOfMany ? editorText('SKIP') : editorText('CANCEL')}
          </Button>
          {remainingImages > 1 ? (
            <Button variant='secondary' disabled={!canSave} onClick={() => void saveAll()}>
              {editorText('SAVE_ALL', { count: remainingImages })}
            </Button>
          ) : null}
          <Button disabled={!canSave} onClick={() => void save()}>
            {isSaving ? <Loader2Icon className='animate-spin' /> : null}
            {isSaving
              ? waitSeconds !== null && waitSeconds > 0
                ? editorText('WAITING_FOR_SERVER', { seconds: waitSeconds })
                : editorText('SAVING')
              : hasLaterImages
                ? editorText('SAVE_AND_NEXT', { index: position, total })
                : editorText('SAVE')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function useWaitCountdown(isSaving: boolean) {
  const [until, setUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isSaving) setUntil(null)
  }, [isSaving])

  useEffect(() => {
    if (until === null) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 250)

    return () => window.clearInterval(timer)
  }, [until])

  return {
    seconds: until === null ? null : Math.max(0, Math.ceil((until - now) / 1000)),
    start: (delayMs: number) => {
      setNow(Date.now())
      setUntil(Date.now() + delayMs)
    }
  }
}

type StickerEditorDialogProps = {
  session: EditorSession
  imageSize: number
  limits: StickerLimits
  onUpload: (file: File, upload: StickerUpload, options: UploadOptions) => Promise<UploadedSticker>
  onUpdateExisting: (stickerId: number, changes: LibraryStickerChanges) => Promise<unknown>
  onClose: (summary: EditorQueueSummary) => void
}

// Hộp tải sticker cho cả hàng chờ ảnh (hoặc chỉnh lại ảnh một sticker đã lưu).
const StickerEditorDialog = ({ session, imageSize, limits, onUpload, onUpdateExisting, onClose }: StickerEditorDialogProps) => {
  const { files, rejected, reedit } = session
  const [queue, dispatchQueue] = useReducer(editorQueueReducer, files, createQueue)
  const [existing, setExisting] = useState<{ index: number; sticker: UploadedSticker } | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmRequest | null>(null)
  const dirtyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const closedRef = useRef(false)

  const item = currentItem(queue)
  const bulk = bulkProgress(queue)
  const loadState = useEditableSource(bulk ? null : (item?.file ?? files[0]), session)
  const isSaving = item?.status === 'saving' || bulk !== null
  const countdown = useWaitCountdown(isSaving)
  const existingSticker = existing?.index === queue.index ? existing.sticker : null
  const summary = summarizeQueue(queue)
  const showsSummary = queue.finished && (files.length > 1 || rejected.length > 0)

  const finish = () => {
    if (closedRef.current) return
    closedRef.current = true
    abortRef.current?.abort()
    onClose(summarizeQueue(queue))
  }

  const requestClose = () => {
    if (confirmation) return

    if (queue.finished) {
      finish()

      return
    }

    const unsaved = unsavedCount(queue)

    if (unsaved === 0 || (!dirtyRef.current && !isSaving && !hasLaterItems(queue))) {
      finish()

      return
    }

    setConfirmation({
      title: t('STICKER_LIBRARY.DISCARD_QUEUE_TITLE', { count: unsaved }),
      message: t('STICKER_LIBRARY.DISCARD_QUEUE_MESSAGE'),
      confirmLabel: t('STICKER_LIBRARY.DISCARD'),
      cancelLabel: t('STICKER_LIBRARY.KEEP_EDITING_IMAGES'),
      tone: 'destructive',
      onConfirm: finish
    })
  }

  useEffect(() => {
    if (queue.finished && !showsSummary) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.finished, showsSummary])

  const save = async (upload: StickerUpload) => {
    if (!item) return
    const controller = new AbortController()

    abortRef.current = controller
    const index = queue.index

    dispatchQueue({ type: 'saving' })

    try {
      const result = await onUpload(item.file, upload, { signal: controller.signal, onThrottleWait: countdown.start })

      if (controller.signal.aborted) return
      if (result.existing) setExisting({ index, sticker: result })
      dispatchQueue({ type: 'saved', stickerId: result.id, existing: result.existing })
      dirtyRef.current = false
    } catch (error) {
      if (!controller.signal.aborted) dispatchQueue({ type: 'save-failed' })
      throw error
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const saveAll = async (upload: StickerUpload, removeBackground: boolean) => {
    if (!item || bulk) return
    const controller = new AbortController()

    abortRef.current = controller

    const indexes = queue.items.flatMap((queued, index) =>
      index >= queue.index && queued.status === 'pending' ? [index] : []
    )

    dispatchQueue({ type: 'bulk-start' })

    try {
      for (const index of indexes) {
        if (controller.signal.aborted) return
        const file = queue.items[index].file

        dispatchQueue({ type: 'bulk-saving', index })

        try {
          const itemUpload = index === queue.index ? upload : await defaultUpload(file, removeBackground)
          const result = await onUpload(file, itemUpload, { signal: controller.signal, onThrottleWait: countdown.start })

          if (controller.signal.aborted) return
          dispatchQueue({ type: 'bulk-saved', index, stickerId: result.id, existing: result.existing })
        } catch (error) {
          if (controller.signal.aborted) return
          dispatchQueue({
            type: 'bulk-failed',
            index,
            error: parseApiErrorMessage(error) || t('STICKER_LIBRARY.UPLOAD_FAILED')
          })
        }
      }

      dispatchQueue({ type: 'bulk-finish' })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const updateExisting = async (changes: LibraryStickerChanges) => {
    if (!existingSticker) return
    await onUpdateExisting(existingSticker.id, changes)
    dispatchQueue({ type: 'next' })
  }

  const skip = () => {
    dirtyRef.current = false
    dispatchQueue({ type: existingSticker ? 'next' : 'skip' })
  }

  const position = queue.index + 1

  const title = reedit
    ? editorText('REEDIT_TITLE')
    : queue.finished
      ? editorText('TITLE')
      : editorText('TITLE_WITH_POSITION', { index: position, total: files.length })

  const summaryParts = [
    editorText('SUMMARY_ADDED', { count: summary.addedIds.length }),
    ...(summary.skipped > 0 ? [editorText('SUMMARY_SKIPPED', { count: summary.skipped })] : []),
    ...(rejected.length > 0 ? [editorText('SUMMARY_REJECTED', { count: rejected.length })] : []),
    ...(summary.existingIds.length > 0 ? [editorText('SUMMARY_EXISTING', { count: summary.existingIds.length })] : []),
    ...(summary.failed.length > 0 ? [editorText('SUMMARY_FAILED', { count: summary.failed.length })] : [])
  ]

  let body

  if (showsSummary) {
    body = (
      <div role='status' className='flex flex-col items-center gap-4 py-6 text-center'>
        {summary.failed.length > 0 ? (
          <CircleAlertIcon className='size-10 text-amber-500' />
        ) : (
          <CircleCheckIcon className='size-10 text-green-600 dark:text-green-400' />
        )}
        <p className='text-base font-medium'>{summaryParts.join(' · ')}</p>
        {summary.failed.length > 0 ? (
          <ul aria-label={editorText('SUMMARY_FAILED_LIST')} className='text-destructive space-y-1 text-left text-sm'>
            {summary.failed.map(({ name, error }, index) => (
              <li key={`${name}-${index}`} className='break-words'>
                {editorText('SUMMARY_FAILED_ITEM', { name, error })}
              </li>
            ))}
          </ul>
        ) : null}
        <Button onClick={finish}>{editorText('DONE')}</Button>
      </div>
    )
  } else if (bulk) {
    body = (
      <div role='status' aria-live='polite' className='flex flex-col items-center gap-4 py-10 text-center'>
        <p className='text-sm font-medium'>{editorText('BULK_PROGRESS', { done: bulk.done, total: bulk.total })}</p>
        <Progress value={bulk.total ? (bulk.done / bulk.total) * 100 : 0} className='w-60' />
      </div>
    )
  } else if (item && loadState.status === 'ready' && loadState.file === item.file) {
    body = (
      <EditorWorkspace
        key={queue.index}
        source={loadState.source}
        runner={loadState.runner}
        initialDraft={loadState.initialDraft}
        initialMeta={reedit ? reedit.sticker : { label: null, keywords: [] }}
        limits={limits}
        imageSize={imageSize}
        isSaving={isSaving}
        waitSeconds={countdown.seconds}
        existing={existingSticker}
        remainingImages={reedit ? 1 : remainingCount(queue)}
        hasLaterImages={hasLaterItems(queue)}
        position={position}
        total={files.length}
        onSave={save}
        onSaveAll={saveAll}
        onUpdateExisting={updateExisting}
        onSkip={skip}
        onCancel={requestClose}
        onDirtyChange={dirty => {
          dirtyRef.current = dirty
        }}
      />
    )
  } else {
    body = (
      <div className='flex flex-col items-center gap-4 py-10 text-center'>
        {loadState.status === 'failed' && item ? (
          <Alert variant='destructive' className='text-left'>
            <CircleAlertIcon />
            <AlertDescription>{editorText('LOAD_FAILED')}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Loader2Icon className='text-muted-foreground size-6 animate-spin' />
            <p className='text-muted-foreground text-sm'>{editorText('LOADING')}</p>
          </>
        )}
        <Button variant='outline' onClick={files.length > 1 ? skip : requestClose}>
          {files.length > 1 ? editorText('SKIP') : editorText('CANCEL')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={open => {
          if (!open) requestClose()
        }}
      >
        <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={cn(!item && 'sr-only')}>{item?.file.name ?? title}</DialogDescription>
          </DialogHeader>
          {rejected.length > 0 && !queue.finished ? (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>
                {editorText('REJECTED_STRIP', {
                  valid: files.length,
                  total: files.length + rejected.length,
                  files: describeRejected(rejected)
                })}
              </AlertDescription>
            </Alert>
          ) : null}
          {body}
        </DialogContent>
      </Dialog>
      <ConfirmDialog request={confirmation} onClose={() => setConfirmation(null)} />
    </>
  )
}

export default StickerEditorDialog
