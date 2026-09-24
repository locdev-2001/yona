import { Head } from '@inertiajs/react';

import { useNotificationsUnreadCount } from '../useUnreadCount';

// Head manager của Inertia chỉ ghi lại <title> khi có commit. Đổi key theo số chưa
// đọc để Head gắn lại, head manager commit và title callback ghép số mới vào tiêu đề.
export default function UnreadTitleSync() {
    const unreadCount = useNotificationsUnreadCount();

    return <Head key={unreadCount} />;
}
