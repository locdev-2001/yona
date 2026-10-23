// React Imports
import { useEffect, useRef, useState } from 'react'

// Third-party Imports
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  CircleAlertIcon,
  CropIcon,
  Trash2Icon,
  TriangleAlertIcon
} from '@admin/components/icons'
import Loader from 'shared/components/loader/Loader'

// Component Imports
import { Alert, AlertDescription } from '@admin/components/ui/alert'
import { Badge } from '@admin/components/ui/badge'
import { Button } from '@admin/components/ui/button'
import { Separator } from '@admin/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@admin/components/ui/sheet'

import { hasMetaErrors, validateStickerMeta } from 'dashboard/settings/customStickers/stickerLimits'
import type { StickerLimits, StickerMetaErrors } from 'dashboard/settings/customStickers/stickerLimits'
import { hasFailedReedit } from 'dashboard/settings/customStickers/types'
import type { LibrarySticker, LibraryStickerChanges } from 'dashboard/settings/customStickers/types'

import { t } from '../../../i18n'
import StickerMetaFields, { changesFromDraft, draftFromSticker, isDraftChanged } from './sticker-meta-fields'
import type { StickerMetaDraft } from './sticker-meta-fields'
import { isAnimatedSticker } from './use-sticker-library'
import type { StickerMoveTarget, StickerSaveResult } from './use-sticker-library'

type StickerDetailProps = {
  sticker: LibrarySticker
  index: number
  total: number
  limits: StickerLimits
  saving: boolean
  deleting: boolean
  reediting: boolean
  onSave: (changes: LibraryStickerChanges) => Promise<StickerSaveResult>
  onDirtyChange: (dirty: boolean) => void
  onRequestClose: () => void
  onMove: (target: StickerMoveTarget) => void
  onDelete: () => void
  onReedit: () => void
}

