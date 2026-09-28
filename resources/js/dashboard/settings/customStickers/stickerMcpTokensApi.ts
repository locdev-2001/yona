import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { IssuedStickerMcpToken, StickerMcpTokenListing, StickerMcpTokenScope } from './types';

const MCP_SERVER_NAME = 'yona-stickers';

export function createStickerMcpTokensApi(accountId: number) {
    const tokensUrl = `/api/v1/accounts/${accountId}/sticker_mcp_tokens`;

    return {
        listTokens: () => getJson<StickerMcpTokenListing>(tokensUrl),
        createToken: (name: string, scope: StickerMcpTokenScope) =>
            postJson<IssuedStickerMcpToken>(tokensUrl, { name, scope }),
        revokeToken: (tokenId: number) => deleteJson(`${tokensUrl}/${tokenId}`),
    };
}

export type StickerMcpTokensApi = ReturnType<typeof createStickerMcpTokensApi>;

// Lệnh dán thẳng vào terminal để Claude Code nối tới MCP kho sticker.
export function claudeMcpAddCommand(mcpUrl: string, token: string): string {
    return `claude mcp add --transport http ${MCP_SERVER_NAME} ${mcpUrl} --header "Authorization: Bearer ${token}"`;
}
