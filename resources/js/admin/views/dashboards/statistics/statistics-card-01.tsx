// Type Imports
import type { ReactNode } from 'react'

// Third-party Imports
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

// Component Imports
import { Card, CardContent } from '@admin/components/ui/card'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_CHIP, TONE_RULE, type Tone } from '@admin/views/dashboards/tones'

export type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  // Màu theo nghĩa của chỉ số (MEANING_TONE): vạch đỉnh thẻ và ô biểu tượng nền nhạt. Số luôn màu mực.
  tone?: Tone
  // Chênh lệch đã định dạng ("+12,5%"); có thì dòng cuối là chip chênh lệch + `comparisonText`.
  changePercentage?: string | null
  trend?: 'up' | 'down' | 'flat'
  // Chiều nào là tin tốt: chi phí, lượt lỗi… tăng là xấu nên chip tăng tô đỏ.
  goodWhen?: 'up' | 'down'
  comparisonText?: string
  // Dòng phụ ngay dưới số (đơn vị, mẫu số…), hiện cùng dòng chênh lệch.
  caption?: ReactNode
  // Dòng cuối khi không có chênh lệch (kỳ trước, phạm vi tính…).
  note?: ReactNode
  className?: string
}

// Chênh lệch theo chiều tốt xanh, chiều xấu đỏ, đứng yên xám; mũi tên đi kèm nên không chỉ dựa vào màu.
const GOOD_CHIP = 'bg-success-tint text-success'
const BAD_CHIP = 'bg-danger-tint text-danger'
const FLAT_CHIP = 'bg-neutral-100 text-neutral-700'

const trendChip = (trend: 'up' | 'down' | 'flat', goodWhen: 'up' | 'down') =>
  trend === 'flat' ? FLAT_CHIP : trend === goodWhen ? GOOD_CHIP : BAD_CHIP

// Thẻ chỉ số DUY NHẤT của console (Tổng quan, hồ sơ tài khoản, Sức khoẻ kênh, Cảnh báo):
// nhãn xám nhỏ trên cùng + ô biểu tượng góc phải, số lớn màu mực, rồi một dòng phụ.
const StatisticsCard = ({
  icon,
  value,
  title,
  tone = 'neutral',
  changePercentage = null,
  trend = 'flat',
  goodWhen = 'up',
  comparisonText,
  caption,
  note,
  className
}: StatisticsCardProps) => {
  return (
    <Card size='sm' className={cn('relative', className)}>
      <span aria-hidden='true' className={cn('absolute inset-x-0 top-0 h-1', TONE_RULE[tone])} />
      <CardContent className='flex flex-col gap-2'>
        {/* Nhãn chiếm trọn bề ngang (ô biểu tượng xuống hàng số) để nhãn không bị ép xuống dòng ở lưới hai cột. */}
        <span className='min-w-0 text-sm text-neutral-500'>{title}</span>
        <div className='flex items-center justify-between gap-2'>
          <span className='font-num min-w-0 truncate text-2xl font-medium text-neutral-900'>{value}</span>
          <span
            aria-hidden='true'
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-sm', TONE_CHIP[tone])}
          >
            {icon}
          </span>
        </div>
        {caption ? <p className='min-w-0 truncate text-xs text-neutral-500'>{caption}</p> : null}
        {changePercentage !== null ? (
          // Ô hẹp: "Kỳ trước: N" xuống dòng dưới chip thay vì bị cắt.
          <p className='flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs text-neutral-500'>
            <span className={cn('font-num flex items-center gap-0.5 rounded-sm px-1 py-0.5', trendChip(trend, goodWhen))}>
              {trend === 'up' ? <ChevronUpIcon className='size-3.5' aria-hidden='true' /> : null}
              {trend === 'down' ? <ChevronDownIcon className='size-3.5' aria-hidden='true' /> : null}
              {changePercentage}
            </span>
            {comparisonText ? <span className='whitespace-nowrap'>{comparisonText}</span> : null}
          </p>
        ) : note ? (
          <p className='min-w-0 truncate text-xs text-neutral-500'>{note}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
