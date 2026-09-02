// Tương đương dashboard/helper/URLHelper.js frontendURL + useAccount().accountScopedRoute
// (Inertia dùng URL trực tiếp thay route name của vue-router).
export const frontendURL = (path: string) => `/app/${path}`;

export const accountScopedUrl = (accountId: number, path: string) =>
    frontendURL(`accounts/${accountId}/${path}`);

// Port từ URLHelper.conversationUrl — thứ tự ưu tiên inbox → team như gốc
// (label/custom_view/mention/participating/unattended vào B7/E1/B8/B11).
export const conversationUrl = ({
    accountId,
    inboxId = 0,
    teamId = 0,
    id,
}: {
    accountId: number;
    inboxId?: number;
    teamId?: number;
    id: number;
}) => {
    if (inboxId) {
        return accountScopedUrl(accountId, `inbox/${inboxId}/conversations/${id}`);
    }
    if (teamId) {
        return accountScopedUrl(accountId, `team/${teamId}/conversations/${id}`);
    }
    return accountScopedUrl(accountId, `conversations/${id}`);
};
