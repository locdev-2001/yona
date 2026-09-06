import { useMemo } from 'react';
import { differenceInMinutes, parse } from 'date-fns';

import { t } from '../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import SelectInput from 'dashboard/components-next/select/Select';
import type { SelectOptionGroup } from 'dashboard/components-next/select/Select';
import { generateTimeSlots } from '../helpers/businessHour';
import type { TimeSlot } from '../helpers/businessHour';

// Port từ settings/inbox/components/BusinessDay.vue.

const TIME_SLOTS = generateTimeSlots(30);

const groupByPeriod = (slots: string[]): SelectOptionGroup[] =>
    ['AM', 'PM']
        .map(period => ({
            label: period,
            options: slots.filter(slot => slot.endsWith(period)).map(slot => ({ value: slot, label: slot })),
        }))
        .filter(group => group.options.length > 0);

const toDate = (time: string) => parse(time, 'hh:mm a', new Date());

interface BusinessDayProps {
    dayName: string;
    timeSlot: TimeSlot;
    onUpdate: (slot: TimeSlot) => void;
}

export default function BusinessDay({ dayName, timeSlot, onUpdate }: BusinessDayProps) {
    const fromTimeSlots = useMemo(() => groupByPeriod(TIME_SLOTS), []);
    const toTimeSlots = useMemo(() => groupByPeriod(TIME_SLOTS.filter(slot => slot !== '12:00 AM')), []);

    const isDayEnabled = Boolean(timeSlot.from && timeSlot.to);
    const isOpenAllDay = Boolean(timeSlot.openAllDay);
    const hasError = !timeSlot.valid;

    const totalHours = () => {
        if (isOpenAllDay) return '24h';

        const totalMinutes = differenceInMinutes(toDate(timeSlot.to), toDate(timeSlot.from));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ') || '0m';
    };

    const toggleDay = (enabled: boolean) =>
        onUpdate(
            enabled
                ? { ...timeSlot, from: TIME_SLOTS[0], to: TIME_SLOTS[16], valid: true, openAllDay: false }
                : { ...timeSlot, from: '', to: '', valid: false, openAllDay: false },
        );

    const toggleOpenAllDay = (enabled: boolean) =>
        onUpdate(
            enabled
                ? { ...timeSlot, from: '12:00 AM', to: '11:59 PM', valid: true, openAllDay: true }
                : { ...timeSlot, from: '09:00 AM', to: '05:00 PM', valid: true, openAllDay: false },
        );

    const changeFrom = (value: string) =>
        onUpdate({
            ...timeSlot,
            from: value,
            valid: differenceInMinutes(toDate(timeSlot.to), toDate(value)) / 60 > 0,
        });

    // 12:00 AM ở ô "đến" nghĩa là nửa đêm hôm sau nên luôn hợp lệ.
    const changeTo = (value: string) =>
        onUpdate({
            ...timeSlot,
            to: value,
            valid: value === '12:00 AM' || differenceInMinutes(toDate(value), toDate(timeSlot.from)) / 60 > 0,
        });

    return (
        <tr>
            <td className="ltr:pl-4 ltr:pr-3 rtl:pl-3 rtl:pr-4">
                <div className="flex items-center gap-2 min-h-16">
                    <input
                        name="enable-day"
                        className="m-0"
                        type="checkbox"
                        checked={isDayEnabled}
                        title={t('INBOX_MGMT.BUSINESS_HOURS.DAY.ENABLE')}
                        onChange={event => toggleDay(event.target.checked)}
                    />
                    <span className="text-body-main text-n-slate-12 font-medium">{dayName}</span>
                </div>
            </td>
            <td className="py-3 ltr:pr-3 rtl:pl-3">
                {isDayEnabled ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    name="enable-open-all-day"
                                    className="m-0"
                                    type="checkbox"
                                    checked={isOpenAllDay}
                                    title={t('INBOX_MGMT.BUSINESS_HOURS.ALL_DAY')}
                                    onChange={event => toggleOpenAllDay(event.target.checked)}
                                />
                                <span className="text-body-main text-n-slate-12">
                                    {t('INBOX_MGMT.BUSINESS_HOURS.ALL_DAY')}
                                </span>
                            </div>
                            <SelectInput
                                groups={fromTimeSlots}
                                value={timeSlot.from}
                                placeholder={t('INBOX_MGMT.BUSINESS_HOURS.DAY.CHOOSE')}
                                disabled={isOpenAllDay}
                                onChange={changeFrom}
                            />
                            <div className="flex items-center">
                                <Icon icon="i-lucide-minus size-4" />
                            </div>
                            <SelectInput
                                groups={toTimeSlots}
                                value={timeSlot.to}
                                placeholder={t('INBOX_MGMT.BUSINESS_HOURS.DAY.CHOOSE')}
                                disabled={isOpenAllDay}
                                onChange={changeTo}
                            />
                        </div>
                        {hasError ? (
                            <span className="error text-label-small text-n-ruby-9">
                                {t('INBOX_MGMT.BUSINESS_HOURS.DAY.VALIDATION_ERROR')}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <span className="text-body-main text-n-slate-11">
                        {t('INBOX_MGMT.BUSINESS_HOURS.DAY.UNAVAILABLE')}
                    </span>
                )}
            </td>
            <td className="py-3 ltr:pr-3 rtl:pl-3">
                {isDayEnabled && !hasError ? (
                    <span className="label bg-n-blue-3 text-n-blue-11 text-label-small inline-block px-2 py-1 rounded-lg cursor-default whitespace-nowrap">
                        {totalHours()}
                    </span>
                ) : null}
            </td>
        </tr>
    );
}
