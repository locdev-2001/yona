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

export type StickerMcpTokenScope = 'account' | 'platform';

export interface StickerMcpToken {
    id: number;
    name: string;
    scope: StickerMcpTokenScope;
    created_by: string | null;
    created_at: string | null;
    last_used_at: string | null;
}

export interface StickerMcpTokenListing {
    payload: StickerMcpToken[];
    meta: {
        usable_scopes: StickerMcpTokenScope[];
        mcp_url: string;
        skill: { name: string; prompt: string };
    };
}

export interface IssuedStickerMcpToken extends StickerMcpToken {
    token: string;
    mcp_url: string;
}

export interface StickerLibraryAccess {
    accountLibrary: boolean;
    platformLibrary: boolean;
}
