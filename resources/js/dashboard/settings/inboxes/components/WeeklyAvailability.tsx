import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
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
import SettingsSaveBar from '../settingsDraft/SettingsSaveBar';
import { useSettingsDraft } from '../settingsDraft/useSettingsDraft';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/components/WeeklyAvailability.vue.

// Khóa của lang/{locale}/days_of_week.php theo day_of_week của API (0 = Chủ nhật).
const DAY_NAME_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

interface BusinessHoursDraft {
    isBusinessHoursEnabled: boolean;
    unavailableMessage: string;
    timeZone: string;
    timeSlots: TimeSlot[];
}

function businessHoursDraftOf(inbox: Inbox): BusinessHoursDraft {
    const parsed = timeSlotParse(inbox.working_hours ?? []);

    return {
        isBusinessHoursEnabled: inbox.working_hours_enabled,
        unavailableMessage: inbox.out_of_office_message ?? '',
        timeZone: inbox.timezone,
        timeSlots: parsed.length ? parsed : defaultTimeSlot,
    };
}

interface WeeklyAvailabilityProps {
    inbox: Inbox;
    timeZoneOptions: TimeZoneOption[];
    uiSettings: UISettings;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function WeeklyAvailability({ inbox, timeZoneOptions, uiSettings, onInboxUpdated }: WeeklyAvailabilityProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { draft, patchDraft, isDirty, isSaving, reset, save } = useSettingsDraft(businessHoursDraftOf(inbox));
    const { isBusinessHoursEnabled, unavailableMessage, timeZone, timeSlots } = draft;

    const timeZoneChoice = useMemo(
        () => timeZoneSelection(timeZone, localizeTimeZoneOptions(timeZoneOptions)),
        [timeZone, timeZoneOptions],
    );

    const hasError = isBusinessHoursEnabled && timeSlots.some(slot => slot.from && !slot.valid);

    const updateInbox = () =>
        save(async () => {
            try {
                const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                    working_hours_enabled: isBusinessHoursEnabled,
                    out_of_office_message: unavailableMessage,
                    working_hours: timeSlotTransform(timeSlots),
                    ...(timeZone ? { timezone: timeZone } : {}),
                    channel: {},
                });
                onInboxUpdated(updated);
                useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
                return true;
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
                return false;
            }
        });

    return (
        <div className="mx-6">
            <SettingsToggleSection
                value={isBusinessHoursEnabled}
                onChange={enabled => patchDraft({ isBusinessHoursEnabled: enabled })}
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
                                onChange={message => patchDraft({ unavailableMessage: message })}
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
                            onChange={zone => patchDraft({ timeZone: zone })}
                        />
                    </SettingsFieldSection>
                </>
            ) : null}

            <div className="flex flex-col">
                {isBusinessHoursEnabled ? (
                    <div className="panel-surface mt-2 rounded-xl">
                        <div
                            className={`hidden md:grid ${BUSINESS_DAY_GRID} gap-x-3 px-4 py-3 text-heading-3 text-n-slate-12`}
                            aria-hidden="true"
                        >
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.DAY')}</span>
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.AVAILABILITY')}</span>
                            <span>{t('INBOX_MGMT.BUSINESS_HOURS.DAY.HOURS')}</span>
                        </div>
                        <ul className="list-none m-0 p-0">
                            {mondayFirst(timeSlots).map(timeSlot => (
                                <BusinessDay
                                    key={timeSlot.day}
                                    dayName={t(`DAYS_OF_WEEK.${DAY_NAME_KEYS[timeSlot.day]}`)}
                                    timeSlot={timeSlot}
                                    onUpdate={slot =>
                                        patchDraft({
                                            timeSlots: timeSlots.map(item => (item.day === timeSlot.day ? slot : item)),
                                        })
                                    }
                                />
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
            <SettingsSaveBar
                isDirty={isDirty}
                isSaving={isSaving}
                isSaveBlocked={hasError}
                onCancel={reset}
                onSave={() => void updateInbox()}
            />
        </div>
    );
}
