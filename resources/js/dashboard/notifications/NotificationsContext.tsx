import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { updateUISettings as persistUISettings } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import {
    deleteNotification as deleteNotificationRequest,
    deleteNotifications as deleteNotificationsRequest,
    fetchNotifications,
    markNotificationUnread,
    markNotificationsRead,
    snoozeNotification as snoozeNotificationRequest,
} from './api';
import { INBOX_FILTER_TYPE, INBOX_SORT_BY, mergeNotifications, sortNotifications } from './helpers';
import type { NotificationFilters, NotificationRealtimePayload, NotificationRecord, NotificationsMeta } from './types';

// Thay store/modules/notifications (Vuex) của Chatwoot: danh sách + meta + cờ UI
// + hành động, cộng ba handler realtime. Trang inbox-view là nơi duy nhất dùng.

const RESULTS_PER_PAGE = 15;

interface DisplayOption {
    key: string;
    type: string;
    selected?: boolean;
}

interface NotificationsContextValue {
    accountId: number;
    notifications: NotificationRecord[];
    meta: NotificationsMeta;
    filters: NotificationFilters;
    isFetching: boolean;
    isAllLoaded: boolean;
    uiSettings: UISettings;
    loadMore: () => void;
    applyFilter: (option: DisplayOption) => void;
    openNotification: (notification: NotificationRecord) => Promise<void>;
    markAsRead: (notification: NotificationRecord) => Promise<void>;
    markAsUnread: (notification: NotificationRecord) => Promise<void>;
    removeNotification: (notification: NotificationRecord) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteAll: () => Promise<void>;
    deleteAllRead: () => Promise<void>;
    snooze: (notificationId: number, snoozedUntil: number | null) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
    const context = useContext(NotificationsContext);
    if (!context) throw new Error('Component is missing a parent <NotificationsProvider />.');
    return context;
}

