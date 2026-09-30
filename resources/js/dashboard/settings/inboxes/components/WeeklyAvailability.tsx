import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor';
import BusinessDay, { BUSINESS_DAY_GRID } from './BusinessDay';
import {
    defaultTimeSlot,
    mondayFirst,
    timeSlotParse,
    timeSlotTransform,
    timeZoneSelection,
} from '../helpers/businessHour';
import type { TimeSlot, TimeZoneOption } from '../helpers/businessHour';
import { localizeTimeZoneOptions } from '../helpers/timezone-label';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/components/WeeklyAvailability.vue.

// Khóa của lang/{locale}/days_of_week.php theo day_of_week của API (0 = Chủ nhật).
const DAY_NAME_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

interface WeeklyAvailabilityProps {
    inbox: Inbox;
    timeZoneOptions: TimeZoneOption[];
    uiSettings: UISettings;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function WeeklyAvailability({ inbox, timeZoneOptions, uiSettings, onInboxUpdated }: WeeklyAvailabilityProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [isBusinessHoursEnabled, setBusinessHoursEnabled] = useState(false);
    const [unavailableMessage, setUnavailableMessage] = useState('');
    const [timeZone, setTimeZone] = useState(inbox.timezone);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(defaultTimeSlot);
    const [isUpdating, setUpdating] = useState(false);

    // setDefaults() + watch(inbox) của bản gốc.
    useEffect(() => {
        const parsed = timeSlotParse(inbox.working_hours ?? []);

        setBusinessHoursEnabled(inbox.working_hours_enabled);
        setUnavailableMessage(inbox.out_of_office_message ?? '');
        setTimeSlots(parsed.length ? parsed : defaultTimeSlot);
        setTimeZone(inbox.timezone);
    }, [inbox]);

    const timeZoneChoice = useMemo(
        () => timeZoneSelection(timeZone, localizeTimeZoneOptions(timeZoneOptions)),
        [timeZone, timeZoneOptions],
    );

    const hasError = isBusinessHoursEnabled && timeSlots.some(slot => slot.from && !slot.valid);

    const updateInbox = async (event: React.FormEvent) => {
        event.preventDefault();
        setUpdating(true);

        try {
            const updated = await patchJson<Inbox>(
                `/api/v1/accounts/${accountId}/inboxes/${inbox.id}`,
                {
                    working_hours_enabled: isBusinessHoursEnabled,
                    out_of_office_message: unavailableMessage,
                    working_hours: timeSlotTransform(timeSlots),
                    ...(timeZone ? { timezone: timeZone } : {}),
                    channel: {},
                },
            );
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="mx-6">
            <SettingsToggleSection
                value={isBusinessHoursEnabled}
                onChange={setBusinessHoursEnabled}
                header={t('INBOX_MGMT.BUSINESS_HOURS.TOGGLE_AVAILABILITY')}
                description={t('INBOX_MGMT.BUSINESS_HOURS.TOGGLE_HELP')}
                editor={
                    isBusinessHoursEnabled ? (
                        <div className="mb-4 editor-static-menubar">
                            <span className="block mb-2 text-heading-3 text-n-slate-12">
                                {t('INBOX_MGMT.BUSINESS_HOURS.UNAVAILABLE_MESSAGE_LABEL')}
                            </span>
                            <WootMessageEditor
                                editorId={`out-of-office-message-${inbox.id}`}
                                value={unavailableMessage}
                                placeholder={t('INBOX_MGMT.BUSINESS_HOURS.UNAVAILABLE_MESSAGE_PLACEHOLDER')}
                                uiSettings={uiSettings}
                                onChange={setUnavailableMessage}
                            />
                        </div>
                    ) : undefined
                }
            />

            {isBusinessHoursEnabled ? (
                <>
                    <div className="flex items-center my-8 py-1">
                        <div className="flex-1 h-px bg-n-weak" />
                        <span className="text-body-main text-n-slate-11 px-2">
                            {t('INBOX_MGMT.BUSINESS_HOURS.WEEKLY_TITLE')}
                        </span>
                        <div className="flex-1 h-px bg-n-weak" />
                    </div>

                    <SettingsFieldSection label={t('INBOX_MGMT.BUSINESS_HOURS.TIMEZONE_LABEL')}>
                        <ComboBox
                            value={timeZoneChoice.selected}
                            options={timeZoneChoice.options}
                            placeholder={t('INBOX_MGMT.BUSINESS_HOURS.DAY.CHOOSE')}
                            className="[&>div>button]:!bg-n-alpha-black2"
                            onChange={setTimeZone}
                        />
                    </SettingsFieldSection>
                </>
            ) : null}

            <form className="flex flex-col" onSubmit={updateInbox}>
                {isBusinessHoursEnabled ? (
                    <div className="mt-2 outline outline-1 -outline-offset-1 outline-n-weak rounded-xl">
                        <div
                            className={`hidden md:grid ${BUSINESS_DAY_GRID} gap-x-3 px-4 py-3 border-b border-n-weak text-heading-3 text-n-slate-12`}
                            aria-hidden="true"
                        >
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.DAY')}</span>
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.AVAILABILITY')}</span>
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.HOURS')}</span>
                        </div>
                        <ul className="list-none m-0 p-0 divide-y divide-n-weak">
                            {mondayFirst(timeSlots).map(timeSlot => (
                                <BusinessDay
                                    key={timeSlot.day}
                                    dayName={t(`DAYS_OF_WEEK.${DAY_NAME_KEYS[timeSlot.day]}`)}
                                    timeSlot={timeSlot}
                                    onUpdate={slot =>
                                        setTimeSlots(slots =>
                                            slots.map(item => (item.day === timeSlot.day ? slot : item)),
                                        )
                                    }
                                />
                            ))}
                        </ul>
                    </div>
                ) : null}
                <div className="w-full flex justify-end items-center py-4 mt-2">
                    <Button
                        type="submit"
                        label={t('INBOX_MGMT.BUSINESS_HOURS.UPDATE')}
                        isLoading={isUpdating}
                        disabled={hasError}
                    />
                </div>
            </form>
        </div>
    );
}
