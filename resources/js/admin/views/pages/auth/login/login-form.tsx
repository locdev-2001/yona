// Rect Import
import { useState } from 'react'
import type { FormEvent } from 'react'

// Third-party Imports
import { EyeIcon, EyeOffIcon } from '@admin/components/icons'

// Components Import
import { Alert, AlertDescription } from '@admin/components/ui/alert'
import { Button } from '@admin/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@admin/components/ui/field'
import { Input } from '@admin/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@admin/components/ui/input-group'

type Props = {
  id?: string
  email: string
  password: string
  error?: string | null
  processing?: boolean
  labels: {
    email: string
    emailPlaceholder: string
    password: string
    submit: string
    showPassword: string
    hidePassword: string
  }
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
}

const LoginForm = ({
  id,
  email,
  password,
  error,
  processing,
  labels,
  onEmailChange,
  onPasswordChange,
  onSubmit
}: Props) => {
  const [isVisible, setIsVisible] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form id={id} onSubmit={handleSubmit}>
      <FieldGroup className='gap-4'>
        {error ? (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {/* Email */}
        <Field className='gap-2'>
          <FieldLabel htmlFor='super_admin_email' className='leading-5'>
            {labels.email}
          </FieldLabel>
          <Input
            autoFocus
            autoComplete='email'
            type='email'
            id='super_admin_email'
            className='h-11 md:h-9'
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={event => onEmailChange(event.target.value)}
          />
        </Field>
        {/* Password */}
        <Field className='w-full gap-2'>
          <FieldLabel htmlFor='super_admin_password' className='leading-5'>
            {labels.password}
          </FieldLabel>
          <InputGroup className='h-11 md:h-9'>
            <InputGroupInput
              id='super_admin_password'
              className='h-11 md:h-9'
              autoComplete='current-password'
              type={isVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsVisible(prevState => !prevState)}
                className='text-muted-foreground size-11 rounded-l-none hover:bg-transparent md:size-9'
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isVisible ? labels.hidePassword : labels.showPassword}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <Button className='h-11 w-full md:h-9' type='submit' disabled={processing}>
            {labels.submit}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
