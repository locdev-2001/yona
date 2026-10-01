// React Imports
import { useMemo } from 'react'

// Third-party Imports
import { router } from '@inertiajs/react'

import { postJson } from 'dashboard/helper/apiClient'
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi'
import type { LibraryStickerPackDetail } from 'dashboard/settings/customStickers/types'

import StickerLibrary from './sticker-library'
import type { PackTransfer } from './use-sticker-library'

export const PLATFORM_STICKERS_URL = '/admin/sticker_packs'

// Gốc API kho riêng của một account trong console (AccountStickerPacksController::apiBaseUrl).
export const accountStickerApiBase = (accountId: number) => `/admin/api/accounts/${accountId}`

export const accountStickersUrl = (accountId: number) => `/admin/accounts/${accountId}/sticker_packs`

type AccountStickerLibraryProps = {
  accountId: number
  // Mặc định theo quy ước route; trang có sẵn từ máy chủ thì truyền vào.
  apiBaseUrl?: string
  platformUrl?: string
  className?: string
}

// Kho sticker riêng của một account: toàn quyền như quản trị viên account, thêm chuyển bộ sang kho chung.
const AccountStickerLibrary = ({
  accountId,
  apiBaseUrl = accountStickerApiBase(accountId),
  platformUrl = PLATFORM_STICKERS_URL,
  className
}: AccountStickerLibraryProps) => {
  const api = useMemo(() => createStickerLibraryApi(apiBaseUrl), [apiBaseUrl])

  const packTransfer = useMemo<PackTransfer>(
    () => ({
      destination: 'platform',
      movePack: (packId: number) =>
        postJson<LibraryStickerPackDetail>(`${apiBaseUrl}/sticker_packs/${packId}/move`, { library: 'platform' }),
      openDestination: () => router.visit(platformUrl)
    }),
    [apiBaseUrl, platformUrl]
  )

  return <StickerLibrary key={apiBaseUrl} api={api} packTransfer={packTransfer} className={className} />
}

export default AccountStickerLibrary
