import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import ToggleSwitch from 'dashboard/components-next/switch/Switch';
import { fetchNotificationSettings, updateNotificationSettings } from 'dashboard/notifications/api';
import {
    PushPermissionDeniedError,
    PushServiceUnavailableError,
    disablePush,
    enablePush,
    isPushSupported,
    syncPushSubscription,
    vapidPublicKeyOf,
} from 'dashboard/helper/pushHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { ICONS } from 'dashboard/icons';

// Port từ routes/dashboard/settings/profile/NotificationPreferences.vue +
// NotificationCheckBox.vue + constants.js (NOTIFICATION_TYPES).
// SLA là EE nên ba dòng sla_* bị lọc y như bản gốc khi cờ SLA tắt.
// Lệch bản gốc có chủ đích: máy chủ không có khoá VAPID hoặc trình duyệt thiếu
// Push API thì ẩn hẳn cột "Thông báo đẩy" và công tắc, không hứa điều không gửi được.

const NOTIFICATION_TYPES = [
    { value: 'conversation_creation', labelKey: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPES.CONVERSATION_CREATED' },
    { value: 'conversation_assignment', labelKey: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPES.CONVERSATION_ASSIGNED' },
    { value: 'conversation_mention', labelKey: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPES.CONVERSATION_MENTION' },
    {
        value: 'assigned_conversation_new_message',
        labelKey: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPES.ASSIGNED_CONVERSATION_NEW_MESSAGE',
    },
    {
        value: 'participating_conversation_new_message',
        labelKey: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPES.PARTICIPATING_CONVERSATION_NEW_MESSAGE',
    },
];

const ALL_DELIVERY_TYPES = ['email', 'push'] as const;

type DeliveryType = (typeof ALL_DELIVERY_TYPES)[number];

function CheckBox({ value, isChecked, onUpdate }: { value: string; isChecked: boolean; onUpdate: () => void }) {
    return (
        <input
            id={value}
            type="checkbox"
            value={value}
            checked={isChecked}
            onChange={onUpdate}
            className="flex-shrink-0 mt-0.5 border-n-strong border bg-n-slate-2 checked:border-none checked:bg-n-brand shadow-sm appearance-none rounded-[4px] w-4 h-4 focus:ring-1 after:content-[''] after:text-white checked:after:content-['✓'] after:flex after:items-center after:justify-center after:text-center after:text-xs after:font-bold after:relative"
        />
    );
}

function TableHeaderCell({ spanClass, children }: { spanClass: string; children: ReactNode }) {
    return (
        <div
            className={`flex items-center px-0 py-2 text-xs font-medium text-right uppercase text-n-slate-11 rtl:text-left ${spanClass}`}
        >
            {children}
        </div>
    );
}

export default function NotificationPreferences() {
    const { auth, currentAccount, globalConfig } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const userId = auth.user?.id;
    const hasServerPushSubscription = auth.user?.has_push_subscription ?? false;
    const vapidPublicKey = vapidPublicKeyOf(globalConfig);
    const isPushAvailable = isPushSupported(vapidPublicKey);
    const deliveryTypes: readonly DeliveryType[] = isPushAvailable ? ALL_DELIVERY_TYPES : ['email'];

    const [selectedFlags, setSelectedFlags] = useState<Record<DeliveryType, string[]>>({ email: [], push: [] });
    const [hasEnabledPush, setHasEnabledPush] = useState(false);
    // Hướng dẫn dài (vd cách bật dịch vụ đẩy của Brave) không vừa một toast 2,5 giây:
    // giữ dưới công tắc tới lần bật kế tiếp.
    const [pushServiceHintKey, setPushServiceHintKey] = useState<string | null>(null);

    useEffect(() => {
        fetchNotificationSettings(accountId).then(
            settings =>
                setSelectedFlags({
                    email: settings.selected_email_flags ?? [],
                    push: settings.selected_push_flags ?? [],
                }),
            () => undefined,
        );
    }, [accountId]);

    // Công tắc phản ánh trình duyệt NÀY đã có đăng ký push hay chưa, đọc sau lượt
    // đồng bộ lúc mở dashboard (có thể vừa tự đăng ký lại).
    useEffect(() => {
        syncPushSubscription(userId, vapidPublicKey, hasServerPushSubscription).then(state =>
            setHasEnabledPush(state === 'subscribed'),
        );
    }, [userId, vapidPublicKey, hasServerPushSubscription]);

    const isFlagSelected = (deliveryType: DeliveryType, notificationType: string) =>
        selectedFlags[deliveryType].includes(`${deliveryType}_${notificationType}`);

    const toggleFlag = (deliveryType: DeliveryType, notificationType: string) => {
        const flag = `${deliveryType}_${notificationType}`;
        const current = selectedFlags[deliveryType];
        const next = current.includes(flag) ? current.filter(item => item !== flag) : [...current, flag];
        const merged = { ...selectedFlags, [deliveryType]: next };
        setSelectedFlags(merged);

        updateNotificationSettings(accountId, merged.email, merged.push).then(
            () => useAlert(t('PROFILE_SETTINGS.FORM.API.UPDATE_SUCCESS')),
            () => useAlert(t('PROFILE_SETTINGS.FORM.API.UPDATE_ERROR')),
        );
    };

    const togglePush = (enabled: boolean) => {
        if (!isPushSupported(vapidPublicKey) || userId === undefined) return;

        if (!enabled) {
            disablePush(userId)
                .catch(() => undefined)
                .finally(() => setHasEnabledPush(false));
            return;
        }

        setPushServiceHintKey(null);
        enablePush(vapidPublicKey, userId).then(
            () => setHasEnabledPush(true),
            error => {
                setHasEnabledPush(false);
                if (error instanceof PushServiceUnavailableError) {
                    setPushServiceHintKey(
                        error.isBrave
                            ? 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_SERVICE_BLOCKED_BRAVE'
                            : 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_SERVICE_UNAVAILABLE',
                    );
                    return;
                }
                if (!(error instanceof PushPermissionDeniedError)) {
                    // Lỗi chưa phân loại: để lại dấu vết cho người hỗ trợ đọc trong console.
                    console.error(error);
                }
                useAlert(
                    t(
                        error instanceof PushPermissionDeniedError
                            ? 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_DENIED'
                            : 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_ENABLE_FAILED',
                    ),
                );
            },
        );
    };

    return (
        <div id="profile-settings-notifications" className="flex flex-col gap-6">
            {/* Bố cục màn rộng */}
            <div className="hidden sm:block">
                <div className="grid content-center h-12 grid-cols-12 gap-4 py-0 rounded-t-xl">
                    <TableHeaderCell spanClass="col-span-7">
                        <span className="text-heading-3 normal-case text-n-slate-12">
                            {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.TYPE_TITLE')}
                        </span>
                    </TableHeaderCell>
                    <TableHeaderCell spanClass="col-span-2">
                        <span className="text-heading-3 normal-case text-n-slate-12">
                            {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.EMAIL')}
                        </span>
                    </TableHeaderCell>
                    {isPushAvailable && (
                        <TableHeaderCell spanClass="col-span-3">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-heading-3 normal-case text-n-slate-12 whitespace-nowrap">
                                    {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH')}
                                </span>
                            </div>
                        </TableHeaderCell>
                    )}
                </div>
                {NOTIFICATION_TYPES.map(notification => (
                    <div key={notification.value}>
                        <div className="grid items-center content-center h-12 grid-cols-12 gap-4 py-0 rounded-t-xl">
                            <div className="flex flex-row items-start gap-2 col-span-7 px-0 py-2 text-sm tracking-[0.5] rtl:text-right">
                                <span className="text-body-main text-n-slate-12">{t(notification.labelKey)}</span>
                            </div>
                            {deliveryTypes.map(deliveryType => (
                                <div
                                    key={deliveryType}
                                    className={`flex items-start gap-2 px-0 text-sm tracking-[0.5] text-left rtl:text-right ${
                                        deliveryType === 'push' ? 'col-span-3' : 'col-span-2'
                                    }`}
                                >
                                    <CheckBox
                                        value={`${deliveryType}_${notification.value}`}
                                        isChecked={isFlagSelected(deliveryType, notification.value)}
                                        onUpdate={() => toggleFlag(deliveryType, notification.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {/* Bố cục màn hẹp */}
            <div className="flex flex-col gap-6 sm:hidden">
                {deliveryTypes.map(deliveryType => (
                    <div key={deliveryType} className="flex flex-col gap-6">
                        <span className="text-heading-3 text-n-slate-12">
                            {t(
                                deliveryType === 'email'
                                    ? 'PROFILE_SETTINGS.FORM.EMAIL_NOTIFICATIONS_SECTION.TITLE'
                                    : 'PROFILE_SETTINGS.FORM.PUSH_NOTIFICATIONS_SECTION.TITLE',
                            )}
                        </span>
                        <div className="flex flex-col gap-4">
                            {NOTIFICATION_TYPES.map(notification => (
                                <div key={notification.value} className="flex flex-row items-start gap-2">
                                    <CheckBox
                                        value={`${deliveryType}_${notification.value}_mobile`}
                                        isChecked={isFlagSelected(deliveryType, notification.value)}
                                        onUpdate={() => toggleFlag(deliveryType, notification.value)}
                                    />
                                    <span className="text-body-main text-n-slate-12">{t(notification.labelKey)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {isPushAvailable && (
                <div className="flex items-center justify-between w-full gap-2 p-4 border border-solid border-n-weak rounded-xl">
                    <div className="flex flex-row items-center gap-2">
                        <span className={`${ICONS.bell} size-[1.125rem] flex-shrink-0 text-n-slate-12`} aria-hidden="true" />
                        <span className="text-body-main text-n-slate-12">
                            {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.BROWSER_PERMISSION')}
                        </span>
                    </div>
                    <ToggleSwitch value={hasEnabledPush} onChange={togglePush} />
                </div>
            )}
            {isPushAvailable && pushServiceHintKey && (
                <p role="alert" className="-mt-4 px-1 text-body-main text-n-ruby-11">
                    {t(pushServiceHintKey)}
                </p>
            )}
        </div>
    );
}
