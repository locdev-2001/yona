export type LibraryStickerStatus = 'processing' | 'ready' | 'failed';

export interface LibrarySticker {
    id: number;
    label: string | null;
    keywords: string[];
    status: LibraryStickerStatus;
    failure_message: string | null;
    position: number;
    width: number;
    height: number;
    // Số khung (> 1 là ảnh động); null khi đang xử lý.
    frames: number | null;
    // WebP ở cạnh sticker, động nếu ảnh gốc động.
    image_url: string | null;
    // PNG tĩnh gửi kênh ngoài.
    static_url: string | null;
}

// Tải lên trả 201 kèm `existing: false`, hoặc 200 kèm `existing: true` và sticker đã có (ảnh trùng).
export interface UploadedSticker extends LibrarySticker {
    existing: boolean;
}

export interface LibraryStickerChanges {
    label: string | null;
    keywords: string[];
}

export interface LibraryStickerPack {
    id: number;
    name: string;
    published: boolean;
    published_at: string | null;
    stickers_count: number | null;
    cover_url: string | null;
}

export interface LibraryStickerPackDetail extends LibraryStickerPack {
    stickers: LibrarySticker[];
}

export interface StickerLibraryListing {
    payload: LibraryStickerPack[];
    meta: {
        max_upload_kb: number;
        accepted_extensions: string[];
        image_size: number;
        max_label_length?: number;
        max_keywords?: number;
        max_keyword_length?: number;
        max_stickers?: number;
        max_pack_name_length?: number;
    };
}

export interface StickerLibraryAccess {
    accountLibrary: boolean;
    platformLibrary: boolean;
}
