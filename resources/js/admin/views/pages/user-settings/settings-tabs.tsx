// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@admin/components/ui/tabs'

export type SettingsTab = { value: string; name: string }

type SettingsTabsProps = {
  tabs: SettingsTab[]
  value: string
  // Mỗi tab là một trang riêng của máy chủ: đổi tab là điều hướng.
  onValueChange: (value: string) => void
  label?: string
  children: ReactNode
}

const SettingsTabs = ({ tabs, value, onValueChange, label, children }: SettingsTabsProps) => {
  return (
    <div className='w-full'>
      <Tabs
        value={value}
        onValueChange={next => {
          if (typeof next === 'string' && next !== value) onValueChange(next)
        }}
      >
        <div className='overflow-x-auto sm:overflow-visible'>
          <TabsList
            variant='line'
            aria-label={label}
            className='h-fit! w-max min-w-full flex-nowrap justify-start gap-0 rounded-none border-b p-0 sm:w-full sm:flex-wrap'
          >
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={value}>{children}</TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsTabs
