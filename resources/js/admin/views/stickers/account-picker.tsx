// React Imports
import { useEffect, useId, useRef, useState } from 'react'

// Third-party Imports
import { ChevronsUpDownIcon, Loader2Icon } from 'lucide-react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@admin/components/ui/command'
import { Label } from '@admin/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@admin/components/ui/popover'

// Util Imports
import { cn } from '@admin/lib/utils'

import { getJson } from 'dashboard/helper/apiClient'

type SearchResult = { type: string; id: number; title: string; subtitle: string | null; url: string }

const SEARCH_URL = '/admin/api/search'
const SEARCH_DELAY_MS = 250
const MIN_QUERY_LENGTH = 2

type AccountPickerProps = {
  label: string
  placeholder: string
  emptyText: string
  current?: { id: number; name: string }
  onSelect: (accountId: number) => void
  className?: string
}

// Ô chọn account có tìm kiếm: gọi API tìm nhanh của console, chỉ giữ kết quả loại account.
const AccountPicker = ({ label, placeholder, emptyText, current, onSelect, className }: AccountPickerProps) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < MIN_QUERY_LENGTH && !/^\d+$/.test(trimmed)) {
      setResults(null)
      setLoading(false)

      return undefined
    }

    const request = ++requestRef.current

    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const response = await getJson<{ data: SearchResult[] }>(`${SEARCH_URL}?q=${encodeURIComponent(trimmed)}`)

        if (request === requestRef.current) setResults(response.data.filter(result => result.type === 'account'))
      } catch {
        if (request === requestRef.current) setResults([])
      } finally {
        if (request === requestRef.current) setLoading(false)
      }
    }, SEARCH_DELAY_MS)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className={cn('w-full space-y-2', className)}>
      <Label htmlFor={id} className='sr-only'>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className='w-full justify-between'
            />
          }
        >
          <span className='truncate'>
            {current ? current.name : <span className='text-muted-foreground'>{placeholder}</span>}
          </span>
          <ChevronsUpDownIcon className='text-muted-foreground/80 shrink-0' aria-hidden='true' />
        </PopoverTrigger>
        <PopoverContent className='w-(--anchor-width) min-w-72 p-0' align='end'>
          <Command shouldFilter={false}>
            <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} aria-label={label} />
            <CommandList>
              {loading ? (
                <div className='text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm'>
                  <Loader2Icon className='size-4 animate-spin' />
                </div>
              ) : results === null ? null : results.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map(result => (
                    <CommandItem
                      key={result.id}
                      value={String(result.id)}
                      data-checked={current?.id === result.id}
                      onSelect={() => {
                        setOpen(false)
                        onSelect(result.id)
                      }}
                    >
                      <span className='flex min-w-0 flex-1 flex-col'>
                        <span className='truncate font-medium'>{result.title}</span>
                        {result.subtitle ? (
                          <span className='text-muted-foreground truncate text-xs'>{result.subtitle}</span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default AccountPicker
