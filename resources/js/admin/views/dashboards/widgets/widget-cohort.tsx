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
  offsetLabels: string[]
  rows: CohortRowView[]
}

// Bản đồ nhiệt: độ đậm của màu chính theo tỉ lệ (0–100%), số vẫn in trong ô.
const cellStyle = (rate: number | null) =>
  rate === null
    ? undefined
    : { backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(8 + (Math.min(rate, 100) / 100) * 82)}%, transparent)` }

const CohortTable = ({ caption, weekLabel, sizeLabel, offsetLabels, rows }: Props) => {
  return (
    <Table className='min-w-[34rem] text-xs tabular-nums'>
      <TableCaption className='sr-only'>{caption}</TableCaption>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead className='text-muted-foreground'>{weekLabel}</TableHead>
          <TableHead className='text-muted-foreground text-right'>{sizeLabel}</TableHead>
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
            <TableHead scope='row'>{row.week}</TableHead>
            <TableCell className='text-right'>{row.size}</TableCell>
            {offsetLabels.map((label, index) => {
              const cell = row.cells[index]
              if (!cell) return <TableCell key={label} />

              return (
                <TableCell key={label} className='p-0.5'>
                  <span
                    title={cell.title}
                    style={cellStyle(cell.rate)}
                    className={cn(
                      'block rounded-sm px-1 py-1.5 text-center',
                      cell.rate === null && 'bg-muted text-muted-foreground',
                      (cell.rate ?? 0) >= 55 && 'text-primary-foreground'
                    )}
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
