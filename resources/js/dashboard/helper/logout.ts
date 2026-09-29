import { router } from '@inertiajs/react';

import { clearUnreadIndicators } from 'dashboard/notifications/unreadIndicators';
import { detachPushOnLogout } from './pushHelper';

const LOGOUT_URL = '/app/logout';
// Gỡ đăng ký đẩy và dọn khay thông báo là việc phụ: mạng chậm cũng không được giữ
// người dùng lại.
const PUSH_DETACH_TIMEOUT_MS = 2000;

async function signOut({ detachPush }: { detachPush: boolean }): Promise<void> {
    await Promise.race([
        Promise.all([
            detachPush ? detachPushOnLogout().catch(() => undefined) : undefined,
            clearUnreadIndicators().catch(() => undefined),
        ]),
        new Promise(resolve => setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS)),
    ]);
    router.post(LOGOUT_URL);
}

// Người dùng tự đăng xuất: gỡ đăng ký đẩy vì máy có thể dùng chung.
export function logout(): Promise<void> {
    return signOut({ detachPush: true });
}

// Máy chủ chấm dứt phiên: cùng người sẽ đăng nhập lại trên trình duyệt này nên giữ đăng ký.
export function logoutKeepingPushSubscription(): Promise<void> {
    return signOut({ detachPush: false });
}
