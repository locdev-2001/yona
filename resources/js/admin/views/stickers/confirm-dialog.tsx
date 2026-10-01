// React Imports
import { useState } from 'react'

// Third-party Imports
import { Loader2Icon } from 'lucide-react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@admin/components/ui/dialog'

import { t } from '../../../i18n'
import type { ConfirmRequest } from './use-sticker-library'

type ConfirmDialogProps = {
  request: ConfirmRequest | null
  onClose: () => void
}

// Hộp hỏi lại trước thao tác khó hoàn tác (xoá bộ, xoá sticker, chuyển kho, bỏ thay đổi).
const ConfirmDialog = ({ request, onClose }: ConfirmDialogProps) => {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!request) return
    setBusy(true)

    try {
      await request.onConfirm()
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className='sm:max-w-md' showCloseButton={false}>
        {request ? (
          <>
            <DialogHeader className='space-y-2'>
              <DialogTitle>{request.title}</DialogTitle>
              <div className='flex items-start gap-3'>
                {request.preview}
                <div className='text-muted-foreground text-sm'>{request.message}</div>
              </div>
            </DialogHeader>
            <div className='flex flex-col-reverse gap-4 sm:flex-row sm:justify-end'>
              <Button variant='outline' disabled={busy} onClick={onClose}>
                {request.cancelLabel ?? t('STICKER_LIBRARY.CANCEL')}
              </Button>
              <Button
                variant={request.tone === 'destructive' ? 'destructive' : 'default'}
                disabled={busy}
                onClick={() => void confirm()}
              >
                {busy ? <Loader2Icon className='animate-spin' /> : null}
                {request.confirmLabel}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
