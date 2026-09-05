// Tương đương dashboard/helper/URLHelper.js frontendURL + useAccount().accountScopedRoute
// (Inertia dùng URL trực tiếp thay route name của vue-router).
export const frontendURL = (path: string) => `/app/${path}`;

export const accountScopedUrl = (accountId: number, path: string) =>
    frontendURL(`accounts/${accountId}/${path}`);

// Đường dẫn con của từng tab hội thoại lọc sẵn (urlMap trong URLHelper.js gốc).
// participating/unattended nằm ở nhóm sau, giữ nguyên bảng để thêm là chạy.
const CONVERSATION_TYPE_PATHS: Record<string, string> = {
    mention: 'mentions/conversations',
    participating: 'participating/conversations',
    unattended: 'unattended/conversations',
};

// Port từ URLHelper.conversationUrl — thứ tự ưu tiên inbox → label → team →
// conversationType như gốc (custom_view vào E1).
export const conversationUrl = ({
    accountId,
    inboxId = 0,
    teamId = 0,
    label = '',
    conversationType = '',
    id,
}: {
    accountId: number;
    inboxId?: number;
    teamId?: number;
    label?: string;
    conversationType?: string;
    id: number;
}) => {
    if (inboxId) {
        return accountScopedUrl(accountId, `inbox/${inboxId}/conversations/${id}`);
    }
    if (label) {
        return accountScopedUrl(accountId, `label/${encodeURIComponent(label)}/conversations/${id}`);
    }
    if (teamId) {
        return accountScopedUrl(accountId, `team/${teamId}/conversations/${id}`);
    }
    if (CONVERSATION_TYPE_PATHS[conversationType]) {
        return accountScopedUrl(accountId, `${CONVERSATION_TYPE_PATHS[conversationType]}/${id}`);
    }
    return accountScopedUrl(accountId, `conversations/${id}`);
};

// Port từ URLHelper.conversationListPageURL (label → team → inbox →
// conversationType → mặc định dashboard; custom_view vào E1).
export const conversationListPageURL = ({
    accountId,
    inboxId = 0,
    teamId = 0,
    label = '',
    conversationType = '',
}: {
    accountId: number;
    inboxId?: number;
    teamId?: number;
    label?: string;
    conversationType?: string;
}) => {
    if (label) return accountScopedUrl(accountId, `label/${encodeURIComponent(label)}`);
    if (teamId) return accountScopedUrl(accountId, `team/${teamId}`);
    if (inboxId) return accountScopedUrl(accountId, `inbox/${inboxId}`);
    if (CONVERSATION_TYPE_PATHS[conversationType]) {
        return accountScopedUrl(accountId, CONVERSATION_TYPE_PATHS[conversationType]);
    }
    return accountScopedUrl(accountId, 'dashboard');
};

// Port từ URLHelper.sanitizeAllowedDomains — gộp xuống dòng thành dấu phẩy,
// bỏ khoảng trắng, hạ chữ thường và loại trùng nhưng GIỮ thứ tự nhập.
export const sanitizeAllowedDomains = (domains: string): string => {
    if (!domains) return '';

    const tokens = domains
        .replace(/\r\n/g, '\n')
        .replace(/\s*\n\s*/g, ',')
        .split(',')
        .map(domain => domain.trim().toLowerCase())
        .filter(domain => domain.length > 0);

    const seen = new Set<string>();

    return tokens.filter(domain => (seen.has(domain) ? false : (seen.add(domain), true))).join(',');
};
