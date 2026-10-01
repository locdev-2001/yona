// React Imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Third-party Imports
import { toast } from 'sonner'

import { parseApiErrorMessage } from 'dashboard/helper/apiClient'
import { currentQuery, replaceQuery } from 'dashboard/reports/helpers/urlQuery'
import { describeRejected, prepareUploadQueue } from 'dashboard/settings/customStickers/prepareUploadQueue'
import type { RejectedUpload } from 'dashboard/settings/customStickers/prepareUploadQueue'
import type { EditorQueueSummary } from 'dashboard/settings/customStickers/stickerEditorQueue'
import type {
  StickerLibraryApi,
  StickerLibraryKind,
  StickerUpload,
  UploadOptions
} from 'dashboard/settings/customStickers/stickerLibraryApi'
import {
  DEFAULT_STICKER_LIMITS,
  stickerLimitsFromMeta,
  stickerMetaErrorsFromApi
} from 'dashboard/settings/customStickers/stickerLimits'
import type { StickerMetaErrors } from 'dashboard/settings/customStickers/stickerLimits'
import { prepareStickerUpload } from 'dashboard/settings/customStickers/stickerUploadFile'
import type {
  LibrarySticker,
  LibraryStickerChanges,
  LibraryStickerPack,
  LibraryStickerPackDetail,
  StickerLibraryListing,
  UploadedSticker
} from 'dashboard/settings/customStickers/types'
import { useProcessingPoll } from 'dashboard/settings/customStickers/useProcessingPoll'
import { formatBytes } from 'shared/helpers/FileHelper'

import { t } from '../../../i18n'

export const PACK_QUERY_KEY = 'pack'
export const REORDER_DEBOUNCE_MS = 400
const FLASH_MS = 1500

// Chuyển bộ đang mở sang kho còn lại; chỉ có khi người dùng được phép.
export interface PackTransfer {
  destination: StickerLibraryKind
  movePack: (packId: number) => Promise<LibraryStickerPackDetail>
  openDestination: (packId: number) => void
}

export const MOVE_PACK_COPY: Record<StickerLibraryKind, { menu: string; title: string; message: string; done: string }> = {
  account: {
    menu: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.MENU',
    title: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.TITLE',
    message: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.MESSAGE',
    done: 'STICKER_LIBRARY.MOVE_TO_ACCOUNT.DONE'
  },
  platform: {
    menu: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.MENU',
    title: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.TITLE',
    message: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.MESSAGE',
    done: 'STICKER_LIBRARY.MOVE_TO_PLATFORM.DONE'
  }
}

export type StickerMoveTarget = 'first' | 'last'

export type StickerSaveResult = { ok: true } | { ok: false; errors: StickerMetaErrors | null }

export interface ConfirmRequest {
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'destructive' | 'default'
  preview?: ReactNode
  onConfirm: () => void | Promise<void>
}

// Mở lại sticker đã lưu: `files` chỉ gồm ảnh gốc của nó.
export interface EditorSession {
  packId: number
  files: File[]
  rejected: RejectedUpload[]
  reedit?: { stickerId: number; sticker: LibrarySticker }
}

interface Pending {
  creating: boolean
  rename: boolean
  publish: boolean
  reorder: boolean
  deleting: ReadonlySet<number>
  saving: ReadonlySet<number>
}

const IDLE: Pending = {
  creating: false,
  rename: false,
  publish: false,
  reorder: false,
  deleting: new Set(),
  saving: new Set()
}

const POLLED_FIELDS = [
  'status',
  'image_url',
  'static_url',
  'frames',
  'failure_message',
  'width',
  'height',
  'edit',
  'has_original'
] as const

type LoadState = 'loading' | 'failed' | 'ready'

const queryPackId = () => {
  const value = Number(currentQuery()[PACK_QUERY_KEY])

  return Number.isInteger(value) && value > 0 ? value : null
}

const withToggled = (set: ReadonlySet<number>, id: number, on: boolean) => {
  const next = new Set(set)

  if (on) next.add(id)
  else next.delete(id)

  return next
}

const orderStickers = (stickers: LibrarySticker[], ids: number[]) => {
  const byId = new Map(stickers.map(sticker => [sticker.id, sticker]))

  return ids.map(id => byId.get(id)).filter((sticker): sticker is LibrarySticker => sticker !== undefined)
}

