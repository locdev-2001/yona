import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { BUS_EVENTS } from 'shared/helpers/emitter';
import Button from 'dashboard/components-next/button/Button';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/NetworkNotification.vue.
const RECONNECTED_BANNER_TIMEOUT = 2000;

// routeHelpers.isAConversationRoute(name, true) / isAInboxViewRoute(name, true) —
// không có route name phía Inertia nên nhận diện theo URL: mọi trang dưới
// /app/accounts/{id}/{conversations|inbox|team|label|mentions|unattended|participating|custom_view}
// và /inbox-view.
const CONVERSATION_ROUTE_PATTERN =
    /^\/app\/accounts\/\d+(?:\/(?:conversations|inbox|team|label|mentions|unattended|participating|custom_view)(?:\/|$)|\/?$)/;
const INBOX_VIEW_ROUTE_PATTERN = /^\/app\/accounts\/\d+\/inbox-view(?:\/|$)/;

export const isAConversationRoute = (pathname: string) => CONVERSATION_ROUTE_PATTERN.test(pathname);
export const isAInboxViewRoute = (pathname: string) => INBOX_VIEW_ROUTE_PATTERN.test(pathname);

export default function NetworkNotification() {
    const { url } = usePage();
    const [showNotification, setShowNotification] = useState(() => !navigator.onLine);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isReconnected, setIsReconnected] = useState(false);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDisconnectedRef = useRef(false);
    isDisconnectedRef.current = isDisconnected;

    const bannerText = isReconnecting
        ? t('NETWORK.NOTIFICATION.RECONNECTING')
        : isReconnected
          ? t('NETWORK.NOTIFICATION.RECONNECT_SUCCESS')
          : t('NETWORK.NOTIFICATION.OFFLINE');
    const iconName = isReconnected ? ICONS.wifi : ICONS.offline;
    const canRefresh = !isReconnecting && !isReconnected;

    const refreshPage = () => window.location.reload();

    const clearReconnectTimeout = () => {
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
    };

    const closeNotification = useCallback(() => {
        setShowNotification(false);
        setIsReconnected(false);
        clearReconnectTimeout();
    }, []);

    const handleReconnectionCompleted = useCallback(() => {
        setIsDisconnected(false);
        setIsReconnecting(false);
        setIsReconnected(true);
        setShowNotification(true);
        clearReconnectTimeout();
        reconnectTimeout.current = setTimeout(closeNotification, RECONNECTED_BANNER_TIMEOUT);
    }, [closeNotification]);

    const isInAnyOfTheRoutes = (pathname: string) => isAConversationRoute(pathname) || isAInboxViewRoute(pathname);

    useRealtimeEvent(BUS_EVENTS.WEBSOCKET_DISCONNECT, () => {
        setIsDisconnected(true);
        setShowNotification(true);
    });
    useRealtimeEvent(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, handleReconnectionCompleted);
    useRealtimeEvent(BUS_EVENTS.WEBSOCKET_RECONNECT, () => {
        if (isInAnyOfTheRoutes(new URL(url, window.location.origin).pathname)) {
            setIsReconnecting(true);
            setIsReconnected(false);
            setShowNotification(true);
        } else {
            handleReconnectionCompleted();
        }
    });

    useEffect(() => {
        // Websocket còn sống: offline → hiện, online → đóng.
        // Websocket đã đứt: online chưa đóng banner, chờ WEBSOCKET_RECONNECT_COMPLETED.
        const updateOnlineStatus = (event: Event) => {
            if (event.type === 'offline') {
                setShowNotification(true);
            } else if (event.type === 'online' && !isDisconnectedRef.current) {
                handleReconnectionCompleted();
            }
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
            clearReconnectTimeout();
        };
    }, [handleReconnectionCompleted]);

    return (
        <div
            className={`fixed z-50 top-2 left-2 group transition-opacity duration-300 ${showNotification ? '' : 'opacity-0 pointer-events-none'}`}
            hidden={!showNotification}
        >
            <div className="relative flex items-center justify-between w-full px-2 py-1 bg-n-amber-4 rounded-lg shadow-lg">
                <span className={`${iconName} size-[1.125rem] text-n-amber-12`} aria-hidden="true" />
                <span className="px-2 text-xs font-medium tracking-wide text-n-amber-12">{bannerText}</span>
                {canRefresh && (
                    <Button
                        ghost
                        sm
                        amber
                        icon="i-lucide-refresh-ccw"
                        title={t('NETWORK.BUTTON.REFRESH')}
                        className="!text-n-amber-12"
                        onClick={refreshPage}
                    />
                )}
                <Button
                    ghost
                    sm
                    amber
                    icon="i-lucide-x"
                    className="!text-n-amber-12"
                    onClick={closeNotification}
                />
            </div>
        </div>
    );
}
