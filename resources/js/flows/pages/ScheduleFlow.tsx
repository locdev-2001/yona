import { useMemo, useState } from 'react';

import { t } from '../../i18n';
import { submitFlow } from '../api';
import type { FlowResponse, ScheduleSlot } from '../types';
import type { FlowPageProps } from '../registry';

// Trang "schedule" (artboard Webview): chọn ngày rồi khung giờ trong
// `data.slots` do nhân viên/bot gửi kèm — không có module lịch riêng.
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ Nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];

function parseSlots(data: Record<string, unknown>): ScheduleSlot[] {
    const raw = data.slots;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap(entry => {
        if (typeof entry !== 'object' || entry === null) return [];
        const slot = entry as Record<string, unknown>;
        const date = typeof slot.date === 'string' ? slot.date : '';
        const label = typeof slot.label === 'string' ? slot.label : '';
        const value = typeof slot.value === 'string' ? slot.value : '';

        return date && label && value ? [{ date, label, value, full: slot.full === true }] : [];
    });
}

// Ngày ghi "YYYY-MM-DD" không kèm giờ — parse thủ công để không lệch múi giờ trình duyệt.
function dayOf(date: string): Date | null {
    const [year, month, day] = date.split('-').map(Number);

    return year && month && day ? new Date(year, month - 1, day) : null;
}

export default function ScheduleFlow({ flow, token, onSubmitted }: FlowPageProps) {
    const slots = useMemo(() => parseSlots(flow.data), [flow.data]);
    const dates = useMemo(() => Array.from(new Set(slots.map(slot => slot.date))), [slots]);
    const [selectedDate, setSelectedDate] = useState(dates[0] ?? '');
    const [selectedValue, setSelectedValue] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    if (slots.length === 0) {
        return (
            <div className="flow-body">
                <p className="flow-note">{t('FLOWS.schedule.no_slots')}</p>
            </div>
        );
    }

    const note = typeof flow.data.note === 'string' ? flow.data.note : null;
    const daySlots = slots.filter(slot => slot.date === selectedDate);
    const selected = slots.find(slot => slot.value === selectedValue) ?? null;
    const selectedDay = selected ? dayOf(selected.date) : null;

    const confirmLabel = selected
        ? t('FLOWS.schedule.confirm', { day: selectedDay ? WEEKDAY_LONG[selectedDay.getDay()] : '', time: selected.label })
        : t('FLOWS.schedule.choose_slot');

    const submit = async () => {
        if (!selected || sending) return;

        setSending(true);
        setError('');

        try {
            // Nhân viên đọc câu trả lời trong hộp thư: phải có cả ngày, không chỉ khung giờ.
            const dayLabel = selectedDay ? `${WEEKDAY_LONG[selectedDay.getDay()]} ${String(selectedDay.getDate()).padStart(2, '0')}/${String(selectedDay.getMonth() + 1).padStart(2, '0')}` : '';
            const title = dayLabel ? `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)}, ${selected.label}` : selected.label;
            await submitFlow(token, { submitted_values: [{ title, value: selected.value }] });
            onSubmitted();
        } catch {
            setError(t('FLOWS.send_failed'));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <div className="flow-body">
                {flow.subtitle ? <p className="flow-note">{flow.subtitle}</p> : null}
                <div className="flow-section">
                    <span className="flow-section-title">{t('FLOWS.schedule.day_section')}</span>
                    <div className="flow-days">
                        {dates.map(date => {
                            const parsed = dayOf(date);

                            return (
                                <button
                                    key={date}
                                    type="button"
                                    className="flow-day"
                                    aria-pressed={date === selectedDate}
                                    onClick={() => {
                                        setSelectedDate(date);
                                        setSelectedValue(null);
                                    }}
                                >
                                    <span className="flow-day-name">{parsed ? WEEKDAY_SHORT[parsed.getDay()] : ''}</span>
                                    <span className="flow-day-num">{parsed ? parsed.getDate() : date}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flow-section">
                    <span className="flow-section-title">{t('FLOWS.schedule.time_section')}</span>
                    <div className="flow-slots">
                        {daySlots.map(slot => (
                            <button
                                key={slot.value}
                                type="button"
                                className="flow-slot"
                                aria-pressed={slot.value === selectedValue}
                                disabled={slot.full}
                                onClick={() => setSelectedValue(slot.value)}
                            >
                                {slot.label}
                            </button>
                        ))}
                    </div>
                    {daySlots.some(slot => slot.full) ? <span className="flow-note">{t('FLOWS.schedule.full_note')}</span> : null}
                </div>
                {note ? <p className="flow-note">{note}</p> : null}
                {error ? <p className="mk-error">{error}</p> : null}
            </div>
            <div className="flow-footer">
                <button type="button" className="mk-pill mk-pill--primary mk-pill--block" disabled={!selected || sending} onClick={submit}>
                    {confirmLabel}
                </button>
            </div>
        </>
    );
}
