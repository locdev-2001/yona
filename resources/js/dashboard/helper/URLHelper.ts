
// Tương đương dashboard/helper/URLHelper.js frontendURL + useAccount().accountScopedRoute
// (Inertia dùng URL trực tiếp thay route name của vue-router).
export const frontendURL = (path: string) => `/app/${path}`;

export const accountScopedUrl = (accountId: number, path: string) =>
    frontendURL(`accounts/${accountId}/${path}`);

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

// Port từ helper/URLHelper.js#isValidURL — cờ `g` của gốc giữ lastIndex giữa
// hai lần test nên phải tạo regex mới mỗi lần gọi.
export const isValidURL = (value: string): boolean =>
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/.test(
        value,
    );
