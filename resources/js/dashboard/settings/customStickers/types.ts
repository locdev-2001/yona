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
    poster_url: string | null;
    static_url: string | null;
    animation_url: string | null;
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
    meta: { max_upload_kb: number; accepted_extensions: string[] };
}
