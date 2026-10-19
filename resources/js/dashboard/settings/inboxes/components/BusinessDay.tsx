import { differenceInMinutes, parse } from 'date-fns';

import { t } from '../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import SelectInput from 'dashboard/components-next/select/Select';
import type { SelectOption } from 'dashboard/components-next/select/Select';
import { generateTimeSlots, timeSlotLabel } from '../helpers/businessHour';
import type { TimeSlot } from '../helpers/businessHour';

// Port từ settings/inbox/components/BusinessDay.vue. Một ngày trong lịch tuần: màn
// rộng là một hàng ba cột (ngày · giờ làm việc · tổng giờ), màn hẹp giờ làm việc
// xuống dòng riêng dưới tên ngày.
export const BUSINESS_DAY_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[10rem_minmax(0,1fr)_7rem]';

const TIME_SLOTS = generateTimeSlots(30);
const toOption = (slot: string): SelectOption => ({ value: slot, label: timeSlotLabel(slot) });
const FROM_OPTIONS = TIME_SLOTS.map(toOption);
// 12:00 AM ở ô "đến" là nửa đêm hôm sau, trùng nghĩa với cả ngày nên không cho chọn.
const TO_OPTIONS = TIME_SLOTS.filter(slot => slot !== '12:00 AM').map(toOption);

const toDate = (time: string) => parse(time, 'hh:mm a', new Date());

interface BusinessDayProps {
    dayName: string;
    timeSlot: TimeSlot;
    onUpdate: (slot: TimeSlot) => void;
}

export default function BusinessDay({ dayName, timeSlot, onUpdate }: BusinessDayProps) {
    const isDayEnabled = Boolean(timeSlot.from && timeSlot.to);
    const isOpenAllDay = Boolean(timeSlot.openAllDay);
    const hasError = !timeSlot.valid;

    const totalHours = () => {
        if (isOpenAllDay) return t('INBOX_MGMT.BUSINESS_HOURS.TOTAL.HOURS', { hours: 24 });

        const totalMinutes = differenceInMinutes(toDate(timeSlot.to), toDate(timeSlot.from));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours && minutes) return t('INBOX_MGMT.BUSINESS_HOURS.TOTAL.HOURS_MINUTES', { hours, minutes });

        return hours
            ? t('INBOX_MGMT.BUSINESS_HOURS.TOTAL.HOURS', { hours })
            : t('INBOX_MGMT.BUSINESS_HOURS.TOTAL.MINUTES', { minutes });
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

    const changeTo = (value: string) =>
        onUpdate({
            ...timeSlot,
            to: value,
            valid: value === '12:00 AM' || differenceInMinutes(toDate(value), toDate(timeSlot.from)) / 60 > 0,
        });

    return (
        <li className={`${BUSINESS_DAY_GRID} gap-x-3 gap-y-2 items-center px-4 py-3`}>
            <label className="flex items-center gap-2 min-h-11 cursor-pointer">
                <input
                    name="enable-day"
                    className="m-0"
                    type="checkbox"
                    checked={isDayEnabled}
                    onChange={event => toggleDay(event.target.checked)}
                />
                <span className="text-body-main text-n-slate-12 font-medium">{dayName}</span>
            </label>
            <div className="justify-self-end md:justify-self-start md:order-last">
                {isDayEnabled && !hasError ? (
                    <span className="label bg-n-blue-3 text-n-blue-11 text-label-small inline-block px-2 py-1 rounded-lg cursor-default whitespace-nowrap">
                        {totalHours()}
                    </span>
                ) : null}
            </div>
            <div className="col-span-2 md:col-span-1">
                {isDayEnabled ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <label className="flex items-center gap-2 min-h-11 cursor-pointer">
                                <input
                                    name="enable-open-all-day"
                                    className="m-0"
                                    type="checkbox"
                                    checked={isOpenAllDay}
                                    onChange={event => toggleOpenAllDay(event.target.checked)}
                                />
                                <span className="text-body-main text-n-slate-12">
                                    {t('INBOX_MGMT.BUSINESS_HOURS.ALL_DAY')}
                                </span>
                            </label>
                            <div className="flex items-center gap-2">
                                <SelectInput
                                    options={FROM_OPTIONS}
                                    value={timeSlot.from}
                                    aria-label={t('INBOX_MGMT.BUSINESS_HOURS.DAY.FROM', { day: dayName })}
                                    placeholder={t('INBOX_MGMT.BUSINESS_HOURS.DAY.CHOOSE')}
                                    disabled={isOpenAllDay}
                                    onChange={changeFrom}
                                />
                                <Icon icon="i-lucide-minus size-4" />
                                <SelectInput
                                    options={TO_OPTIONS}
                                    value={timeSlot.to}
                                    aria-label={t('INBOX_MGMT.BUSINESS_HOURS.DAY.TO', { day: dayName })}
                                    placeholder={t('INBOX_MGMT.BUSINESS_HOURS.DAY.CHOOSE')}
                                    disabled={isOpenAllDay}
                                    onChange={changeTo}
                                />
                            </div>
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
            </div>
        </li>
    );
}
