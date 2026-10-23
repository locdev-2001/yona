// React Imports
import type { ReactNode } from 'react'

type SettingsSectionProps = {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}

// Một khối cài đặt: tiêu đề và mô tả bên trái, nội dung chiếm hai phần ba bên phải.
const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
  return (
    <div className='console-settings-section'>
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{title}</h3>
        {description ? <p className='text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      <div className='space-y-6 lg:col-span-2'>{children}</div>
    </div>
  )
}

export default SettingsSection