const EMPTY_META: NotificationsMeta = { count: 0, currentPage: 1, unreadCount: 0 };

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [uiSettings, setUiSettings] = useState<UISettings>(auth.user?.ui_settings ?? {});
    const savedFilter = (uiSettings.inbox_filter_by ?? {}) as { status?: string; type?: string; sort_by?: string };

    const [filters, setFilters] = useState<NotificationFilters>({
        page: 1,
        status: savedFilter.status ?? '',
        type: savedFilter.type ?? '',
        sortOrder: (savedFilter.sort_by as 'desc' | 'asc') || INBOX_SORT_BY.NEWEST,
    });
    const [records, setRecords] = useState<NotificationRecord[]>([]);
    const [meta, setMeta] = useState<NotificationsMeta>(EMPTY_META);
    const [isFetching, setFetching] = useState(true);
    const [isAllLoaded, setAllLoaded] = useState(false);
    const pageRef = useRef(1);

    const query = useMemo(
        () => ({ status: filters.status, type: filters.type, sortOrder: filters.sortOrder }),
        [filters.status, filters.type, filters.sortOrder],
    );

    const fetchPage = useCallback(
        async (page: number, append: boolean) => {
            setFetching(true);
            try {
                const { payload, meta: responseMeta } = await fetchNotifications({ accountId, page, ...query });
                setRecords(current => mergeNotifications(append ? current : [], payload));
                setMeta(responseMeta);
                pageRef.current = page;
                if (payload.length < RESULTS_PER_PAGE) setAllLoaded(true);
            } catch {
                // Bản gốc nuốt lỗi, chỉ tắt cờ đang tải.
            } finally {
                setFetching(false);
            }
        },
        [accountId, query],
    );

    // Đổi bộ lọc → clear rồi nạp lại từ trang 1 (fetchNotifications của InboxList.vue).
    useEffect(() => {
        setRecords([]);
        setAllLoaded(false);
        pageRef.current = 1;
        void fetchPage(1, false);
    }, [fetchPage]);

    const loadMore = useCallback(() => {
        if (isAllLoaded || isFetching) return;
        void fetchPage(pageRef.current + 1, true);
    }, [isAllLoaded, isFetching, fetchPage]);

    const persistFilters = useCallback(
        (next: NotificationFilters) => {
            setUiSettings(current =>
                persistUISettings(current, {
                    inbox_filter_by: { status: next.status, type: next.type, sort_by: next.sortOrder },
                }),
            );
        },
        [],
    );

    const applyFilter = useCallback(
        (option: DisplayOption) => {
            setFilters(current => {
                const next = { ...current, page: 1 };
                if (option.type === INBOX_FILTER_TYPE.STATUS) next.status = option.selected ? option.key : '';
                if (option.type === INBOX_FILTER_TYPE.TYPE) next.type = option.selected ? option.key : '';
                if (option.type === INBOX_FILTER_TYPE.SORT_ORDER) next.sortOrder = option.key as 'desc' | 'asc';
                persistFilters(next);
                return next;
            });
        },
        [persistFilters],
    );

    const patchRecord = useCallback((notificationId: number, patch: Partial<NotificationRecord>) => {
        setRecords(current =>
            current.map(record => (record.id === notificationId ? { ...record, ...patch } : record)),
        );
    }, []);

    const readNotification = useCallback(
        async (notification: NotificationRecord) => {
            await markNotificationsRead(accountId, notification.primary_actor_type, notification.primary_actor_id);
            patchRecord(notification.id, { read_at: new Date().toISOString() });
            setMeta(current => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1) }));
        },
        [accountId, patchRecord],
    );

    const openNotification = useCallback(
        async (notification: NotificationRecord) => {
            if (notification.read_at) return;
            await readNotification(notification).catch(() => undefined);
        },
        [readNotification],
    );

    const markAsRead = useCallback(
        async (notification: NotificationRecord) => {
            await readNotification(notification);
            useAlert(t('INBOX.ALERTS.MARK_AS_READ'));
        },
        [readNotification],
    );

    const markAsUnread = useCallback(
        async (notification: NotificationRecord) => {
            await markNotificationUnread(accountId, notification.id);
            patchRecord(notification.id, { read_at: null });
            setMeta(current => ({ ...current, unreadCount: current.unreadCount + 1 }));
            useAlert(t('INBOX.ALERTS.MARK_AS_UNREAD'));
        },
        [accountId, patchRecord],
    );

    const removeNotification = useCallback(
        async (notification: NotificationRecord) => {
            await deleteNotificationRequest(accountId, notification.id);
            setRecords(current => current.filter(record => record.id !== notification.id));
            setMeta(current => ({
                ...current,
                count: Math.max(0, current.count - 1),
                unreadCount: notification.read_at ? current.unreadCount : Math.max(0, current.unreadCount - 1),
            }));
            useAlert(t('INBOX.ALERTS.DELETE'));
        },
        [accountId],
    );

    const markAllRead = useCallback(async () => {
        await markNotificationsRead(accountId);
        const readAt = new Date().toISOString();
        setRecords(current => current.map(record => ({ ...record, read_at: record.read_at ?? readAt })));
        setMeta(current => ({ ...current, unreadCount: 0 }));
        useAlert(t('INBOX.ALERTS.MARK_ALL_READ'));
    }, [accountId]);

    const deleteAll = useCallback(async () => {
        await deleteNotificationsRequest(accountId, 'all');
        setRecords([]);
        setMeta(current => ({ ...current, count: 0, unreadCount: 0 }));
        useAlert(t('INBOX.ALERTS.DELETE_ALL'));
    }, [accountId]);

    const deleteAllRead = useCallback(async () => {
        await deleteNotificationsRequest(accountId, 'read');
        setRecords(current => current.filter(record => !record.read_at));
        useAlert(t('INBOX.ALERTS.DELETE_ALL_READ'));
    }, [accountId]);

    const snooze = useCallback(
        async (notificationId: number, snoozedUntil: number | null) => {
            const updated = await snoozeNotificationRequest(accountId, notificationId, snoozedUntil);
            patchRecord(notificationId, { snoozed_until: updated.snoozed_until });
            useAlert(t('INBOX.ALERTS.SNOOZE'));
        },
        [accountId, patchRecord],
    );

    const applyRealtimeCounts = useCallback((payload: NotificationRealtimePayload) => {
        setMeta(current => ({
            ...current,
            unreadCount: Math.max(0, Number(payload?.unread_count ?? current.unreadCount)),
            count: Math.max(0, Number(payload?.count ?? current.count)),
        }));
    }, []);

    const upsertFromRealtime = useCallback(
        (payload: NotificationRealtimePayload) => {
            const notification = payload?.notification as NotificationRecord | undefined;
            if (notification?.id) {
                setRecords(current => mergeNotifications(current, [notification]));
            }
            applyRealtimeCounts(payload);
        },
        [applyRealtimeCounts],
    );

    useRealtimeEvent<NotificationRealtimePayload>('notification.created', upsertFromRealtime);
    useRealtimeEvent<NotificationRealtimePayload>('notification.updated', upsertFromRealtime);
    useRealtimeEvent<NotificationRealtimePayload>('notification.deleted', payload => {
        const deletedId = payload?.notification?.id;
        if (deletedId) setRecords(current => current.filter(record => record.id !== deletedId));
        applyRealtimeCounts(payload);
    });

    const notifications = useMemo(() => sortNotifications(records, filters.sortOrder), [records, filters.sortOrder]);

    const value = useMemo<NotificationsContextValue>(
        () => ({
            accountId,
            notifications,
            meta,
            filters,
            isFetching,
            isAllLoaded,
            uiSettings,
            loadMore,
            applyFilter,
            openNotification,
            markAsRead,
            markAsUnread,
            removeNotification,
            markAllRead,
            deleteAll,
            deleteAllRead,
            snooze,
        }),
        [
            accountId,
            notifications,
            meta,
            filters,
            isFetching,
            isAllLoaded,
            uiSettings,
            loadMore,
            applyFilter,
            openNotification,
            markAsRead,
            markAsUnread,
            removeNotification,
            markAllRead,
            deleteAll,
            deleteAllRead,
            snooze,
        ],
    );

    return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
