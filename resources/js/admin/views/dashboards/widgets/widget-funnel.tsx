// Component Imports
import { Progress, ProgressLabel, ProgressValue } from '@admin/components/ui/progress'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_BADGE, TONE_PROGRESS, type Tone } from '@admin/views/dashboards/tones'

export type FunnelStepView = {
  key: string
  label: string
  count: string
  // Tỉ lệ so với bước đầu, in nhạt cạnh số đếm ("25%").
  share?: string
  // Độ rộng thanh: tỉ lệ so với bước đầu, 0–100.
  percentage: number
  caption?: string
  // Số thứ tự bước, in trong ô màu trước nhãn: bước đọc được không qua màu.
  index?: number
  tone?: Tone
}

// Phễu: mỗi bước một thanh tiến độ, độ dài theo tỉ lệ so với bước đầu; màu bước do nơi gọi chọn theo nghĩa.
const FunnelProgress = ({ title, steps }: { title: string; steps: FunnelStepView[] }) => {
  return (
    <ol aria-label={title} className='flex flex-col gap-4'>
      {steps.map(step => (
        <li key={step.key} className='flex gap-3'>
          {step.index !== undefined ? (
            <span
              aria-hidden='true'
              className={cn(
                'font-num flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-medium',
                TONE_BADGE[step.tone ?? 'primary']
              )}
            >
              {step.index}
            </span>
          ) : null}
          <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
            <Progress
              value={step.percentage}
              className={cn('**:data-[slot=progress-track]:h-2', TONE_PROGRESS[step.tone ?? 'primary'])}
            >
              <ProgressLabel>{step.label}</ProgressLabel>
              <ProgressValue className='font-num font-medium text-neutral-900'>
                {() => (
                  <>
                    {step.count}
                    {step.share ? <span className='ml-1.5 font-normal text-neutral-500'>{step.share}</span> : null}
                  </>
                )}
              </ProgressValue>
            </Progress>
            {step.caption ? <p className='font-num text-xs text-neutral-500'>{step.caption}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default FunnelProgress
