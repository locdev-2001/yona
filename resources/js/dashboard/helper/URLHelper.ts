// Tương đương dashboard/helper/URLHelper.js frontendURL + useAccount().accountScopedRoute
// (Inertia dùng URL trực tiếp thay route name của vue-router).
export const frontendURL = (path: string) => `/app/${path}`;

export const accountScopedUrl = (accountId: number, path: string) =>
    frontendURL(`accounts/${accountId}/${path}`);
