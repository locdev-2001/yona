// React Imports
import type { ReactNode } from 'react'

// Console chỉ có chủ đề sáng: giữ đúng chữ ký provider/hook mà các component
// dùng, không kéo thư viện đổi chủ đề vào.
type ThemeProviderProps = {
  children: ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return <>{children}</>
}

export const useTheme = () => ({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: (_theme: string) => {}
})
