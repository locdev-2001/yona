// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@admin/components/ui/dialog'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  cancelLabel: string
  confirmLabel: string
  confirmVariant?: 'destructive' | 'default'
  pending?: boolean
  onConfirm: () => void
}

// Hộp thoại xác nhận cho thao tác khó hoàn tác (xoá, khoá, mở khoá).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'destructive',
  pending = false,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={next => onOpenChange(next)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='space-y-2'>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <div className='flex flex-col-reverse gap-4 sm:flex-row sm:justify-end'>
          <DialogClose render={<Button variant='outline' />}>{cancelLabel}</DialogClose>
          <Button variant={confirmVariant} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
