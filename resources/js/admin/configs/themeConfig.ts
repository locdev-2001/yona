// Third-party Imports
import { usePage } from '@inertiajs/react'

type BrandingProps = {
  superAdmin?: {
    installationName?: string
    logoThumbnail?: string
    version?: string
    labels?: Record<string, string>
    currentUser?: { name: string; email: string } | null
  }
}

// Tên và logo lấy theo cấu hình cài đặt (SuperAdminInertia), không cố định.
const useThemeConfig = () => {
  const superAdmin = (usePage().props as BrandingProps).superAdmin

  return {
    templateName: superAdmin?.installationName ?? 'Yona',
    subtitle: superAdmin?.labels?.console_name ?? '',
    logo: superAdmin?.logoThumbnail ?? '',
    version: superAdmin?.version ?? '',
    labels: superAdmin?.labels ?? {},
    currentUser: superAdmin?.currentUser ?? null,
    homePageUrl: '/admin'
  }
}

export default useThemeConfig
