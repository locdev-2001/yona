import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import type { DashboardPageProps } from '../types';
import { fetchUnreadCount } from './api';
import type { NotificationRealtimePayload } from './types';

// Thay getter `notifications/getUnreadCount` + dispatch `notifications/unReadCount`
// trong sidebar/Sidebar.vue: một nguồn duy nhất cho huy hiệu chuông "My Inbox".
// Ba sự kiện notification.* đều mang sẵn unread_count nên không phải gọi lại API.
export function useNotificationsUnreadCount(): number {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(() => {
        fetchUnreadCount(accountId).then(setUnreadCount, () => undefined);
    }, [accountId]);

    useEffect(refresh, [refresh]);

    const applyPayload = useCallback((payload: NotificationRealtimePayload) => {
        setUnreadCount(Math.max(0, Number(payload?.unread_count ?? 0)));
    }, []);

    useRealtimeEvent('notification.created', applyPayload);
    useRealtimeEvent('notification.updated', applyPayload);
    useRealtimeEvent('notification.deleted', applyPayload);

    return unreadCount;
}
