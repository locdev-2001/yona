// Các trợ lý AI nối được vào MCP kho sticker. Thêm một trợ lý = thêm một mục ở đây;
// màn MCP và thẻ skill đọc chung danh sách này, không trợ lý nào là mặc định riêng.

const MCP_SERVER_NAME = 'yona-stickers';

export type AiAssistantId = 'claude_code' | 'codex' | 'other';

export interface AiAssistant {
    id: AiAssistantId;
    // Tên sản phẩm giữ nguyên mọi ngôn ngữ; null thì lấy nhãn dịch theo id.
    productName: string | null;
    mcpSetup: (mcpUrl: string, token: string) => string;
    // null: trợ lý không có thư mục skills cố định, hướng dẫn chung theo tài liệu của trợ lý đó.
    skillsDirectory: string | null;
}

export const AI_ASSISTANTS: AiAssistant[] = [
    {
        id: 'claude_code',
        productName: 'Claude Code',
        mcpSetup: (mcpUrl, token) =>
            `claude mcp add --transport http ${MCP_SERVER_NAME} ${mcpUrl} --header "Authorization: Bearer ${token}"`,
        skillsDirectory: '~/.claude/skills',
    },
    {
        id: 'codex',
        productName: 'Codex',
        mcpSetup: (mcpUrl, token) =>
            `[mcp_servers.${MCP_SERVER_NAME}]\nurl = "${mcpUrl}"\nhttp_headers = { Authorization = "Bearer ${token}" }`,
        skillsDirectory: '~/.codex/skills',
    },
    {
        id: 'other',
        productName: null,
        mcpSetup: (mcpUrl, token) =>
            JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: { url: mcpUrl, headers: { Authorization: `Bearer ${token}` } } } }, null, 2),
        skillsDirectory: null,
    },
];

export function findAiAssistant(id: AiAssistantId): AiAssistant {
    return AI_ASSISTANTS.find(assistant => assistant.id === id) ?? AI_ASSISTANTS[0];
}
