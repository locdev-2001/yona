// React Imports
import { useMemo } from 'react'

// Third-party Imports
import { usePage } from '@inertiajs/react'

// Đường dẫn và query của trang Inertia hiện tại, cùng dạng với hook điều hướng
// mà các component layout cần.
const parseUrl = (url: string | undefined) => new URL(url || '/', 'http://localhost')

export function usePathname(): string {
  return parseUrl(usePage().url).pathname
}

export function useSearchParams(): URLSearchParams {
  const url = usePage().url

  return useMemo(() => parseUrl(url).searchParams, [url])
}