const packSummary = (detail: LibraryStickerPackDetail): LibraryStickerPack => ({
  id: detail.id,
  name: detail.name,
  published: detail.published,
  published_at: detail.published_at,
  stickers_count: detail.stickers.length,
  cover_url: detail.stickers[0]?.image_url ?? null
})

export const stickerTitle = (sticker: LibrarySticker, index: number) =>
  sticker.label
    ? t('STICKER_LIBRARY.STICKER_OPTION', { label: sticker.label, count: sticker.keywords.length })
    : t('STICKER_LIBRARY.STICKER_UNNAMED', { index: index + 1 })

export const isAnimatedSticker = (sticker: LibrarySticker) => (sticker.frames ?? 1) > 1

// Toàn bộ trạng thái và thao tác của màn quản lý kho sticker (danh sách bộ, bộ đang mở,
// sắp xếp, tải lên, chỉnh, xoá, xuất bản, chuyển kho). Phần hiển thị nằm ở sticker-library.tsx.
export function useStickerLibrary({
  api,
  packTransfer,
  isMobile
}: {
  api: StickerLibraryApi
  packTransfer?: PackTransfer
  isMobile: boolean
}) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [packs, setPacks] = useState<LibraryStickerPack[]>([])
  const [meta, setMeta] = useState<StickerLibraryListing['meta'] | null>(null)
  const [requestedPackId, setRequestedPackId] = useState<number | null>(queryPackId)
  const [detail, setDetail] = useState<LibraryStickerPackDetail | null>(null)
  const [pending, setPending] = useState<Pending>(IDLE)
  const [selectedStickerId, setSelectedStickerId] = useState<number | null>(null)
  const [editorSession, setEditorSession] = useState<EditorSession | null>(null)
  const [openingReeditId, setOpeningReeditId] = useState<number | null>(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [confirmation, setConfirmation] = useState<ConfirmRequest | null>(null)
  const [flashIds, setFlashIds] = useState<ReadonlySet<number>>(new Set())

  const limits = useMemo(() => (meta ? stickerLimitsFromMeta(meta) : DEFAULT_STICKER_LIMITS), [meta])
  const uploadLimitBytes = (meta?.max_upload_kb ?? 0) * 1024
  const uploadLimit = formatBytes(uploadLimitBytes, 1)
  const acceptedExtensions = useMemo(() => meta?.accepted_extensions ?? [], [meta])

  const selectedPackId =
    requestedPackId !== null && packs.some(pack => pack.id === requestedPackId)
      ? requestedPackId
      : isMobile
        ? null
        : (packs[0]?.id ?? null)

  const currentDetail = detail?.id === selectedPackId ? detail : null

  const selectedPackRef = useRef(selectedPackId)

  selectedPackRef.current = selectedPackId
  const loadedPackRef = useRef<number | null>(null)

  loadedPackRef.current = detail?.id ?? null
  const loadSeq = useRef(0)
  const mutationSeq = useRef(0)
  const detailDirty = useRef(false)
  const reorderTimer = useRef<number | undefined>(undefined)
  const reorderBaseline = useRef<{ packId: number; ids: number[] } | null>(null)

  const setPendingFlag = (key: 'creating' | 'rename' | 'publish' | 'reorder', on: boolean) =>
    setPending(current => ({ ...current, [key]: on }))

  const errorToast = useCallback(
    (error: unknown) => toast.error(parseApiErrorMessage(error) || t('STICKER_LIBRARY.ACTION_ERROR')),
    []
  )

  const updateDetail = useCallback(
    (packId: number, update: (pack: LibraryStickerPackDetail) => LibraryStickerPackDetail) => {
      mutationSeq.current += 1
      setDetail(current => (current?.id === packId ? update(current) : current))
    },
    []
  )

  const mergePackSummary = useCallback((summary: Partial<LibraryStickerPack> & { id: number }) => {
    setPacks(current => current.map(pack => (pack.id === summary.id ? { ...pack, ...summary } : pack)))
  }, [])

  const loadPacks = useCallback(
    async (mode: 'initial' | 'refresh') => {
      try {
        const listing = await api.listPacks()

        setPacks(listing.payload)
        setMeta(listing.meta)
        setLoadState('ready')
      } catch {
        if (mode === 'initial') setLoadState(current => (current === 'ready' ? current : 'failed'))
        else
          toast.error(t('STICKER_LIBRARY.REFRESH_FAILED'), {
            action: { label: t('STICKER_LIBRARY.RETRY'), onClick: () => void loadPacks('refresh') }
          })
      }
    },
    [api]
  )

  useEffect(() => {
    void loadPacks('initial')
  }, [loadPacks])

  // Chỉ nhận phản hồi của lượt tải mới nhất, cho đúng bộ đang chọn, và chưa bị thao tác nào sau đó vượt mặt.
  const loadDetail = useCallback(
    async (packId: number) => {
      const seq = (loadSeq.current += 1)
      const mutationAtIssue = mutationSeq.current

      try {
        const pack = await api.getPack(packId)

        if (seq !== loadSeq.current || selectedPackRef.current !== packId) return

        if (mutationAtIssue !== mutationSeq.current && loadedPackRef.current === packId) {
          void loadDetail(packId)

          return
        }

        setDetail(pack)
        mergePackSummary(packSummary(pack))
      } catch {
        if (selectedPackRef.current === packId) {
          toast.error(t('STICKER_LIBRARY.REFRESH_FAILED'), {
            action: { label: t('STICKER_LIBRARY.RETRY'), onClick: () => void loadDetail(packId) }
          })
        }
      }
    },
    [api, mergePackSummary]
  )

  useEffect(() => {
    setSelectedStickerId(null)
    if (selectedPackId !== null) void loadDetail(selectedPackId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackId])

  const writePackQuery = (packId: number | null) => {
    const { [PACK_QUERY_KEY]: _previous, ...others } = currentQuery()

    replaceQuery(packId === null ? others : { ...others, [PACK_QUERY_KEY]: String(packId) })
  }

  const confirmDiscardThen = (action: () => void) => {
    if (!detailDirty.current) {
      action()

      return
    }

    setConfirmation({
      title: t('STICKER_LIBRARY.DISCARD_CHANGES_TITLE'),
      message: t('STICKER_LIBRARY.DISCARD_CHANGES_MESSAGE'),
      confirmLabel: t('STICKER_LIBRARY.DISCARD'),
      cancelLabel: t('STICKER_LIBRARY.KEEP_EDITING'),
      onConfirm: () => {
        detailDirty.current = false
        action()
      }
    })
  }

  const selectPack = (packId: number) =>
    confirmDiscardThen(() => {
      setRequestedPackId(packId)
      writePackQuery(packId)
    })

  const backToList = () =>
    confirmDiscardThen(() => {
      setRequestedPackId(null)
      writePackQuery(null)
    })

  const createPack = async (name: string): Promise<boolean> => {
    setPendingFlag('creating', true)

    try {
      const pack = await api.createPack(name)

      setPacks(current => [...current, packSummary(pack)])
      setDetail(pack)
      setRequestedPackId(pack.id)
      writePackQuery(pack.id)
      void loadPacks('refresh')

      return true
    } catch (error) {
      errorToast(error)

      return false
    } finally {
      setPendingFlag('creating', false)
    }
  }

  const renamePack = async (name: string): Promise<boolean> => {
    if (!currentDetail) return false
    const packId = currentDetail.id

    setPendingFlag('rename', true)

    try {
      const pack = await api.renamePack(packId, name)

      updateDetail(packId, current => ({ ...current, name: pack.name }))
      mergePackSummary({ id: packId, name: pack.name })
      toast.success(t('STICKER_LIBRARY.RENAMED'))

      return true
    } catch (error) {
      errorToast(error)

      return false
    } finally {
      setPendingFlag('rename', false)
    }
  }

  const republish = async (packId: number) => {
    try {
      const pack = await api.setPublished(packId, true)

      updateDetail(packId, current => ({ ...current, published: pack.published, published_at: pack.published_at }))
      mergePackSummary({ id: packId, published: pack.published, published_at: pack.published_at })
    } catch (error) {
      errorToast(error)
    }
  }

  const setPublished = async (published: boolean) => {
    if (!currentDetail) return
    const { id: packId, name } = currentDetail

    setPendingFlag('publish', true)

    try {
      const pack = await api.setPublished(packId, published)

      updateDetail(packId, current => ({ ...current, published: pack.published, published_at: pack.published_at }))
      mergePackSummary({ id: packId, published: pack.published, published_at: pack.published_at })

      if (pack.published) toast.success(t('STICKER_LIBRARY.PUBLISHED_TOAST', { name }))
      else
        toast(t('STICKER_LIBRARY.UNPUBLISHED_TOAST'), {
          action: { label: t('STICKER_LIBRARY.UNDO'), onClick: () => void republish(packId) }
        })
    } catch (error) {
      errorToast(error)
    } finally {
      setPendingFlag('publish', false)
    }
  }

  const dropPackAndSelectNeighbour = (packId: number) => {
    const index = packs.findIndex(pack => pack.id === packId)
    const remaining = packs.filter(pack => pack.id !== packId)
    const neighbour = remaining[index] ?? remaining[index - 1] ?? null

    setPacks(remaining)
    setDetail(null)
    const nextId = isMobile ? null : (neighbour?.id ?? null)

    setRequestedPackId(nextId)
    writePackQuery(nextId)
    void loadPacks('refresh')
  }

  const deletePack = () => {
    if (!currentDetail) return
    const { id: packId, name } = currentDetail

    setConfirmation({
      title: t('STICKER_LIBRARY.DELETE_PACK'),
      message: t('STICKER_LIBRARY.DELETE_PACK_CONFIRM', { name, count: currentDetail.stickers.length }),
      confirmLabel: t('STICKER_LIBRARY.DELETE_PACK'),
      tone: 'destructive',
      onConfirm: async () => {
        try {
          await api.deletePack(packId)
          dropPackAndSelectNeighbour(packId)
          toast.success(t('STICKER_LIBRARY.PACK_DELETED', { name }))
        } catch (error) {
          errorToast(error)
        }
      }
    })
  }

  const movePack = () => {
    if (!currentDetail || !packTransfer) return
    const { id: packId, name } = currentDetail
    const copy = MOVE_PACK_COPY[packTransfer.destination]

    setConfirmation({
      title: t(copy.title),
      message: t(copy.message, { name }),
      confirmLabel: t(copy.menu),
      tone: 'default',
      onConfirm: async () => {
        try {
          await packTransfer.movePack(packId)
          dropPackAndSelectNeighbour(packId)
          toast.success(t(copy.done, { name }), {
            action: { label: t('STICKER_LIBRARY.OPEN_MOVED_PACK'), onClick: () => packTransfer.openDestination(packId) }
          })
        } catch (error) {
          errorToast(error)
        }
      }
    })
  }

  const persistOrder = (packId: number, ids: number[]) => {
    window.clearTimeout(reorderTimer.current)
    reorderTimer.current = window.setTimeout(async () => {
      setPendingFlag('reorder', true)

      try {
        await api.reorderStickers(packId, ids)
        reorderBaseline.current = null
        void loadPacks('refresh')
      } catch {
        const baseline = reorderBaseline.current

        reorderBaseline.current = null

        if (baseline?.packId === packId)
          updateDetail(packId, current => ({ ...current, stickers: orderStickers(current.stickers, baseline.ids) }))
        toast.error(t('STICKER_LIBRARY.REORDER_FAILED'))
      } finally {
        setPendingFlag('reorder', false)
      }
    }, REORDER_DEBOUNCE_MS)
  }

  const reorderStickers = (ids: number[]) => {
    if (!currentDetail) return
    const packId = currentDetail.id

    if (!reorderBaseline.current)
      reorderBaseline.current = { packId, ids: currentDetail.stickers.map(sticker => sticker.id) }
    updateDetail(packId, current => ({ ...current, stickers: orderStickers(current.stickers, ids) }))
    persistOrder(packId, ids)
  }

  const moveSticker = (stickerId: number, target: StickerMoveTarget) => {
    if (!currentDetail) return
    const rest = currentDetail.stickers.map(sticker => sticker.id).filter(id => id !== stickerId)

    reorderStickers(target === 'first' ? [stickerId, ...rest] : [...rest, stickerId])
  }

  const failedFirst = () => {
    if (!currentDetail) return
    const failed = currentDetail.stickers.filter(sticker => sticker.status === 'failed').map(sticker => sticker.id)
    const others = currentDetail.stickers.filter(sticker => sticker.status !== 'failed').map(sticker => sticker.id)

    reorderStickers([...failed, ...others])
  }

  const saveSticker = async (stickerId: number, changes: LibraryStickerChanges): Promise<StickerSaveResult> => {
    if (!currentDetail) return { ok: false, errors: null }
    const packId = currentDetail.id

    setPending(current => ({ ...current, saving: withToggled(current.saving, stickerId, true) }))

    try {
      const updated = await api.updateSticker(packId, stickerId, changes)

      updateDetail(packId, current => ({
        ...current,
        stickers: current.stickers.map(sticker =>
          sticker.id === updated.id ? { ...sticker, label: updated.label, keywords: updated.keywords } : sticker
        )
      }))
      toast.success(t('STICKER_LIBRARY.SAVED'))

      return { ok: true }
    } catch (error) {
      const fieldErrors = stickerMetaErrorsFromApi(error, changes, limits)

      if (!fieldErrors) errorToast(error)

      return { ok: false, errors: fieldErrors }
    } finally {
      setPending(current => ({ ...current, saving: withToggled(current.saving, stickerId, false) }))
    }
  }

  const deleteSticker = (stickerId: number, preview?: ReactNode) => {
    if (!currentDetail) return
    const packId = currentDetail.id
    const sticker = currentDetail.stickers.find(item => item.id === stickerId)

    if (!sticker) return

    setConfirmation({
      title: t('STICKER_LIBRARY.DELETE_STICKER'),
      message: t('STICKER_LIBRARY.DELETE_STICKER_CONFIRM', { name: currentDetail.name }),
      confirmLabel: t('STICKER_LIBRARY.DELETE_STICKER'),
      tone: 'destructive',
      preview,
      onConfirm: async () => {
        setPending(current => ({ ...current, deleting: withToggled(current.deleting, stickerId, true) }))

        try {
          await api.deleteSticker(packId, stickerId)
          detailDirty.current = false
          updateDetail(packId, current => ({
            ...current,
            stickers: current.stickers.filter(item => item.id !== stickerId)
          }))
          setSelectedStickerId(current => (current === stickerId ? null : current))
          toast.success(t('STICKER_LIBRARY.STICKER_DELETED'))
          void loadPacks('refresh')
        } catch (error) {
          errorToast(error)
        } finally {
          setPending(current => ({ ...current, deleting: withToggled(current.deleting, stickerId, false) }))
        }
      }
    })
  }

  const processingIds =
    currentDetail?.stickers.filter(sticker => sticker.status === 'processing').map(sticker => sticker.id) ?? []

  const poll = useProcessingPoll({
    resetKey: `${selectedPackId}:${processingIds.join(',')}`,
    active: processingIds.length > 0,
    poll: async () => {
      if (selectedPackId === null) return
      const packId = selectedPackId
      const fresh = await api.getPack(packId)

      if (selectedPackRef.current !== packId) return
      const freshById = new Map(fresh.stickers.map(sticker => [sticker.id, sticker]))

      setDetail(current =>
        current?.id === packId
          ? {
              ...current,
              stickers: current.stickers.map(sticker => {
                const polled = freshById.get(sticker.id)

                if (!polled) return sticker
                const merged = { ...sticker }

                POLLED_FIELDS.forEach(field => Object.assign(merged, { [field]: polled[field] }))

                return merged
              })
            }
          : current
      )
      if (!fresh.stickers.some(sticker => sticker.status === 'processing')) void loadPacks('refresh')
    }
  })

  const openEditor = async (files: File[]) => {
    if (!currentDetail || files.length === 0 || editorSession) return
    const packId = currentDetail.id
    const { valid, rejected } = await prepareUploadQueue(files, { acceptedExtensions, maxBytes: uploadLimitBytes })

    if (valid.length === 0) {
      toast.error(
        t('STICKER_LIBRARY.FILES_REJECTED', { count: rejected.length, details: describeRejected(rejected) }),
        { duration: Infinity }
      )

      return
    }

    setEditorSession({ packId, files: valid, rejected })
  }

  const uploadEditedSticker = async (
    packId: number,
    file: File,
    upload: StickerUpload,
    options: UploadOptions
  ): Promise<UploadedSticker> => {
    const created = await api.uploadSticker(packId, await prepareStickerUpload(file, uploadLimitBytes), upload, options)

    void loadDetail(packId)

    return created
  }

  const updateExistingSticker = async (packId: number, stickerId: number, changes: LibraryStickerChanges) => {
    await api.updateSticker(packId, stickerId, changes)
    void loadDetail(packId)
  }

  const openReedit = (sticker: LibrarySticker, index: number) => {
    if (!currentDetail || editorSession || openingReeditId !== null) return
    const packId = currentDetail.id

    const open = async () => {
      setOpeningReeditId(sticker.id)

      try {
        const name = sticker.label ?? t('STICKER_LIBRARY.STICKER_UNNAMED', { index: index + 1 })
        const original = await api.getStickerOriginal(packId, sticker.id, name)

        setEditorSession({ packId, files: [original], rejected: [], reedit: { stickerId: sticker.id, sticker } })
      } catch (error) {
        errorToast(error)
      } finally {
        setOpeningReeditId(null)
      }
    }

    confirmDiscardThen(() => void open())
  }

  const saveReedit = async (
    packId: number,
    stickerId: number,
    upload: StickerUpload,
    options: UploadOptions
  ): Promise<UploadedSticker> => {
    const updated = await api.reeditSticker(packId, stickerId, upload, options)

    updateDetail(packId, current => ({
      ...current,
      stickers: current.stickers.map(sticker => (sticker.id === updated.id ? updated : sticker))
    }))

    return { ...updated, existing: false }
  }

  const closeEditor = (summary: EditorQueueSummary) => {
    const session = editorSession

    setEditorSession(null)
    if (!session) return
    void loadDetail(session.packId)

    if (session.reedit) {
      if (summary.addedIds.length === 0) return
      setDetailRevision(revision => revision + 1)
      toast.success(t('STICKER_LIBRARY.REEDIT_SAVED'))

      return
    }

    const touchedIds = [...summary.addedIds, ...summary.existingIds]

    if (touchedIds.length === 0) return
    const parts =
      summary.addedIds.length > 0 ? [t('STICKER_LIBRARY.STICKERS_ADDED', { count: summary.addedIds.length })] : []

    if (summary.skipped > 0) parts.push(t('STICKER_LIBRARY.STICKERS_SKIPPED', { count: summary.skipped }))
    if (summary.existingIds.length > 0)
      parts.push(t('STICKER_LIBRARY.STICKERS_EXISTING', { count: summary.existingIds.length }))
    if (summary.failed.length > 0) parts.push(t('STICKER_LIBRARY.STICKERS_FAILED', { count: summary.failed.length }))
    toast.success(parts.join(' · '))
    setFlashIds(new Set(touchedIds))
    window.setTimeout(() => setFlashIds(new Set()), FLASH_MS)
  }

  const editorUpload = (file: File, upload: StickerUpload, options: UploadOptions) => {
    const session = editorSession

    if (!session) return Promise.reject(new Error('No editor session'))

    return session.reedit
      ? saveReedit(session.packId, session.reedit.stickerId, upload, options)
      : uploadEditedSticker(session.packId, file, upload, options)
  }

  const editorUpdateExisting = (stickerId: number, changes: LibraryStickerChanges) => {
    const session = editorSession

    if (!session) return Promise.resolve()

    return updateExistingSticker(session.packId, stickerId, changes)
  }

  const selectSticker = (stickerId: number) => {
    if (stickerId === selectedStickerId) return
    confirmDiscardThen(() => setSelectedStickerId(stickerId))
  }

  const closeDetail = () =>
    confirmDiscardThen(() => {
      setSelectedStickerId(null)
      detailDirty.current = false
    })

  const onDirtyChange = useCallback((dirty: boolean) => {
    detailDirty.current = dirty
  }, [])

  const retryLoad = () => loadPacks('initial')

  const stickers = currentDetail?.stickers ?? []
  const selectedIndex = stickers.findIndex(sticker => sticker.id === selectedStickerId)

  return {
    loadState,
    retryLoad,
    packs,
    meta,
    limits,
    uploadLimit,
    acceptedExtensions,
    selectedPackId,
    currentDetail,
    stickers,
    selectedSticker: selectedIndex >= 0 ? stickers[selectedIndex] : null,
    selectedIndex,
    pending,
    flashIds,
    poll,
    confirmation,
    setConfirmation,
    editorSession,
    openingReeditId,
    detailRevision,
    canAddSticker: stickers.length < limits.maxStickers && editorSession === null,
    moveLabel: packTransfer ? t(MOVE_PACK_COPY[packTransfer.destination].menu) : null,
    selectPack,
    backToList,
    createPack,
    renamePack,
    setPublished,
    deletePack,
    movePack,
    reorderStickers,
    moveSticker,
    failedFirst,
    saveSticker,
    deleteSticker,
    openEditor,
    openReedit,
    closeEditor,
    editorUpload,
    editorUpdateExisting,
    selectSticker,
    closeDetail,
    onDirtyChange
  }
}

export type StickerLibraryState = ReturnType<typeof useStickerLibrary>
