// Component Imports
import { Progress, ProgressLabel, ProgressValue } from '@admin/components/ui/progress'

export type FunnelStepView = {
  key: string
  label: string
  count: string
  // Độ rộng thanh: tỉ lệ so với bước đầu, 0–100.
  percentage: number
  caption?: string
}

// Phễu: mỗi bước một thanh tiến độ, độ dài theo tỉ lệ so với bước đầu.
const FunnelProgress = ({ title, steps }: { title: string; steps: FunnelStepView[] }) => {
  return (
    <ol aria-label={title} className='flex flex-col gap-4'>
      {steps.map(step => (
        <li key={step.key} className='flex flex-col gap-1.5'>
          <Progress value={step.percentage} className='**:data-[slot=progress-track]:h-2'>
            <ProgressLabel>{step.label}</ProgressLabel>
            <ProgressValue className='text-foreground font-medium'>{() => step.count}</ProgressValue>
          </Progress>
          {step.caption ? <p className='text-muted-foreground text-xs tabular-nums'>{step.caption}</p> : null}
        </li>
      ))}
    </ol>
  )
}

export default FunnelProgress
