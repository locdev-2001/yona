import { forwardRef, useState } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../../i18n';
import type { AbuseReason } from '../api';
import { useConversation } from '../ConversationContext';

const REASONS: AbuseReason[] = ['spam', 'harassment', 'inappropriate', 'scam', 'other'];

// Báo cáo người bên kia vi phạm; Super Admin xem ở mục Báo cáo vi phạm.
const ReportDialog = forwardRef<DialogHandle>(function ReportDialog(_props, ref) {
    const { reportConversation, selectedConversation } = useConversation();
    const [reason, setReason] = useState<AbuseReason>('spam');
    const [note, setNote] = useState('');
    const [isSending, setSending] = useState(false);

    const submit = async () => {
        setSending(true);
        try {
            await reportConversation(reason, note.trim() || undefined);
            setNote('');
            if (ref && typeof ref !== 'function') ref.current?.close();
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog
            ref={ref}
            type="edit"
            title={t('CHAT.REPORT.TITLE', { name: selectedConversation?.meta.sender.name ?? '' })}
            description={t('CHAT.REPORT.DESCRIPTION')}
            confirmButtonLabel={t('CHAT.REPORT.SUBMIT')}
            isLoading={isSending}
            onConfirm={() => void submit()}
        >
            <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-sm font-medium text-n-slate-12">{t('CHAT.REPORT.REASON')}</legend>
                {REASONS.map(item => (
                    <label key={item} className="flex items-center gap-2 min-h-11 px-2 rounded-lg cursor-pointer hover:bg-n-surface-hover">
                        <input type="radio" name="report-reason" value={item} checked={reason === item} onChange={() => setReason(item)} />
                        <span className="text-sm text-n-slate-12">{t(`CHAT.REPORT.REASONS.${item.toUpperCase()}`)}</span>
                    </label>
                ))}
            </fieldset>
            <textarea
                value={note}
                rows={3}
                maxLength={1000}
                placeholder={t('CHAT.REPORT.NOTE_PLACEHOLDER')}
                className="mt-3 w-full resize-none"
                onChange={event => setNote(event.target.value)}
            />
        </Dialog>
    );
});

export default ReportDialog;
