import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { DashboardPageProps } from 'dashboard/types';
import { t } from '../../../i18n';
import { fetchNotificationSettings } from '../api';
import { notificationTargetUrl } from '../helpers';
import type { NotificationRealtimePayload, NotificationRecord } from '../types';
import { MESSAGE_TOAST_POSITION_CLASSES, messageToastPositionOf } from './messageToastPosition';

const TOAST_LIFETIME_MS = 8000;
const MAX_VISIBLE_TOASTS = 3;
const PUSH_FLAGS_TTL_MS = 60_000;
// Loại thông báo có ô tick ở Tuỳ chọn thông báo; loại khác (lời mời kết bạn) luôn báo.
const CONFIGURABLE_TYPES = new Set([
    'conversation_creation',
    'conversation_assignment',
    'conversation_mention',
    'assigned_conversation_new_message',
    'participating_conversation_new_message',
]);

interface MessageToast {
    notification: NotificationRecord;
    url: string | null;
}

// Hộp báo nằm ngoài vòng đời trang: Dashboard dựng lại mỗi lần chuyển trang Inertia.
let toasts: MessageToast[] = [];
const listeners = new Set<() => void>();
const setToasts = (next: MessageToast[]) => {
    toasts = next;
    listeners.forEach(listener => listener());
};
const dismissToast = (id: number) => setToasts(toasts.filter(toast => toast.notification.id !== id));
const isSameSubject = (toast: MessageToast, notification: NotificationRecord) =>
    toast.notification.id === notification.id ||
    (toast.notification.primary_actor_type === notification.primary_actor_type &&
        toast.notification.primary_actor_id === notification.primary_actor_id);
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

let pushFlags: { accountId: number; flags: Set<string>; fetchedAt: number } | null = null;

async function pushFlagsOf(accountId: number): Promise<Set<string>> {
    if (pushFlags?.accountId === accountId && Date.now() - pushFlags.fetchedAt < PUSH_FLAGS_TTL_MS) return pushFlags.flags;
    const settings = await fetchNotificationSettings(accountId);
    pushFlags = { accountId, flags: new Set(settings.selected_push_flags ?? []), fetchedAt: Date.now() };
    return pushFlags.flags;
}

const isFullNotification = (notification: NotificationRealtimePayload['notification']): notification is NotificationRecord =>
    'notification_type' in notification;

/** Tin mới khi đang mở Yona: hộp báo trong trang thay cho thông báo của hệ điều hành (tab ẩn vẫn dùng thông báo đẩy). */
export default function NewMessageToasts() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount?.id ?? 0;
    const position = messageToastPositionOf(auth.user?.ui_settings);
    const visibleToasts = useSyncExternalStore(subscribe, () => toasts);

    useRealtimeEvent<NotificationRealtimePayload>('notification.created', async payload => {
        const { notification } = payload;
        if (!accountId || payload.account_id !== accountId || !isFullNotification(notification)) return;
        if (document.visibilityState !== 'visible') return;

        const url = notificationTargetUrl(accountId, notification);
        if (url && window.location.pathname === url) return;

        if (CONFIGURABLE_TYPES.has(notification.notification_type)) {
            const flags = await pushFlagsOf(accountId).catch(() => null);
            if (flags && !flags.has(`push_${notification.notification_type}`)) return;
        }

        // Mỗi hội thoại một hộp báo: tin sau thay hộp báo trước, không xếp chồng.
        setToasts([{ notification, url }, ...toasts.filter(toast => !isSameSubject(toast, notification))].slice(0, MAX_VISIBLE_TOASTS));
    });

    if (!visibleToasts.length) return null;

    return createPortal(
        <section
            aria-label={t('INBOX.TOAST.REGION')}
            className={`fixed z-[60] flex gap-2 w-[22rem] max-md:inset-x-2 max-md:top-2 max-md:bottom-auto max-md:w-auto max-md:flex-col ${MESSAGE_TOAST_POSITION_CLASSES[position]}`}
        >
            {visibleToasts.map(toast => (
                <MessageToastCard key={toast.notification.id} toast={toast} />
            ))}
        </section>,
        document.body,
    );
}

function MessageToastCard({ toast }: { toast: MessageToast }) {
    const { notification, url } = toast;
    const sender = notification.primary_actor?.meta?.sender;
    const isFriendship = notification.primary_actor_type === 'Friendship';
    const senderName = sender?.name ?? notification.push_message_title;
    const timer = useRef<number | undefined>(undefined);
    const close = () => dismissToast(notification.id);
    const startTimer = () => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(close, TOAST_LIFETIME_MS);
    };

    useEffect(() => {
        startTimer();
        return () => window.clearTimeout(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const open = () => {
        close();
        if (url) router.visit(url);
    };

    return (
        <div
            role="status"
            className="overlay-surface shadow-overlay rounded-xl p-4 flex items-start gap-3 min-w-0"
            onMouseEnter={() => window.clearTimeout(timer.current)}
            onMouseLeave={startTimer}
        >
            <Avatar
                seed={avatarSeed(isFriendship ? 'user' : 'contact', sender?.id)}
                name={senderName}
                src={sender?.thumbnail}
                size={40}
                roundedFull
            />
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 h-6">
                    <span className="text-sm font-semibold truncate text-n-slate-12">{senderName}</span>
                    <span className="w-px h-3.5 shrink-0 bg-n-strong" aria-hidden="true" />
                    <span className="text-sm shrink-0 text-n-slate-11">{t('INBOX.TOAST.NOW')}</span>
                    <button
                        type="button"
                        aria-label={t('INBOX.TOAST.CLOSE')}
                        title={t('INBOX.TOAST.CLOSE')}
                        className="grid ms-auto -me-1.5 size-7 shrink-0 place-content-center rounded-md text-n-slate-11 hover:bg-n-surface-hover hover:text-n-slate-12"
                        onClick={close}
                    >
                        <span className="i-lucide-x size-4" aria-hidden="true" />
                    </button>
                </div>
                <p className="text-sm line-clamp-2 text-n-slate-11 break-words">
                    {notification.message_preview ?? notification.push_message_body}
                </p>
                <div className="flex items-center gap-2 mt-3">
                    <Button sm outline slate label={t('INBOX.TOAST.DISMISS')} onClick={close} />
                    {url ? (
                        <Button sm solid blue label={t(isFriendship ? 'INBOX.TOAST.OPEN_FRIENDS' : 'INBOX.TOAST.REPLY')} onClick={open} />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
