import NextButton from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';

import { t } from '../../../../i18n';
import type { ScheduleDraft } from './cardPayloads';

const k = (key: string) => t(`CONVERSATION.SEND_CARD.SCHEDULE.${key}`);
const MAX_SLOTS = 12;

/** Khung giờ nhân viên đưa ra; khách chọn trên trang "Chọn lịch" (widget mở trong sheet, kênh khác nhận link). */
export default function ScheduleForm({ draft, onChange }: { draft: ScheduleDraft; onChange: (draft: ScheduleDraft) => void }) {
    const setSlot = (index: number, patch: Partial<ScheduleDraft['slots'][number]>) =>
        onChange({ ...draft, slots: draft.slots.map((slot, at) => (at === index ? { ...slot, ...patch } : slot)) });

    return (
        <div className="flex flex-col gap-3">
            <Input label={k('TITLE_LABEL')} maxLength={80} value={draft.title} onChange={event => onChange({ ...draft, title: event.target.value })} />
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 text-sm font-medium text-n-slate-12">{k('SLOTS')}</legend>
                {draft.slots.map((slot, index) => (
                    <div key={index} className="grid grid-cols-[150px_minmax(0,1fr)_auto] items-center gap-2">
                        <Input type="date" aria-label={k('DATE')} value={slot.date} onChange={event => setSlot(index, { date: event.target.value })} />
                        <Input aria-label={k('TIME')} placeholder={k('TIME_PLACEHOLDER')} maxLength={40} value={slot.label} onChange={event => setSlot(index, { label: event.target.value })} />
                        <NextButton
                            type="button"
                            icon="i-lucide-x"
                            slate
                            faded
                            sm
                            title={t('CONVERSATION.SEND_CARD.REMOVE')}
                            disabled={draft.slots.length === 1}
                            onClick={() => onChange({ ...draft, slots: draft.slots.filter((_, at) => at !== index) })}
                        />
                    </div>
                ))}
                {draft.slots.length < MAX_SLOTS ? (
                    <NextButton
                        type="button"
                        icon="i-lucide-plus"
                        link
                        sm
                        label={k('ADD_SLOT')}
                        className="self-start"
                        onClick={() => onChange({ ...draft, slots: [...draft.slots, { date: draft.slots.at(-1)?.date ?? '', label: '' }] })}
                    />
                ) : null}
            </fieldset>
            <Input label={k('NOTE')} placeholder={k('NOTE_PLACEHOLDER')} maxLength={200} value={draft.note} onChange={event => onChange({ ...draft, note: event.target.value })} />
        </div>
    );
}
