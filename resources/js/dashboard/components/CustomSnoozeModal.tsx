import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';

import './CustomSnoozeModal.scss';
import Button from 'dashboard/components-next/button/Button';
import ModalHeader from 'dashboard/components/ModalHeader';
import { t } from '../../i18n';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/CustomSnoozeModal.vue. Gốc dùng vue-datepicker-next
// 1.0.3 `type="datetime"` (prop `inline` không tồn tại ở bản đó → vẫn là ô nhập +
// popup lịch/giờ append vào body). Bên dưới port đúng DOM/class mx-* của thư viện.

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const POPUP_CLASS = 'mx-datepicker-main mx-datepicker-popup';
const CELL_CLASS = 'cell';

// getCalendar của vue-datepicker-next: 6 tuần × 7 ngày, bắt đầu Chủ nhật.
function buildCalendarDates(year: number, month: number): Date[][] {
    const dates: Date[] = [];
    const lastDayInLastMonth = new Date(year, month, 0);
    const lastDate = lastDayInLastMonth.getDate();
    const firstDateInLastMonth = lastDate - lastDayInLastMonth.getDay();
    for (let day = firstDateInLastMonth; day <= lastDate; day += 1) {
        dates.push(new Date(year, month - 1, day));
    }
    const lastDateInCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= lastDateInCurrentMonth; day += 1) {
        dates.push(new Date(year, month, day));
    }
    const nextMonthLength = 6 * 7 - dates.length;
    for (let day = 1; day <= nextMonthLength; day += 1) {
        dates.push(new Date(year, month + 1, day));
    }
    return Array.from({ length: 6 }, (_, row) => dates.slice(row * 7, row * 7 + 7));
}

const padNumber = (value: number) => String(value).padStart(2, '0');

const disabledDate = (date: Date): boolean => {
    // Disable all the previous dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date < yesterday;
};

const disabledTime = (date: Date): boolean => {
    // Allow only time after 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return date < now;
};

const assignTime = (date: Date, time: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds());

function ButtonIcon({ value, onClick }: { value: string; onClick: () => void }) {
    return (
        <button type="button" className={`mx-btn mx-btn-text mx-btn-icon-${value}`} onClick={onClick}>
            <i className={`mx-icon-${value}`} />
        </button>
    );
}

interface TimeColumnProps {
    type: 'hour' | 'minute' | 'second';
    items: Array<{ text: string; value: Date }>;
    current: Date;
    onSelect: (value: Date) => void;
}

