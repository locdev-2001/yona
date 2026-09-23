import { router } from '@inertiajs/react';

import { detachPushOnLogout } from './pushHelper';

const LOGOUT_URL = '/app/logout';
// Gỡ đăng ký đẩy là việc phụ: mạng chậm cũng không được giữ người dùng lại.
const PUSH_DETACH_TIMEOUT_MS = 2000;

export async function logout(): Promise<void> {
    await Promise.race([
        detachPushOnLogout().catch(() => undefined),
        new Promise(resolve => setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS)),
    ]);
    router.post(LOGOUT_URL);
}
