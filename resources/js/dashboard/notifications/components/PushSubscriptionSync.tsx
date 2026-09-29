import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import NextButton from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    PushPermissionDeniedError,
    PushServiceUnavailableError,
    disablePush,
    enablePush,
    isPushSupported,
    syncPushSubscription,
    vapidPublicKeyOf,
} from 'dashboard/helper/pushHelper';
import type { PushSyncState } from 'dashboard/helper/pushHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';

function enableFailureMessageKey(error: unknown): string {
    if (error instanceof PushPermissionDeniedError) return 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_DENIED';
    if (error instanceof PushServiceUnavailableError) return 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_SERVICE_UNAVAILABLE';

    return 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_ENABLE_FAILED';
}

// Mở dashboard là đồng bộ đăng ký đẩy của trình duyệt này; người đã bật mà quyền
// thông báo bị thu hồi thì nhắc bằng một băng trên cùng thay vì im lặng không đẩy nữa.
export default function PushSubscriptionSync() {
    const { auth, globalConfig } = usePage<DashboardPageProps>().props;
    const userId = auth.user?.id;
    const hasServerPushSubscription = auth.user?.has_push_subscription ?? false;
    const vapidPublicKey = vapidPublicKeyOf(globalConfig);
    const [syncState, setSyncState] = useState<PushSyncState>('off');
    const [isEnabling, setIsEnabling] = useState(false);

    useEffect(() => {
        syncPushSubscription(userId, vapidPublicKey, hasServerPushSubscription).then(setSyncState);
    }, [userId, vapidPublicKey, hasServerPushSubscription]);

    if (syncState !== 'permission_revoked' || userId === undefined || !isPushSupported(vapidPublicKey)) {
        return null;
    }

    const enableAgain = () => {
        setIsEnabling(true);
        enablePush(vapidPublicKey, userId)
            .then(
                () => setSyncState('subscribed'),
                error => useAlert(t(enableFailureMessageKey(error))),
            )
            .finally(() => setIsEnabling(false));
    };

    const turnOff = () => {
        disablePush(userId)
            .catch(() => undefined)
            .finally(() => setSyncState('off'));
    };

    return (
        <div
            role="status"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-sm bg-n-amber-3 text-n-amber-12"
        >
            <span>{t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_BANNER')}</span>
            <div className="flex items-center gap-2">
                <NextButton
                    xs
                    amber
                    solid
                    isLoading={isEnabling}
                    label={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_ENABLE')}
                    onClick={enableAgain}
                />
                <NextButton
                    xs
                    amber
                    ghost
                    label={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_TURN_OFF')}
                    onClick={turnOff}
                />
            </div>
        </div>
    );
}
