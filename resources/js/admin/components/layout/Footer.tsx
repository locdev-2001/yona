// Config Imports
import useThemeConfig from '@admin/configs/themeConfig'

const Footer = () => {
  const { templateName, subtitle, version } = useThemeConfig()

  return (
    <footer>
      <div className='text-muted-foreground mx-auto flex size-full max-w-360 items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6'>
        <p className='text-sm text-balance max-sm:text-center'>
          {`©${new Date().getFullYear()}`}{' '}
          <a href='/' className='text-primary hover:underline'>
            {templateName}
          </a>
          , {subtitle}
        </p>
        <div className='flex items-center gap-5 max-sm:hidden'>
          <span className='text-muted-foreground text-sm'>{version}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
