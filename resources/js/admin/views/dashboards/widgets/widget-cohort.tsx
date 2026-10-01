// Component Imports
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'

// Util Imports
import { cn } from '@admin/lib/utils'

export type CohortCellView = { key: string; rate: number | null; label: string; title: string } | null

export type CohortRowView = { key: string; week: string; size: string; cells: CohortCellView[] }

type Props = {
  caption: string
  weekLabel: string
  sizeLabel: string
  // Tiêu đề nhóm trên các cột tuần ("Tuần sau khi đăng ký"); từng cột chỉ in số tuần 0, 1, 2…
  offsetGroupLabel: string
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

// Bảng vừa khít bề ngang cả trên điện thoại (không cắt cột ở mép): cột tuần chỉ in số, tiêu đề nhóm
// nằm trên; ô hẹp ẩn cột số tài khoản (vẫn có trong chú thích từng ô).
const CohortTable = ({ caption, weekLabel, sizeLabel, offsetGroupLabel, offsetLabels, rows }: Props) => {
  return (
    <Table className='font-num table-fixed text-xs'>
      <TableCaption className='sr-only'>{caption}</TableCaption>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead rowSpan={2} className='text-muted-foreground w-12 px-1 align-bottom whitespace-normal @lg:w-24 @lg:px-2'>
            {weekLabel}
          </TableHead>
          <TableHead rowSpan={2} className='text-muted-foreground hidden w-20 pr-4 text-right align-bottom @lg:table-cell'>
            {sizeLabel}
          </TableHead>
          <TableHead colSpan={offsetLabels.length} className='text-muted-foreground h-7 px-1 text-center'>
            {offsetGroupLabel}
          </TableHead>
        </TableRow>
        <TableRow className='hover:bg-transparent'>
          {offsetLabels.map(label => (
            <TableHead key={label} className='text-muted-foreground h-7 px-0 text-center'>
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.key} className='border-0 hover:bg-transparent'>
            <TableHead scope='row' className='px-1 @lg:px-2'>
              {row.week}
            </TableHead>
            <TableCell className='hidden pr-4 text-right @lg:table-cell'>{row.size}</TableCell>
            {offsetLabels.map((label, index) => {
              const cell = row.cells[index]
              if (!cell) return <TableCell key={label} className='p-0.5' />

              return (
                <TableCell key={label} className='p-0.5'>
                  <span
                    title={cell.title}
                    className={cn('block rounded-sm px-0 py-1.5 text-center', cellClass(cell.rate))}
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
  )
}

export default CohortTable
