// React Imports
import type { ComponentProps, MouseEvent } from 'react'

// Third-party Imports
import { Link as InertiaLink } from '@inertiajs/react'

type LinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick' | 'onProgress' | 'onError'> & {
  href: string
  onClick?: (event: MouseEvent<Element>) => void
}

const isExternal = (href: string) => /^https?:\/\//.test(href)

// Chỗ thay cho link của framework gốc: trang trong console đi bằng Inertia,
// link mở tab mới hoặc ra ngoài là thẻ <a> thường.
const Link = ({ href, target, rel, ...props }: LinkProps) => {
  if ((target && target !== '_self') || isExternal(href)) {
    return <a href={href} target={target} rel={rel ?? 'noopener noreferrer'} {...props} />
  }

  return <InertiaLink href={href} target={target} rel={rel} {...props} />
}

export default Link
