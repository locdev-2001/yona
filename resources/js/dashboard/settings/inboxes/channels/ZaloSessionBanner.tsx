import { useEffect, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Banner from 'dashboard/conversation/conversationbox/Banner';
import ZaloQrPanel from './ZaloQrPanel';

// Biểu ngữ trạng thái phiên Zalo trên trang cấu hình inbox. Mất phiên là chuyện
// thường của Zalo cá nhân (không có API chính thức) nên người dùng phải quét lại
// mã QR ngay tại đây, không phải tạo inbox mới.
type BridgeStatus = 'ok' | 'degraded' | 'half_open' | 'open';

interface ZaloHealthResponse {
    bridge?: {
        status?: BridgeStatus;
        error_count?: number;
        retry_at?: string | null;
    };
}

interface DisconnectResponse {
    ok?: boolean;
    state?: string;
    bridge_reachable?: boolean;
}

interface ZaloSessionBannerProps {
    accountId: number;
    inboxId: number;
    state?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    lastConnectedAt?: string | null;
}

const BRIDGE_LABEL_KEY: Record<BridgeStatus, string> = {
    ok: 'INBOX_MGMT.ZALO_SESSION.BRIDGE.OK',
    degraded: 'INBOX_MGMT.ZALO_SESSION.BRIDGE.DEGRADED',
    half_open: 'INBOX_MGMT.ZALO_SESSION.BRIDGE.HALF_OPEN',
    open: 'INBOX_MGMT.ZALO_SESSION.BRIDGE.OPEN',
};

function toUnixSeconds(iso?: string | null): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export default function ZaloSessionBanner({
    accountId,
    inboxId,
    state,
    displayName,
    avatarUrl,
    phone,
    lastConnectedAt,
}: ZaloSessionBannerProps) {
    const [isScanning, setScanning] = useState(false);
    const [isDisconnecting, setDisconnecting] = useState(false);
    const [bridge, setBridge] = useState<ZaloHealthResponse['bridge']>(undefined);
    const disconnectDialogRef = useRef<DialogHandle>(null);

    const basePath = `/api/v1/accounts/${accountId}/inboxes/${inboxId}/zalo`;
    const isConnected = state === 'connected';

    // Trạng thái cầu nối chỉ để tham khảo trên thẻ tài khoản — hỏi một lần khi vào
    // trang, không poll liên tục (khác panel QR vốn cần cập nhật theo thời gian thực).
    useEffect(() => {
        if (!isConnected) return;
        getJson<ZaloHealthResponse>(`${basePath}/health`)
            .then(health => setBridge(health.bridge))
            .catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    const requestDisconnect = () => postJson<DisconnectResponse>(`${basePath}/disconnect`, {});

    const confirmDisconnect = async () => {
        setDisconnecting(true);
        try {
            const result = await requestDisconnect();
            disconnectDialogRef.current?.close();
            useAlert(t('INBOX_MGMT.ZALO_SESSION.DISCONNECT_DONE'));
            if (result.bridge_reachable === false) {
                useAlert(t('INBOX_MGMT.ZALO_SESSION.DISCONNECT_BRIDGE_DOWN'));
            }
            window.location.reload();
        } catch (error) {
            setDisconnecting(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ZALO_SESSION.DISCONNECT_BRIDGE_DOWN'));
        }
    };

    const switchAccount = async () => {
        if (isConnected) {
            try {
                await requestDisconnect();
            } catch {
                // Vẫn cho mở QR dù ngắt phiên cũ thất bại — promote() ở bước quét sẽ tự
                // phát hiện xung đột tài khoản nếu có.
            }
        }
        setScanning(true);
    };

    if (isConnected) {
        const connectedSinceSeconds = toUnixSeconds(lastConnectedAt);
        const bridgeLabel = bridge?.status
            ? t(BRIDGE_LABEL_KEY[bridge.status], {
                  count: bridge.error_count ?? 0,
                  time: bridge.retry_at ? dynamicTime(toUnixSeconds(bridge.retry_at) ?? 0) : '',
              })
            : null;

        return (
            <div className="panel-surface mb-4 flex flex-col gap-3 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                    <Avatar seed={avatarSeed('inbox', inboxId)} src={avatarUrl ?? undefined} name={displayName ?? ''} size={40} />
                    <div className="flex-1 min-w-0">
                        <p className="text-n-slate-12 text-sm font-medium truncate">
                            {displayName || t('INBOX_MGMT.ZALO_SESSION.ACCOUNT_UNKNOWN')}
                        </p>
                        <p className="text-n-slate-11 text-xs truncate">
                            {t('INBOX_MGMT.ZALO_SESSION.STATE.CONNECTED')}
                            {phone ? ` · ${phone}` : ''}
                            {connectedSinceSeconds !== null
                                ? ` · ${t('INBOX_MGMT.ZALO_SESSION.CONNECTED_SINCE', {
                                      time: dynamicTime(connectedSinceSeconds),
                                  })}`
                                : ''}
                        </p>
                        {bridgeLabel ? (
                            <p className="text-n-slate-10 text-xs truncate">
                                {t('INBOX_MGMT.ZALO_SESSION.BRIDGE.LABEL')}: {bridgeLabel}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <Button
                            type="button"
                            faded
                            ruby
                            xs
                            label={t('INBOX_MGMT.ZALO_SESSION.DISCONNECT')}
                            onClick={() => disconnectDialogRef.current?.open()}
                        />
                        <Button
                            type="button"
                            faded
                            slate
                            xs
                            label={t('INBOX_MGMT.ZALO_SESSION.SWITCH_ACCOUNT')}
                            onClick={() => void switchAccount()}
                        />
                    </div>
                </div>

                {isScanning ? (
                    <ZaloQrPanel
                        accountId={accountId}
                        inboxId={inboxId}
                        boundAccountName={displayName}
                        onConnected={() => window.location.reload()}
                    />
                ) : null}

                <Dialog
                    ref={disconnectDialogRef}
                    type="alert"
                    title={t('INBOX_MGMT.ZALO_SESSION.DISCONNECT')}
                    description={t('INBOX_MGMT.ZALO_SESSION.DISCONNECT_CONFIRM')}
                    confirmButtonLabel={t('INBOX_MGMT.ZALO_SESSION.DISCONNECT')}
                    isLoading={isDisconnecting}
                    onConfirm={() => void confirmDisconnect()}
                />
            </div>
        );
    }

    if (state === 'disconnected') {
        return (
            <div className="mb-4 flex flex-col gap-3">
                <Banner
                    colorScheme="warning"
                    bannerMessage={t('INBOX_MGMT.ZALO_SESSION.DISCONNECTED')}
                    hasActionButton={!isScanning}
                    actionButtonLabel={t('INBOX_MGMT.ZALO_SESSION.CONNECT')}
                    onPrimaryAction={() => setScanning(true)}
                />
                {isScanning ? (
                    <ZaloQrPanel
                        accountId={accountId}
                        inboxId={inboxId}
                        boundAccountName={displayName}
                        onConnected={() => window.location.reload()}
                    />
                ) : null}
            </div>
        );
    }

    const isSessionLost = state === 'session_lost';

    return (
        <div className="mb-4 flex flex-col gap-3">
            <Banner
                colorScheme={isSessionLost ? 'alert' : 'warning'}
                bannerMessage={t(
                    isSessionLost ? 'INBOX_MGMT.ZALO_SESSION.LOST' : 'INBOX_MGMT.ZALO_SESSION.WAITING',
                )}
                hasActionButton={!isScanning}
                actionButtonLabel={t(
                    isSessionLost ? 'INBOX_MGMT.ZALO_SESSION.RECONNECT' : 'INBOX_MGMT.ZALO_SESSION.CONNECT',
                )}
                onPrimaryAction={() => setScanning(true)}
            />
            {isScanning ? (
                <ZaloQrPanel
                    accountId={accountId}
                    inboxId={inboxId}
                    boundAccountName={displayName}
                    onConnected={() => window.location.reload()}
                />
            ) : null}
        </div>
    );
}
