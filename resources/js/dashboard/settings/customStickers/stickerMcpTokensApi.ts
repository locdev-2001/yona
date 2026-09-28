import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { IssuedStickerMcpToken, StickerMcpTokenListing, StickerMcpTokenScope } from './types';

export function createStickerMcpTokensApi(accountId: number) {
    const tokensUrl = `/api/v1/accounts/${accountId}/sticker_mcp_tokens`;

    return {
        listTokens: () => getJson<StickerMcpTokenListing>(tokensUrl),
        createToken: (name: string, scope: StickerMcpTokenScope) =>
            postJson<IssuedStickerMcpToken>(tokensUrl, { name, scope }),
        revokeToken: (tokenId: number) => deleteJson(`${tokensUrl}/${tokenId}`),
        skillDownloadUrl: `/api/v1/accounts/${accountId}/sticker_library_skill`,
    };
}

export type StickerMcpTokensApi = ReturnType<typeof createStickerMcpTokensApi>;

