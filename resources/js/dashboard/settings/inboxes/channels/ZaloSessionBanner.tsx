import { useState } from 'react';

import { t } from '../../../../i18n';
import Banner from 'dashboard/conversation/conversationbox/Banner';
import ZaloQrPanel from './ZaloQrPanel';

// Biểu ngữ trạng thái phiên Zalo trên trang cấu hình inbox. Mất phiên là chuyện
// thường của Zalo cá nhân (không có API chính thức) nên người dùng phải quét lại
// mã QR ngay tại đây, không phải tạo inbox mới.
interface ZaloSessionBannerProps {
    accountId: number;
    inboxId: number;
    state?: string | null;
    displayName?: string | null;
}

export default function ZaloSessionBanner({
    accountId,
    inboxId,
    state,
    displayName,
}: ZaloSessionBannerProps) {
    const [isScanning, setScanning] = useState(false);

    if (state === 'connected') {
        return (
            <p className="text-n-slate-11 text-sm mb-4">
                {t('INBOX_MGMT.ZALO_SESSION.CONNECTED_AS', { name: displayName ?? '' })}
            </p>
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
                    onConnected={() => window.location.reload()}
                />
            ) : null}
        </div>
    );
}
