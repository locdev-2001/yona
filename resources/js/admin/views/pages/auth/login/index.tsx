// React Imports
import type { ReactNode } from 'react'

// Components Import
import Logo from '@admin/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card'


type Props = {
  title: string
  description: string
  children: ReactNode
}

// Nền giấy nhạt để thẻ trắng tách lớp bằng bậc bề mặt + viền, không trang trí
// nào bị thẻ cắt dở.
const Login = ({ title, description, children }: Props) => {
  return (
    <div className='bg-muted/50 relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <a href='/' className='inline-flex min-h-11 items-center self-start md:min-h-0'>
            <Logo className='gap-3' />
          </a>

          <div>
            <CardTitle className='mb-2 text-2xl font-medium'>{title}</CardTitle>
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
