// React Imports
import { useEffect, useId, useState } from 'react'

// Third-party Imports
import { Loader2Icon } from 'lucide-react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@admin/components/ui/dialog'
import { Input } from '@admin/components/ui/input'
import { Label } from '@admin/components/ui/label'

import { isCounterVisible } from 'dashboard/settings/customStickers/stickerLimits'
import type { LibraryStickerPack } from 'dashboard/settings/customStickers/types'

import { t } from '../../../i18n'

const normalizedName = (name: string) => name.trim().toLocaleLowerCase('vi')

export const isDuplicatePackName = (name: string, packs: LibraryStickerPack[], exceptPackId?: number) =>
  name.trim() !== '' &&
  packs.some(pack => pack.id !== exceptPackId && normalizedName(pack.name) === normalizedName(name))

type PackNameDialogProps = {
  open: boolean
  title: string
  submitLabel: string
  initialName: string
  maxLength: number
  packs: LibraryStickerPack[]
  exceptPackId?: number
  busy: boolean
  // Trả true khi máy chủ nhận tên mới: hộp tự đóng.
  onSubmit: (name: string) => Promise<boolean>
  onClose: () => void
}

// Đặt tên bộ (tạo bộ mới hoặc đổi tên): cảnh báo trùng tên nhưng vẫn cho lưu.
const PackNameDialog = ({
  open,
  title,
  submitLabel,
  initialName,
  maxLength,
  packs,
  exceptPackId,
  busy,
  onSubmit,
  onClose
}: PackNameDialogProps) => {
  const id = useId()
  const [name, setName] = useState(initialName)
  const isDuplicate = isDuplicatePackName(name, packs, exceptPackId)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  const submit = async () => {
    const trimmed = name.trim()

    if (!trimmed || busy) return
    if (trimmed === initialName.trim()) {
      onClose()

      return
    }

    if (await onSubmit(trimmed)) onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className='space-y-6'
          onSubmit={event => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className='w-full space-y-2'>
            <Label htmlFor={id}>{t('STICKER_LIBRARY.PACK_NAME_LABEL')}</Label>
            <Input
              id={id}
              autoFocus
              value={name}
              maxLength={maxLength}
              disabled={busy}
              placeholder={t('STICKER_LIBRARY.NEW_PACK_PLACEHOLDER')}
              aria-describedby={isDuplicate ? `${id}-duplicate` : undefined}
              onChange={event => setName(event.target.value)}
            />
            <div className='flex min-h-4 items-start justify-between gap-2 text-xs'>
              {isDuplicate ? (
                <span id={`${id}-duplicate`} className='text-amber-600 dark:text-amber-400'>
                  {t('STICKER_LIBRARY.DUPLICATE_PACK_NAME')}
                </span>
              ) : (
                <span />
              )}
              {isCounterVisible(name.length, maxLength) ? (
                <span className='text-muted-foreground'>
                  {name.length}/{maxLength}
                </span>
              ) : null}
            </div>
          </div>
          <div className='flex flex-col-reverse gap-4 sm:flex-row sm:justify-end'>
            <Button type='button' variant='outline' onClick={onClose}>
              {t('STICKER_LIBRARY.CANCEL')}
            </Button>
            <Button type='submit' disabled={busy || !name.trim()}>
              {busy ? <Loader2Icon className='animate-spin' /> : null}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PackNameDialog
