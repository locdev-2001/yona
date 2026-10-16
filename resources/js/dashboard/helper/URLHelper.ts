import {
    EMPTY_LIST_FILTER_QUERY,
    hasListFilterQuery,
    normalizeListFilterQuery,
    withListFilterQuery,
} from 'dashboard/conversation/listFilters';
import type { ListFilterQuery } from 'dashboard/conversation/listFilters';

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

// Kênh + nhãn đang lọc đi theo query string của mọi đường dẫn hội thoại (listFilters.ts);
// nhóm và màn lọc sẵn (mentions…) vẫn nằm trên path.
type ConversationRouteScope = {
    accountId: number;
    filters?: Partial<ListFilterQuery>;
    teamId?: number;
    conversationType?: string;
};

export const conversationUrl = ({
    accountId,
    filters = EMPTY_LIST_FILTER_QUERY,
    teamId = 0,
    conversationType = '',
    id,
}: ConversationRouteScope & { id: number }) => {
    let path = `conversations/${id}`;
    if (teamId) {
        path = `team/${teamId}/conversations/${id}`;
    } else if (CONVERSATION_TYPE_PATHS[conversationType]) {
        path = `${CONVERSATION_TYPE_PATHS[conversationType]}/${id}`;
    }
    return withListFilterQuery(accountScopedUrl(accountId, path), filters);
};

// Bản nháp hội thoại mới trong khung Inbox, điền sẵn người nhận khi mở từ một liên hệ.
// Bản nháp mang theo bộ lọc cột danh sách đang xem (kênh / nhãn / nhóm) để
// soạn xong vẫn đứng ở đúng danh sách đó.
export const composeConversationUrl = ({
    accountId,
    contactId = null,
    filters = EMPTY_LIST_FILTER_QUERY,
    teamId = 0,
}: Omit<ConversationRouteScope, 'conversationType'> & { contactId?: number | null }) => {
    const query = new URLSearchParams();
    if (contactId) query.set('contact_id', String(contactId));
    if (teamId) query.set('team_id', String(teamId));
    const search = query.toString();
    return withListFilterQuery(accountScopedUrl(accountId, search ? `inbox/new?${search}` : 'inbox/new'), filters);
};

const DEFAULT_LIST_PATH = 'dashboard';
const FILTERED_LIST_PATH = 'conversations';

// Danh sách mặc định có thêm kênh/nhãn thì chuyển sang đường dẫn danh sách có lọc,
// để một trạng thái lọc chỉ có một URL (sidebar so mục đang chọn theo URL này).
export const filteredListPathname = (accountId: number, pathname: string) =>
    pathname === accountScopedUrl(accountId, DEFAULT_LIST_PATH) ? accountScopedUrl(accountId, FILTERED_LIST_PATH) : pathname;

// Port từ URLHelper.conversationListPageURL: nhóm → màn lọc sẵn → danh sách có
// bộ lọc kênh/nhãn → mặc định dashboard (custom_view vào E1).
export const conversationListPageURL = ({
    accountId,
    filters = EMPTY_LIST_FILTER_QUERY,
    teamId = 0,
    conversationType = '',
}: ConversationRouteScope) => {
    let path = DEFAULT_LIST_PATH;
    if (teamId) {
        path = `team/${teamId}`;
    } else if (CONVERSATION_TYPE_PATHS[conversationType]) {
        path = CONVERSATION_TYPE_PATHS[conversationType];
    } else if (hasListFilterQuery(normalizeListFilterQuery(filters))) {
        path = FILTERED_LIST_PATH;
    }
    return withListFilterQuery(accountScopedUrl(accountId, path), filters);
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

// Port từ helper/URLHelper.js#isValidURL — cờ `g` của gốc giữ lastIndex giữa
// hai lần test nên phải tạo regex mới mỗi lần gọi.
export const isValidURL = (value: string): boolean =>
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/.test(
        value,
    );
