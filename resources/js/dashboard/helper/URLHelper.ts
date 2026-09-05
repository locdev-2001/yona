// Tương đương dashboard/helper/URLHelper.js frontendURL + useAccount().accountScopedRoute
// (Inertia dùng URL trực tiếp thay route name của vue-router).
export const frontendURL = (path: string) => `/app/${path}`;

export const accountScopedUrl = (accountId: number, path: string) =>
    frontendURL(`accounts/${accountId}/${path}`);

// Port từ URLHelper.conversationUrl — thứ tự ưu tiên inbox → label → team như gốc
// (custom_view/mention/participating/unattended vào E1/B8/B11).
export const conversationUrl = ({
    accountId,
    inboxId = 0,
    teamId = 0,
    label = '',
    id,
}: {
    accountId: number;
    inboxId?: number;
    teamId?: number;
    label?: string;
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
    return accountScopedUrl(accountId, `conversations/${id}`);
};

// Port từ URLHelper.conversationListPageURL (label → team → inbox → mặc định
// dashboard; custom_view/conversationType vào E1/B8/B11).
export const conversationListPageURL = ({
    accountId,
    inboxId = 0,
    teamId = 0,
    label = '',
}: {
    accountId: number;
    inboxId?: number;
    teamId?: number;
    label?: string;
}) => {
    if (label) return accountScopedUrl(accountId, `label/${encodeURIComponent(label)}`);
    if (teamId) return accountScopedUrl(accountId, `team/${teamId}`);
    if (inboxId) return accountScopedUrl(accountId, `inbox/${inboxId}`);
    return accountScopedUrl(accountId, 'dashboard');
};
