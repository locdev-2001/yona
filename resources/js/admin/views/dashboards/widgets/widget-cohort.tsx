// Component Imports
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'

// Util Imports
import { cn } from '@admin/lib/utils'

export type CohortCellView = { key: string; rate: number | null; label: string; title: string } | null

export type CohortRowView = { key: string; week: string; size: string; cells: CohortCellView[] }

type Props = {
  caption: string
  // Dòng nhắc vuốt ngang, chỉ hiện khi ô hẹp hơn bảng.
  scrollHint: string
  weekLabel: string
  sizeLabel: string
  offsetLabels: string[]
  rows: CohortRowView[]
}

// Bản đồ nhiệt bốn bậc token của màu chính theo tỉ lệ, số vẫn in trong ô: primary-50 / 100 mang chữ
// primary-700, primary-600 / 700 mang chữ trắng (mọi cặp ≥5.3:1). Ô không có tài khoản nào để tính
// (tuần không ai đăng ký) để trống nền, chỉ in gạch xám: khác hẳn ô 0%.
const cellClass = (rate: number | null) => {
  if (rate === null) return 'text-neutral-500'
  if (rate < 25) return 'bg-primary-50 text-primary-700'
  if (rate < 50) return 'bg-primary-100 text-primary-700'
  if (rate < 75) return 'bg-primary-600 text-neutral-0'

  return 'bg-primary-700 text-neutral-0'
}

const CohortTable = ({ caption, scrollHint, weekLabel, sizeLabel, offsetLabels, rows }: Props) => {
  return (
    <div className='flex flex-col gap-2'>
      <Table className='min-w-[34rem] text-xs tabular-nums'>
        <TableCaption className='sr-only'>{caption}</TableCaption>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='text-muted-foreground bg-card sticky left-0 z-10 w-24'>{weekLabel}</TableHead>
            <TableHead className='text-muted-foreground w-20 pr-4 text-right'>{sizeLabel}</TableHead>
            {offsetLabels.map(label => (
              <TableHead key={label} className='text-muted-foreground text-center'>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.key} className='border-0 hover:bg-transparent'>
              <TableHead scope='row' className='bg-card sticky left-0 z-10'>
                {row.week}
              </TableHead>
              <TableCell className='pr-4 text-right'>{row.size}</TableCell>
              {offsetLabels.map((label, index) => {
                const cell = row.cells[index]
                if (!cell) return <TableCell key={label} />

                return (
                  <TableCell key={label} className='p-0.5'>
                    <span
                      title={cell.title}
                      className={cn('font-num block rounded-sm px-1 py-1.5 text-center', cellClass(cell.rate))}
                    >
                      {cell.label}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className='text-muted-foreground text-xs @xl:hidden'>{scrollHint}</p>
    </div>
  )
}

export default CohortTable