function TimeColumn({ type, items, current, onSelect }: TimeColumnProps) {
    const wrapRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const active = wrapRef.current?.querySelector<HTMLElement>('.active');
        if (active && wrapRef.current) wrapRef.current.scrollTop = active.offsetTop;
    }, [current]);

    return (
        <div className="mx-scrollbar mx-time-column">
            <div ref={wrapRef} className="mx-scrollbar-wrap">
                <ul className="mx-time-list" data-type={type}>
                    {items.map(item => {
                        const disabled = disabledTime(item.value);
                        const active = !disabled && item.value.getTime() === current.getTime();
                        return (
                            <li
                                key={item.text}
                                className={['mx-time-item', disabled ? 'disabled' : '', active ? 'active' : '']
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => {
                                    if (!disabled) onSelect(item.value);
                                }}
                            >
                                {item.text}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

interface DateTimePickerProps {
    value: Date | null;
    onChange: (value: Date) => void;
}

function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ left: '0px', top: '0px' });
    // currentValue của DateTime panel: ngày đã chọn nhưng giờ còn bị disabledTime thì chưa emit.
    const [currentValue, setCurrentValue] = useState<Date>(() => value ?? new Date());
    const [calendar, setCalendar] = useState<Date>(() => value ?? new Date());
    const [timeVisible, setTimeVisible] = useState(false);

    useEffect(() => {
        if (popupVisible && value) setCurrentValue(value);
    }, [popupVisible, value]);

    useLayoutEffect(() => {
        if (!popupVisible || !containerRef.current || !popupRef.current) return;
        // getRelativePosition(appendToBody = true): dưới ô nhập, canh trái.
        const rect = containerRef.current.getBoundingClientRect();
        const popup = popupRef.current;
        const dw = document.documentElement.clientWidth;
        const dh = document.documentElement.clientHeight;
        const targetWidth = popup.offsetWidth;
        const targetHeight = popup.offsetHeight;
        const offsetX = window.pageXOffset + rect.left;
        const offsetY = window.pageYOffset + rect.top;
        let left: number;
        if (dw - rect.left < targetWidth && rect.right < targetWidth) {
            left = offsetX - rect.left + 1;
        } else if (rect.left + rect.width / 2 <= dw / 2) {
            left = offsetX;
        } else {
            left = offsetX + rect.width - targetWidth;
        }
        let top: number;
        if (rect.top <= targetHeight && dh - rect.bottom <= targetHeight) {
            top = offsetY + dh - rect.top - targetHeight;
        } else if (rect.top + rect.height / 2 <= dh / 2) {
            top = offsetY + rect.height;
        } else {
            top = offsetY - targetHeight;
        }
        setPopupPosition({ left: `${left}px`, top: `${top}px` });
    }, [popupVisible, timeVisible]);

    useEffect(() => {
        if (!popupVisible) return undefined;
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
            setPopupVisible(false);
            setTimeVisible(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [popupVisible]);

    const openPopup = () => setPopupVisible(true);

    const handleSelectDate = (date: Date) => {
        if (disabledDate(date)) return;
        setTimeVisible(true);
        setCalendar(date);
        const datetime = assignTime(date, currentValue);
        setCurrentValue(datetime);
        if (!disabledTime(datetime)) onChange(datetime);
    };

    const handleSelectTime = (datetime: Date) => {
        setCurrentValue(datetime);
        onChange(datetime);
    };

    const rows = useMemo(() => buildCalendarDates(calendar.getFullYear(), calendar.getMonth()), [calendar]);
    const today = new Date().setHours(0, 0, 0, 0);
    const selectedDay = new Date(currentValue).setHours(0, 0, 0, 0);

    const timeColumns = useMemo(() => {
        const withHours = (hour: number) => {
            const next = new Date(currentValue);
            next.setHours(hour);
            return next;
        };
        const withMinutes = (minute: number) => {
            const next = new Date(currentValue);
            next.setMinutes(minute);
            return next;
        };
        const withSeconds = (second: number) => {
            const next = new Date(currentValue);
            next.setSeconds(second);
            return next;
        };
        return [
            { type: 'hour' as const, items: Array.from({ length: 24 }, (_, i) => ({ text: padNumber(i), value: withHours(i) })) },
            { type: 'minute' as const, items: Array.from({ length: 60 }, (_, i) => ({ text: padNumber(i), value: withMinutes(i) })) },
            { type: 'second' as const, items: Array.from({ length: 60 }, (_, i) => ({ text: padNumber(i), value: withSeconds(i) })) },
        ];
    }, [currentValue]);

    const shiftCalendar = (months: number) =>
        setCalendar(current => new Date(current.getFullYear(), current.getMonth() + months, 1));

    const popup: ReactNode = popupVisible ? (
        <div ref={popupRef} className={POPUP_CLASS} style={{ position: 'absolute', ...popupPosition }}>
            <div className="mx-datepicker-content">
                <div className="mx-datepicker-body">
                    <div className="mx-date-time">
                        <div className="mx-calendar mx-calendar-panel-date">
                            <div className="mx-calendar-header">
                                <ButtonIcon value="double-left" onClick={() => shiftCalendar(-12)} />
                                <ButtonIcon value="left" onClick={() => shiftCalendar(-1)} />
                                <ButtonIcon value="double-right" onClick={() => shiftCalendar(12)} />
                                <ButtonIcon value="right" onClick={() => shiftCalendar(1)} />
                                <span className="mx-calendar-header-label">
                                    <button type="button" className="mx-btn mx-btn-text mx-btn-current-month">
                                        {format(calendar, 'MMMM')}
                                    </button>
                                    <button type="button" className="mx-btn mx-btn-text mx-btn-current-year">
                                        {format(calendar, 'yyyy')}
                                    </button>
                                </span>
                            </div>
                            <div className="mx-calendar-content">
                                <table className="mx-table mx-table-date">
                                    <thead>
                                        <tr>
                                            {WEEK_DAYS.map(day => (
                                                <th key={day}>{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="mx-date-row">
                                                {row.map(cell => {
                                                    const classes = [CELL_CLASS];
                                                    if (cell.getTime() === today) classes.push('today');
                                                    if (cell.getMonth() !== calendar.getMonth()) classes.push('not-current-month');
                                                    if (disabledDate(cell)) classes.push('disabled');
                                                    else if (cell.getTime() === selectedDay) classes.push('active');
                                                    return (
                                                        <td
                                                            key={cell.getTime()}
                                                            className={classes.join(' ')}
                                                            title={format(cell, 'yyyy-MM-dd')}
                                                            onClick={() => handleSelectDate(cell)}
                                                        >
                                                            <div>{cell.getDate()}</div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {timeVisible ? (
                            <div className="mx-time">
                                <div className="mx-time-header">
                                    <button
                                        type="button"
                                        className="mx-btn mx-btn-text mx-time-header-title"
                                        onClick={() => setTimeVisible(false)}
                                    >
                                        {format(currentValue, 'yyyy-MM-dd')}
                                    </button>
                                </div>
                                <div className="mx-time-content">
                                    <div className="mx-time-columns">
                                        {timeColumns.map(column => (
                                            <TimeColumn
                                                key={column.type}
                                                type={column.type}
                                                items={column.items}
                                                current={currentValue}
                                                onSelect={handleSelectTime}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div ref={containerRef} className="mx-datepicker">
            <div className="mx-input-wrapper" onClick={openPopup}>
                <input
                    name="date"
                    type="text"
                    autoComplete="off"
                    className="mx-input "
                    value={value ? format(value, 'yyyy-MM-dd HH:mm:ss') : ''}
                    readOnly
                    onFocus={openPopup}
                />
                <i className="mx-icon-calendar">
                    <span className={`${ICONS.calendar} block`} aria-hidden="true" />
                </i>
            </div>
            {popup ? createPortal(popup, document.body) : null}
        </div>
    );
}

interface CustomSnoozeModalProps {
    onClose: () => void;
    onChooseTime: (snoozeTime: Date | null) => void;
}

export default function CustomSnoozeModal({ onClose, onChooseTime }: CustomSnoozeModalProps) {
    const [snoozeTime, setSnoozeTime] = useState<Date | null>(null);

    const chooseTime = (event: FormEvent) => {
        event.preventDefault();
        onChooseTime(snoozeTime);
    };

    return (
        <div className="flex flex-col">
            <ModalHeader headerTitle={t('CONVERSATION.CUSTOM_SNOOZE.TITLE')} />
            <form className="modal-content w-full pt-2 px-5 pb-6" onSubmit={chooseTime}>
                <DateTimePicker value={snoozeTime} onChange={setSnoozeTime} />
                <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                    <Button faded slate type="reset" label={t('CONVERSATION.CUSTOM_SNOOZE.CANCEL')} onClick={onClose} />
                    <Button type="submit" label={t('CONVERSATION.CUSTOM_SNOOZE.APPLY')} />
                </div>
            </form>
        </div>
    );
}
