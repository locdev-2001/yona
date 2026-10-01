// Third-party Imports
import { SearchIcon } from 'lucide-react'

// Component Imports
import { Input } from '@admin/components/ui/input'
import { Label } from '@admin/components/ui/label'

// Util Imports
import { cn } from '@admin/lib/utils'

type FilterInputProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  labelClassName?: string
}

// Ô lọc chữ theo một cột: nhãn trên, kính lúp trong ô.
const FilterInput = ({ id, label, value, onChange, placeholder, labelClassName }: FilterInputProps) => {
  return (
    <div className='*:not-first:mt-2'>
      <Label htmlFor={id} className={cn(labelClassName)}>
        {label}
      </Label>
      <div className='relative'>
        <Input
          id={id}
          className='peer pl-9'
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          type='text'
        />
        <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
          <SearchIcon size={16} />
        </div>
      </div>
    </div>
  )
}

export default FilterInput
