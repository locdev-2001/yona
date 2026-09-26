import { useState } from 'react';

import { sendEmailTranscript } from '../api/widget';
import { t } from '../i18n';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';

const COOLDOWN_MS = 15000;

// Chung cho footer (hội thoại đã kết thúc) và menu ⋯: bấm ở chỗ này thì chỗ kia cũng phải chờ.
let cooldownUntil = 0;

/** Gửi lịch sử chat về email của khách. Chỉ có khi khách đã để lại email. */
export function useEmailTranscript(): { available: boolean; busy: boolean; send: () => Promise<void> } {
    const available = useWidgetState(state => Boolean(state.contact?.has_email));
    const [busy, setBusy] = useState(false);

    const send = async () => {
        if (!available || busy || Date.now() < cooldownUntil) return;

        setBusy(true);
        try {
            await sendEmailTranscript();
            cooldownUntil = Date.now() + COOLDOWN_MS;
            widgetStore.showBanner({ message: t('EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS'), type: 'success' });
        } catch {
            widgetStore.showBanner({ message: t('EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR'), type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return { available, busy, send };
}