// Nội dung ngăn chi tiết: bản nháp giữ riêng theo sticker nên lượt poll trạng thái không ghi đè chữ đang gõ.
function StickerDetail({
  sticker,
  index,
  total,
  limits,
  saving,
  deleting,
  reediting,
  onSave,
  onDirtyChange,
  onRequestClose,
  onMove,
  onDelete,
  onReedit
}: StickerDetailProps) {
  const [draft, setDraft] = useState<StickerMetaDraft>(() => draftFromSticker(sticker))
  const [baseline, setBaseline] = useState(() => ({ label: sticker.label, keywords: sticker.keywords }))
  const [errors, setErrors] = useState<StickerMetaErrors>({})
  const labelRef = useRef<HTMLInputElement>(null)

  const isDirty = isDraftChanged(draft, baseline)
  const clientErrors = validateStickerMeta(changesFromDraft(draft), limits)
  const canSave = isDirty && !hasMetaErrors(clientErrors) && !saving

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const save = async () => {
    const changes = changesFromDraft(draft)
    const invalid = validateStickerMeta(changes, limits)

    if (hasMetaErrors(invalid)) {
      setErrors(invalid)

      return
    }

    if (!isDirty || saving) return
    const result = await onSave(changes)

    if (result.ok) {
      setBaseline({ label: changes.label, keywords: changes.keywords })
      setDraft({ label: changes.label ?? '', keywords: changes.keywords, keywordInput: '' })
      setErrors({})
    } else if (result.errors) {
      setErrors(result.errors)
    }
  }

  const cancel = () => {
    setDraft(draftFromSticker(baseline))
    setErrors({})
    onDirtyChange(false)
    onRequestClose()
  }

  const shownErrors: StickerMetaErrors = {
    label: errors.label ?? (draft.label.length > limits.maxLabelLength ? clientErrors.label : undefined),
    keywords: errors.keywords ?? clientErrors.keywords
  }

  const source = sticker.image_url ?? sticker.static_url

  return (
    <div
      className='flex min-h-0 flex-1 flex-col'
      onKeyDown={event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          void save()
        }
      }}
    >
      <SheetHeader className='border-b'>
        <SheetTitle>{t('STICKER_LIBRARY.DETAIL_TITLE')}</SheetTitle>
        <SheetDescription>{t('STICKER_LIBRARY.DETAIL_POSITION', { index: index + 1, total })}</SheetDescription>
      </SheetHeader>

      <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4'>
        <div className='flex items-center gap-4'>
          <div className='bg-muted flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border'>
            {source ? <img src={source} alt={sticker.label ?? ''} className='size-24 object-contain' /> : null}
          </div>
          <div className='flex min-w-0 flex-col items-start gap-2'>
            <span className='text-muted-foreground text-sm'>
              {isAnimatedSticker(sticker)
                ? t('STICKER_LIBRARY.DETAIL_ANIMATED', { frames: sticker.frames ?? 1 })
                : t('STICKER_LIBRARY.DETAIL_STATIC')}
            </span>
            <Badge variant={sticker.status === 'failed' ? 'destructive' : 'secondary'}>
              {t(`STICKER_LIBRARY.STATUS.${sticker.status}`)}
            </Badge>
          </div>
        </div>

        {sticker.status === 'failed' && sticker.failure_message ? (
          <Alert variant='destructive'>
            <CircleAlertIcon />
            <AlertDescription>{sticker.failure_message}</AlertDescription>
          </Alert>
        ) : null}
        {hasFailedReedit(sticker) ? (
          <Alert role='status'>
            <TriangleAlertIcon />
            <AlertDescription>
              {t('STICKER_LIBRARY.REEDIT_FAILED', { reason: sticker.failure_message ?? '' })}
            </AlertDescription>
          </Alert>
        ) : null}

        <StickerMetaFields
          draft={draft}
          limits={limits}
          errors={shownErrors}
          disabled={saving}
          labelRef={labelRef}
          onChange={(next, field) => {
            setDraft(next)
            setErrors(current => ({ ...current, [field]: undefined }))
          }}
        />

        <Separator />

        <div className='flex flex-col gap-1'>
          <Button
            variant='ghost'
            className='justify-start'
            disabled={!sticker.has_original || sticker.status === 'processing' || reediting}
            title={sticker.has_original ? undefined : t('STICKER_LIBRARY.REEDIT_NO_ORIGINAL')}
            onClick={onReedit}
          >
            {reediting ? <Loader size={16} /> : <CropIcon />}
            {t('STICKER_LIBRARY.REEDIT')}
          </Button>
          <Button variant='ghost' className='justify-start' disabled={index === 0} onClick={() => onMove('first')}>
            <ArrowUpToLineIcon />
            {t('STICKER_LIBRARY.MOVE_FIRST')}
          </Button>
          <Button
            variant='ghost'
            className='justify-start'
            disabled={index === total - 1}
            onClick={() => onMove('last')}
          >
            <ArrowDownToLineIcon />
            {t('STICKER_LIBRARY.MOVE_LAST')}
          </Button>
          <Button
            variant='ghost'
            className='text-destructive hover:bg-destructive/10 hover:text-destructive justify-start'
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting ? <Loader size={16} /> : <Trash2Icon />}
            {t('STICKER_LIBRARY.DELETE_STICKER')}
          </Button>
        </div>
      </div>

      <SheetFooter className='flex-row justify-end border-t'>
        <Button variant='outline' onClick={cancel}>
          {t('STICKER_LIBRARY.CANCEL')}
        </Button>
        <Button disabled={!canSave} onClick={() => void save()}>
          {saving ? <Loader size={16} /> : null}
          {t('STICKER_LIBRARY.SAVE')}
        </Button>
      </SheetFooter>
    </div>
  )
}

type StickerDetailSheetProps = Omit<StickerDetailProps, 'sticker' | 'index'> & {
  sticker: LibrarySticker | null
  index: number
  revision: number
}

// Ngăn bên phải sửa nhãn, từ khoá, vị trí của một sticker.
const StickerDetailSheet = ({ sticker, revision, onRequestClose, ...props }: StickerDetailSheetProps) => {
  return (
    <Sheet
      open={sticker !== null}
      onOpenChange={open => {
        if (!open) onRequestClose()
      }}
    >
      <SheetContent className='gap-0 sm:max-w-md'>
        {sticker ? (
          <StickerDetail
            key={`${sticker.id}:${revision}`}
            sticker={sticker}
            onRequestClose={onRequestClose}
            {...props}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export default StickerDetailSheet
