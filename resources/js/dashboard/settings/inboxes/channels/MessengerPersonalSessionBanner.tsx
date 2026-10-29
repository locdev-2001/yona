import { useRef, useState } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Banner from 'dashboard/conversation/conversationbox/Banner';
import MessengerPersonalLoginPanel from './MessengerPersonalLoginPanel';
import type { Inbox } from '../types';

// Biểu ngữ phiên Messenger cá nhân trên trang cấu hình hộp thư: trạng thái, lý do mất
// phiên, đăng nhập lại ngay tại chỗ, ngắt kết nối, liên kết mã nguồn sidecar (khi có).
interface MessengerPersonalSessionBannerProps {
    accountId: number;
    inbox: Inbox;
}

interface DisconnectResponse {
    bridge_reachable?: boolean;
}

function toUnixSeconds(iso?: string | null): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export default function MessengerPersonalSessionBanner({ accountId, inbox }: MessengerPersonalSessionBannerProps) {
    const [isLoggingIn, setLoggingIn] = useState(false);
    const [isDisconnecting, setDisconnecting] = useState(false);
    const disconnectDialogRef = useRef<DialogHandle>(null);

    const state = inbox.messenger_personal_state;
    const displayName = inbox.messenger_personal_display_name;
    const reason = inbox.messenger_personal_session_lost_reason;
    const sourceUrl = inbox.messenger_personal_source_url;
    const isConnected = state === 'connected';
    const basePath = `/api/v1/accounts/${accountId}/inboxes/${inbox.id}/messenger_personal`;

    const confirmDisconnect = async () => {
        setDisconnecting(true);
        try {
            const result = await postJson<DisconnectResponse>(`${basePath}/disconnect`, {});
            disconnectDialogRef.current?.close();
            useAlert(t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT_DONE'));
            if (result.bridge_reachable === false) {
                useAlert(t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT_BRIDGE_DOWN'));
            }
            window.location.reload();
        } catch (error) {
            setDisconnecting(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT_BRIDGE_DOWN'));
        }
    };

    const loginPanel = isLoggingIn ? (
        <MessengerPersonalLoginPanel
            accountId={accountId}
            inboxId={inbox.id}
            onConnected={() => window.location.reload()}
            onCancel={() => setLoggingIn(false)}
        />
    ) : null;

    const sourceLink = sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-n-slate-11 text-xs underline">
            {t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.SOURCE_LINK')}
        </a>
    ) : null;

    const disconnectDialog = (
        <Dialog
            ref={disconnectDialogRef}
            type="alert"
            title={t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT')}
            description={t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT_CONFIRM')}
            confirmButtonLabel={t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT')}
            isLoading={isDisconnecting}
            onConfirm={() => void confirmDisconnect()}
        />
    );

    if (isConnected) {
        const connectedSince = toUnixSeconds(inbox.messenger_personal_last_connected_at);

        return (
            <div className="panel-surface mb-4 flex flex-col gap-3 p-4 rounded-xl" data-testid="messenger-personal-session">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar seed={avatarSeed('inbox', inbox.id)} src={inbox.avatar_url || undefined} name={displayName ?? ''} size={40} />
                        <div className="flex-1 min-w-0">
                            <p className="text-n-slate-12 text-sm font-medium truncate">
                                {displayName || t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.ACCOUNT_UNKNOWN')}
                            </p>
                            <p className="text-n-slate-11 text-xs truncate">
                                {t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.CONNECTED')}
                                {connectedSince !== null
                                    ? ` · ${t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.CONNECTED_SINCE', { time: dynamicTime(connectedSince) })}`
                                    : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <Button
                            type="button"
                            faded
                            ruby
                            xs
                            label={t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT')}
                            onClick={() => disconnectDialogRef.current?.open()}
                        />
                    </div>
                </div>
                {sourceLink}
                {disconnectDialog}
            </div>
        );
    }

    const isSessionLost = state === 'session_lost';
    const message = isSessionLost
        ? t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.LOST')
        : t(state === 'disconnected' ? 'INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECTED' : 'INBOX_MGMT.MESSENGER_PERSONAL.SESSION.PENDING');

    return (
        <div className="mb-4 flex flex-col gap-3" data-testid="messenger-personal-session">
            <Banner
                colorScheme={isSessionLost ? 'alert' : 'warning'}
                bannerMessage={message}
                hasActionButton={!isLoggingIn}
                actionButtonLabel={t(
                    isSessionLost ? 'INBOX_MGMT.MESSENGER_PERSONAL.SESSION.RELOGIN' : 'INBOX_MGMT.MESSENGER_PERSONAL.SESSION.LOGIN',
                )}
                onPrimaryAction={() => setLoggingIn(true)}
            />
            {isSessionLost && reason ? (
                <p className="text-n-slate-11 text-xs">{t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.REASON', { reason })}</p>
            ) : null}
            {loginPanel}
            {isSessionLost && !isLoggingIn ? (
                <div>
                    <Button
                        type="button"
                        faded
                        ruby
                        xs
                        label={t('INBOX_MGMT.MESSENGER_PERSONAL.SESSION.DISCONNECT')}
                        onClick={() => disconnectDialogRef.current?.open()}
                    />
                </div>
            ) : null}
            {sourceLink}
            {disconnectDialog}
        </div>
    );
}
