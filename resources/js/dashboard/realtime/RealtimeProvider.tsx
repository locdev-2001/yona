import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

import NetworkNotification from 'dashboard/components/NetworkNotification';
import NewMessageAlert from 'dashboard/alertSound/NewMessageAlert';
import type { DashboardPageProps } from 'dashboard/types';
import ActionCableConnector from './ActionCableConnector';
import ReconnectService from './ReconnectService';
import { realtimeStore } from './store';
import type { RealtimeIdentity } from './types';
import NewMessageToasts from 'dashboard/notifications/toast/NewMessageToasts';

// Tương đương App.vue: vueActionCable.init(store, pubsubToken) + new ReconnectService.
// Kết nối là singleton module-level (window.reconnectService gốc) vì Dashboard
// re-mount mỗi lần Inertia visit; React chỉ attach/seed.
let connector: ActionCableConnector | null = null;
let connectedIdentity: RealtimeIdentity | null = null;
let reconnectService: ReconnectService | null = null;

const isSameIdentity = (a: RealtimeIdentity | null, b: RealtimeIdentity) =>
    !!a && a.accountId === b.accountId && a.userId === b.userId && a.pubsubToken === b.pubsubToken;

export function ensureConnected(identity: RealtimeIdentity): ActionCableConnector {
    if (connector && isSameIdentity(connectedIdentity, identity)) return connector;

    disconnectRealtime();
    connector = new ActionCableConnector(identity);
    connectedIdentity = identity;
    reconnectService ??= new ReconnectService();
    return connector;
}

export function disconnectRealtime(): void {
    connector?.disconnect();
    connector = null;
    connectedIdentity = null;
    realtimeStore.reset();
}

export default function RealtimeProvider() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const userId = auth.user?.id;
    const pubsubToken = auth.user?.pubsub_token;
    const accountId = currentAccount?.id;

    useEffect(() => {
        if (!userId || !pubsubToken || !accountId) return;
        ensureConnected({ accountId, userId, pubsubToken });
    }, [accountId, userId, pubsubToken]);

    return (
        <>
            <NetworkNotification />
            <NewMessageAlert />
            <NewMessageToasts />
        </>
    );
}
