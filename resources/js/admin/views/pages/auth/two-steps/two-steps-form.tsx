// React Imports
import { useState } from 'react'
import type { FormEvent } from 'react'

// Component Imports
import { Alert, AlertDescription } from '@admin/components/ui/alert'
import { Button } from '@admin/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@admin/components/ui/field'
import { Input } from '@admin/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@admin/components/ui/input-otp'

const OTP_LENGTH = 6
const BACKUP_CODE_LENGTH = 8

type Props = {
  isVerifying: boolean
  errorMessage?: string | null
  labels: {
    otpCode: string
    backupCode: string
    backupCodePlaceholder: string
    useBackupCode: string
    useAuthenticator: string
    submit: string
    cancel: string
  }
  onVerify: (payload: { otpCode?: string; backupCode?: string }) => void
  onCancel: () => void
}

const TwoStepsV1Form = ({ isVerifying, errorMessage, labels, onVerify, onCancel }: Props) => {
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [backupCode, setBackupCode] = useState('')

  const canSubmit = useBackupCode ? backupCode.length === BACKUP_CODE_LENGTH : otpCode.length === OTP_LENGTH

  // Xoá ô nhập ngay lúc gửi: gửi đúng thì chuyển trang, sai thì lần sau không tự gửi lại mã cũ.
  const submit = (code = otpCode) => {
    if (isVerifying) return

    if (useBackupCode) {
      if (!backupCode) return
      onVerify({ backupCode })
    } else {
      if (code.length !== OTP_LENGTH) return
      onVerify({ otpCode: code })
    }

    setOtpCode('')
    setBackupCode('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  const toggleMethod = () => {
    setUseBackupCode(current => !current)
    setOtpCode('')
    setBackupCode('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className='gap-4'>
        <Field className='gap-4'>
          <div className='flex items-center justify-between gap-1'>
            <FieldLabel htmlFor={useBackupCode ? 'backupCode' : 'recoveryCode'} className='text-base'>
              {useBackupCode ? labels.backupCode : labels.otpCode}
            </FieldLabel>
            <Button type='button' variant='link' className='h-auto p-0 text-base font-medium' onClick={toggleMethod}>
              {useBackupCode ? labels.useAuthenticator : labels.useBackupCode}
            </Button>
          </div>

          {useBackupCode ? (
            <Input
              id='backupCode'
              autoFocus
              autoComplete='one-time-code'
              className='input-lg'
              placeholder={labels.backupCodePlaceholder}
              value={backupCode}
              onChange={event => setBackupCode(event.target.value.trim())}
            />
          ) : (
            <InputOTP
              id='recoveryCode'
              autoFocus
              maxLength={OTP_LENGTH}
              pattern='^[0-9]+$'
              inputMode='numeric'
              autoComplete='one-time-code'
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(code: string) => submit(code)}
            >
              <InputOTPGroup className='w-full justify-center gap-4 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border'>
                <InputOTPSlot index={0} className='input-size-lg' />
                <InputOTPSlot index={1} className='input-size-lg' />
                <InputOTPSlot index={2} className='input-size-lg' />
                <InputOTPSlot index={3} className='input-size-lg' />
                <InputOTPSlot index={4} className='input-size-lg' />
                <InputOTPSlot index={5} className='input-size-lg' />
              </InputOTPGroup>
            </InputOTP>
          )}
        </Field>

        {errorMessage ? (
          <Alert variant='destructive'>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <Button size='lg' className='w-full' type='submit' disabled={!canSubmit || isVerifying}>
            {labels.submit}
          </Button>
          <Button type='button' variant='ghost' className='w-full' onClick={onCancel}>
            {labels.cancel}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default TwoStepsV1Form
