// React Imports
import type { ReactNode } from 'react'

// Components Import
import Logo from '@admin/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card'

// SVG Import
import AuthBackgroundShape from '@admin/assets/svg/auth-background-shape'

type Props = {
  title: string
  description: string
  children: ReactNode
}

const Login = ({ title, description, children }: Props) => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <a href='/'>
            <Logo className='gap-3' />
          </a>

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>{title}</CardTitle>
            <CardDescription className='text-base'>{description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          {/* Login Form */}
          <div className='space-y-4'>{children}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
