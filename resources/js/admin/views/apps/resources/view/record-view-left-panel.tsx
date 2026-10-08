// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Avatar, AvatarGeneratedFallback, AvatarImage } from '@admin/components/ui/avatar'
import { Badge } from '@admin/components/ui/badge'
import { Card, CardContent } from '@admin/components/ui/card'
import { Separator } from '@admin/components/ui/separator'

// Util Imports
import { cn } from '@admin/lib/utils'

export type RecordStatusTone = 'active' | 'pending' | 'suspended' | 'inactive'

const STATUS_DOT_STYLES: Record<RecordStatusTone, string> = {
  active: 'bg-green-500',
  pending: 'bg-amber-500',
  suspended: 'bg-destructive',
  inactive: 'bg-muted-foreground'
}

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
    <Card className='lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto'>
      <CardContent className='space-y-6 pt-6'>
        <div className='flex flex-col items-center text-center'>
          <Avatar className='size-24'>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} /> : null}
            <AvatarGeneratedFallback seed={avatarSeed} name={title} />
          </Avatar>
          <TitleTag className='mt-4 line-clamp-4 text-xl font-semibold break-words'>{title}</TitleTag>
          {badge ? (
            typeof badge === 'string' ? (
              <Badge variant='secondary' className='mt-2'>
                {badge}
              </Badge>
            ) : (
              <div className='mt-2'>{badge}</div>
            )
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className='grid grid-cols-2 gap-3'>
            {stats.map(stat => (
              <div key={stat.key} className='bg-muted/40 flex flex-col items-center rounded-lg border p-4 text-center'>
                <span className='text-primary mb-2 [&_svg]:size-5'>{stat.icon}</span>
                <span className='text-lg font-semibold'>{stat.value}</span>
                <span className='text-muted-foreground text-xs'>{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}

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
                    <span className={cn('size-2 rounded-full', STATUS_DOT_STYLES[row.status])} />
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
      </CardContent>
    </Card>
  )
}
