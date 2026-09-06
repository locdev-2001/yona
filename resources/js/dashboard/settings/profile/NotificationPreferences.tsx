import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import ToggleSwitch from 'dashboard/components-next/switch/Switch';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { fetchNotificationSettings, updateNotificationSettings } from 'dashboard/notifications/api';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/settings/profile/NotificationPreferences.vue +
// NotificationCheckBox.vue + constants.js (NOTIFICATION_TYPES).
// SLA là EE nên ba dòng sla_* bị lọc y như bản gốc khi cờ SLA tắt.
// Web push (service worker + notification_subscriptions) chưa port: công tắc
// quyền trình duyệt chỉ đọc trạng thái Notification.permission.

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

const DELIVERY_TYPES = ['email', 'push'] as const;

type DeliveryType = (typeof DELIVERY_TYPES)[number];

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
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [selectedFlags, setSelectedFlags] = useState<Record<DeliveryType, string[]>>({ email: [], push: [] });
    const [hasBrowserPermission, setHasBrowserPermission] = useState(false);

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

    useEffect(() => {
        setHasBrowserPermission('Notification' in window && Notification.permission === 'granted');
    }, []);

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

    const requestBrowserPermission = (enabled: boolean) => {
        if (!enabled || !('Notification' in window)) {
            setHasBrowserPermission(false);
            return;
        }

        void Notification.requestPermission().then(permission => setHasBrowserPermission(permission === 'granted'));
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
                    <TableHeaderCell spanClass="col-span-3">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-heading-3 normal-case text-n-slate-12 whitespace-nowrap">
                                {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH')}
                            </span>
                        </div>
                    </TableHeaderCell>
                </div>
                {NOTIFICATION_TYPES.map(notification => (
                    <div key={notification.value}>
                        <div className="grid items-center content-center h-12 grid-cols-12 gap-4 py-0 rounded-t-xl">
                            <div className="flex flex-row items-start gap-2 col-span-7 px-0 py-2 text-sm tracking-[0.5] rtl:text-right">
                                <span className="text-body-main text-n-slate-12">{t(notification.labelKey)}</span>
                            </div>
                            {DELIVERY_TYPES.map(deliveryType => (
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
                {DELIVERY_TYPES.map(deliveryType => (
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

            <div className="flex items-center justify-between w-full gap-2 p-4 border border-solid border-n-weak rounded-xl">
                <div className="flex flex-row items-center gap-2">
                    <FluentIcon icon="alert" className="flex-shrink-0 text-n-slate-12" size={18} />
                    <span className="text-body-main text-n-slate-12">
                        {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.BROWSER_PERMISSION')}
                    </span>
                </div>
                <ToggleSwitch value={hasBrowserPermission} onChange={requestBrowserPermission} />
            </div>
        </div>
    );
}
