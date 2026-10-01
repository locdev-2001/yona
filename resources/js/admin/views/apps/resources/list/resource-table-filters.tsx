// Component Imports
import { Label } from '@admin/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select'

export const ALL_FILTER = 'all'

export interface ResourceTableFiltersProps {
  label: string
  allLabel: string
  value: string
  options: { value: string; label: string }[]
  onFilterChange: (value: string) => void
}

export function ResourceTableFilters({ label, allLabel, value, options, onFilterChange }: ResourceTableFiltersProps) {
  const items = [{ label: allLabel, value: ALL_FILTER }, ...options]

  return (
    <div className='w-full sm:w-56'>
      <Label htmlFor='filter-scope' className='sr-only'>
        {label}
      </Label>
      <Select
        items={items}
        value={value || ALL_FILTER}
        onValueChange={(next: string | null) => {
          if (next) {
            onFilterChange(next === ALL_FILTER ? '' : next)
          }
        }}
      >
        <SelectTrigger id='filter-scope' aria-label={label} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
