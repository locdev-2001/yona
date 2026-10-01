// Config Imports
import useThemeConfig from '@admin/configs/themeConfig'

// Util Imports
import { cn } from '@admin/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  const themeConfig = useThemeConfig()

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={themeConfig.logo} alt='' className='size-8.5 rounded-md object-contain' />
      <span className='text-xl font-bold'>{themeConfig.templateName}</span>
    </div>
  )
}

export default Logo
