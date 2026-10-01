// React Imports
import type { ReactNode } from 'react'

// Component Imports
import Logo from '@admin/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card'

// Util Imports
import { cn } from '@admin/lib/utils'


type Props = {
  title: string
  description: ReactNode
  children: ReactNode
  className?: string
}

const TwoSteps = ({ title, description, children, className = 'sm:max-w-md' }: Props) => {
  return (
    <div className='bg-muted/50 relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <Card className={cn('z-1 w-full gap-6 overflow-clip py-6', className)}>
        <CardHeader className='px-6'>
          <a href='/'>
            <Logo className='gap-3' />
          </a>
        </CardHeader>

        <CardContent className='space-y-6 px-6'>
          <div>
            <CardTitle className='mb-2 text-2xl font-medium'>{title}</CardTitle>
            <CardDescription className='text-base'>{description}</CardDescription>
          </div>

          {/* TwoSteps Form */}
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

export default TwoSteps
