// Type Imports
import type { ReactNode } from 'react'

// Third-party Imports
import { ExternalLinkIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_CHIP, type Tone } from '@admin/views/dashboards/tones'

export type QuickLinkView = {
  key: string
  href: string
  external: boolean
  icon: ReactNode
  title: string
  description: string
  tone?: Tone
}

// Lối tắt: mỗi dòng một liên kết, cùng kiểu dòng của danh sách xếp hạng.
const QuickLinks = ({ links }: { links: QuickLinkView[] }) => {
  return (
    <ul className='-mx-2 flex flex-col gap-1'>
      {links.map(link => (
        <li key={link.key}>
          <a
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className='hover:bg-muted focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-md p-2 outline-none focus-visible:ring-3'
          >
            <Avatar className='size-9 rounded-sm after:rounded-[inherit] after:border-0'>
              <AvatarFallback className={cn('shrink-0 rounded-sm', TONE_CHIP[link.tone ?? 'primary'])}>{link.icon}</AvatarFallback>
            </Avatar>
            <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span className='truncate text-base font-medium'>{link.title}</span>
              <span className='truncate text-sm text-neutral-500'>{link.description}</span>
            </span>
            {link.external ? <ExternalLinkIcon className='text-muted-foreground size-4' aria-hidden='true' /> : null}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default QuickLinks
