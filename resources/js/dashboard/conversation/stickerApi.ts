import { getJson } from 'dashboard/helper/apiClient';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import type { InboxWithCapabilities } from 'shared/constants/channelCapabilities';

// Hợp đồng của GET …/conversations/{id}/stickers. `id` là chuỗi mờ do kênh tự định
// nghĩa — FE chỉ gửi lại nguyên văn khi agent chọn.

export interface StickerItem {
    id: string;
    image_url: string;
    pack_id: string | null;
    label: string | null;
}

export interface StickerPack {
    id: string;
    cover_url: string;
}

export interface StickerBrowseResult {
    source: 'recent' | 'search' | 'pack';
    query: string | null;
    pack_id: string | null;
    stickers: StickerItem[];
    packs: StickerPack[];
}

export interface StickerBrowseParams {
    q?: string;
    pack?: string;
}

// Bảng sticker theo hội thoại đang mở, hoặc theo hộp thư khi đang soạn bản nháp
// chưa có hội thoại — hai đường cùng hình dạng phản hồi.
export type StickerScope = { conversationId: number } | { inboxId: number };

function stickerScopePath(accountId: number, scope: StickerScope): string {
    return 'inboxId' in scope
        ? `/api/v1/accounts/${accountId}/inboxes/${scope.inboxId}/stickers`
        : `/api/v1/accounts/${accountId}/conversations/${scope.conversationId}/stickers`;
}

export function fetchStickers(
    accountId: number,
    scope: StickerScope,
    params: StickerBrowseParams = {},
): Promise<StickerBrowseResult> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.pack) query.set('pack', params.pack);
    const suffix = query.toString();

    return getJson<StickerBrowseResult>(`${stickerScopePath(accountId, scope)}${suffix ? `?${suffix}` : ''}`);
}

export interface StickerSuggestionResult {
    stickers: StickerItem[];
}

// Gợi ý khi gõ: tối đa 8 sticker khớp nhãn/từ khoá, image_url là ảnh sticker (WebP).
export function fetchStickerSuggestions(
    accountId: number,
    scope: StickerScope,
    query: string,
    signal?: AbortSignal,
): Promise<StickerSuggestionResult> {
    const search = new URLSearchParams({ q: query });

    return getJson<StickerSuggestionResult>(`${stickerScopePath(accountId, scope)}/suggestions?${search.toString()}`, {
        signal,
    });
}

/**
 * Sticker đi một mình ra khách: không trong ghi chú riêng, không khi khung soạn đang khoá.
 * Kênh không có sticker riêng mà gửi được ảnh vẫn nhận sticker kho Yona dạng ảnh tĩnh.
 */
export function canPickSticker(
    inbox: InboxWithCapabilities | null | undefined,
    { isOnPrivateNote, isEditorDisabled }: { isOnPrivateNote: boolean; isEditorDisabled: boolean },
): boolean {
    const canDeliverSticker = inboxSupports(inbox, 'outbound_sticker') || inboxSupports(inbox, 'outbound_image');
    return canDeliverSticker && !isOnPrivateNote && !isEditorDisabled;
}
