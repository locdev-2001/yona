import { withUnreadTitlePrefix } from './dashboard/notifications/unreadIndicators';

const APP_NAME = 'Yona';

// Title callback của Inertia: head manager gọi mỗi lần ghi <title> (tải trang, đổi
// trang, Head gắn lại), nên đây là nơi DUY NHẤT dựng tiêu đề tab.
export function documentTitle(pageTitle: string): string {
    return withUnreadTitlePrefix(pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME);
}
