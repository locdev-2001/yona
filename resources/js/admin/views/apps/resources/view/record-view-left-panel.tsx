// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Avatar, AvatarGeneratedFallback, AvatarImage } from '@admin/components/ui/avatar'
import { StatusBadge } from '../../../../../superadmin/design-preview/components'
import { ChartInsights } from '../../../../../superadmin/design-preview/chart-insights'
import '../../../../../superadmin/resource/resources.css'
import { Separator } from '@admin/components/ui/separator'

// Util Imports
import { cn } from '@admin/lib/utils'

export type RecordStatusTone = 'active' | 'pending' | 'suspended' | 'inactive'

export type RecordDetailRow = {
  key: string
  label: string
  value: ReactNode
  status?: RecordStatusTone
  /** Giá trị dài (danh sách, khối) xuống dòng dưới nhãn thay vì canh phải. */
  stacked?: boolean
}

export type RecordStat = { key: string; icon: ReactNode; value: string; label: string }

export interface RecordViewLeftPanelProps {
  title: string
  avatarUrl?: string | null
  // Định danh bền (avatarSeed) cho avatar hình khối khi bản ghi chưa có ảnh.
  avatarSeed?: string
  badge?: ReactNode
  stats?: RecordStat[]
  detailsTitle: string
  details: RecordDetailRow[]
  actions?: ReactNode
  footer?: ReactNode
  titleAs?: 'h1' | 'h2'
}

export const formatCompactNumber = (value: number | undefined): string => {
  if (value === undefined) {
    return '-'
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}k`
  }

  return String(value)
}

// Cột trái của trang chi tiết: avatar, tên, nhãn, hai ô số liệu, danh sách chi tiết, nút thao tác.
export function RecordViewLeftPanel({
  titleAs: TitleTag = 'h1',
  title,
  avatarUrl,
  avatarSeed,
  badge,
  stats = [],
  detailsTitle,
  details,
  actions,
  footer
}: RecordViewLeftPanelProps) {
  return (
    <section className='preview-panel console-record-profile'>
      <div className='console-record-profile-content'>
        <div className='flex flex-col items-center text-center'>
          <Avatar className='console-record-avatar'>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
            <AvatarGeneratedFallback seed={avatarSeed} name={title} />
          </Avatar>
          <TitleTag className='mt-4 line-clamp-4 text-xl font-semibold break-words'>{title}</TitleTag>
          {badge ? (
            typeof badge === 'string' ? (
              <StatusBadge tone='system'>
                {badge}
              </StatusBadge>
            ) : (
              <div className='mt-2'>{badge}</div>
            )
          ) : null}
        </div>

        {stats.length > 0 && <ChartInsights items={stats.map(stat => ({ id: stat.key, label: stat.label, value: stat.value, detail: '', icon: stat.icon }))} />}

        <div className='space-y-3'>
          <h2 className='text-sm font-semibold'>{detailsTitle}</h2>
          <Separator />
          <dl className='space-y-3'>
            {details.map(row => (
              <div
                key={row.key}
                className={cn(
                  'flex gap-4 text-sm',
                  row.stacked ? 'flex-col gap-1' : 'items-center justify-between'
                )}
              >
                <dt className='text-muted-foreground shrink-0' id={row.key}>
                  {row.label}
                </dt>
                {row.status ? (
                  <dd className='flex items-center gap-2 font-medium'>
                    <span className='console-record-status-dot' data-tone={row.status} />
                    {row.value}
                  </dd>
                ) : (
                  <dd className={cn('min-w-0 font-medium break-words', !row.stacked && 'text-right')}>{row.value}</dd>
                )}
              </div>
            ))}
          </dl>
        </div>

        {actions ? <div className='flex gap-2 max-sm:flex-col'>{actions}</div> : null}
        {footer}
      </div>
    </section>
  )
}
