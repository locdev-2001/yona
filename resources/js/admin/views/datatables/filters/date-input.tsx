// React Imports
import { useEffect, useMemo, useState } from 'react'

// Third-party Imports
import { addDays, addMonths, isSameDay, isSameMonth, isValid, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@admin/components/icons'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@admin/components/ui/popover'

// Util Imports
import { cn } from '@admin/lib/utils'

export type DateInputLabels = {
  openCalendar: string
  previousMonth: string
  nextMonth: string
  // Bảy nhãn thứ, bắt đầu từ thứ Hai.
  weekdays: string[]
  month: (date: Date) => string
}

type DateInputProps = {
  id: string
  label: string
  // yyyy-mm-dd, chuỗi rỗng = chưa chọn.
  value: string
  onChange: (value: string) => void
  labels: DateInputLabels
  // Chữ ngắn đứng trước ô ("Từ", "Đến") khi ô không có nhãn hiện.
  prefix?: string
  className?: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const parseIso = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))

  return isValid(date) && date.getDate() === Number(match[3]) ? date : null
}

const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const toDisplay = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`

// Gõ số liền thì tự chèn dấu "/" theo dd/mm/yyyy.
const maskTyping = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
}

const parseDisplay = (text: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)

  return match ? parseIso(`${match[3]}-${match[2]}-${match[1]}`) : null
}

// Ô ngày kiểu Việt Nam (dd/mm/yyyy): gõ tay hoặc chọn trên lịch tháng. Ô ngày gốc của
// trình duyệt hiện theo ngôn ngữ máy (mm/dd/yyyy), lạc giữa giao diện tiếng Việt.
const DateInput = ({ id, label, value, onChange, labels, prefix, className }: DateInputProps) => {
  const selected = parseIso(value)
  const [text, setText] = useState(selected ? toDisplay(selected) : '')
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))

  useEffect(() => {
    const next = parseIso(value)

    setText(next ? toDisplay(next) : '')
  }, [value])

  const days = useMemo(() => {
    const first = startOfWeek(month, { weekStartsOn: 1 })

    return Array.from({ length: 42 }, (_, index) => addDays(first, index))
  }, [month])

  const commit = (nextText: string) => {
    setText(nextText)

    if (nextText === '') {
      onChange('')

      return
    }

    const date = parseDisplay(nextText)

    if (date) onChange(toIso(date))
  }

  return (
    <InputGroup className={className}>
      {prefix ? (
        <InputGroupAddon>
          <span className='text-muted-foreground'>{prefix}</span>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput
        id={id}
        aria-label={label}
        inputMode='numeric'
        autoComplete='off'
        placeholder='dd/mm/yyyy'
        value={text}
        onChange={event => commit(maskTyping(event.target.value))}
      />
      <InputGroupAddon align='inline-end'>
        <Popover
          open={open}
          onOpenChange={next => {
            setOpen(next)
            if (next) setMonth(startOfMonth(selected ?? new Date()))
          }}
        >
          <PopoverTrigger render={<InputGroupButton size='icon-xs' aria-label={labels.openCalendar} />}>
            <CalendarIcon />
          </PopoverTrigger>
          <PopoverContent align='end' className='w-auto p-3'>
            <div className='flex items-center justify-between gap-2'>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={labels.previousMonth}
                onClick={() => setMonth(current => addMonths(current, -1))}
              >
                <ChevronLeftIcon />
              </Button>
              <p className='text-sm font-medium' aria-live='polite'>
                {labels.month(month)}
              </p>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={labels.nextMonth}
                onClick={() => setMonth(current => addMonths(current, 1))}
              >
                <ChevronRightIcon />
              </Button>
            </div>
            <div role='grid' aria-label={labels.month(month)} className='grid grid-cols-7 gap-1'>
              {labels.weekdays.map(weekday => (
                <span key={weekday} role='columnheader' className='text-muted-foreground py-1 text-center text-xs'>
                  {weekday}
                </span>
              ))}
              {days.map(day => {
                const isSelected = selected !== null && isSameDay(day, selected)

                return (
                  <button
                    key={day.toISOString()}
                    type='button'
                    role='gridcell'
                    aria-selected={isSelected}
                    aria-label={toDisplay(day)}
                    onClick={() => {
                      onChange(toIso(day))
                      setOpen(false)
                    }}
                    className={cn(
                      'hover:bg-muted flex size-10 items-center md:size-8 justify-center rounded-sm text-sm active:scale-[0.97]',
                      !isSameMonth(day, month) && 'text-muted-foreground',
                      isSameDay(day, new Date()) && !isSelected && 'text-primary font-medium',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}

export default DateInput
