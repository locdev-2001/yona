import { useState } from 'react';

import { EMAIL_PATTERN } from './template/EmailInput';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';

// Ngoài giờ hỗ trợ: xin email để trả lời sau, rồi khách nhắn như bình thường ở ô nhập.
export default function OutOfHoursNotice() {
    const hasEmail = useWidgetState(state => Boolean(state.contact?.has_email));
    const [email, setEmail] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const isValidEmail = EMAIL_PATTERN.test(email);

    const leaveMessage = async () => {
        if (isValidEmail && !hasEmail) {
            setSubmitting(true);
            await widgetStore.updateContact({ email });
            setSubmitting(false);
        }
        document.getElementById('chat-input')?.focus();
    };

    return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8 py-10 text-center" data-testid="out-of-hours">
            <span className="flex items-center justify-center size-12 rounded-[14px] bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]">
                <span className="i-lucide-clock size-6" />
            </span>
            <h2 className="text-lg font-medium text-[var(--yona-chat-ink)]">{t('OUT_OF_HOURS.TITLE')}</h2>
            <p className="max-w-[280px] text-sm leading-5 text-[var(--yona-chat-ink-soft)]">{t('OUT_OF_HOURS.BODY')}</p>
            <form
                className="flex flex-col w-full max-w-[280px] gap-2 mt-1"
                onSubmit={event => {
                    event.preventDefault();
                    void leaveMessage();
                }}
            >
                {!hasEmail ? (
                    <input
                        type="email"
                        value={email}
                        autoComplete="email"
                        aria-label={t('OUT_OF_HOURS.EMAIL_PLACEHOLDER')}
                        placeholder={t('OUT_OF_HOURS.EMAIL_PLACEHOLDER')}
                        className="reset-base w-full h-11 px-4 text-sm rounded-full bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink)] placeholder:text-[var(--yona-chat-ink-muted)]"
                        onChange={event => setEmail(event.target.value)}
                    />
                ) : null}
                <button
                    type="submit"
                    disabled={isSubmitting || (!hasEmail && !isValidEmail)}
                    className="w-full rounded-full min-h-11 font-medium bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)] disabled:opacity-50"
                >
                    {t('OUT_OF_HOURS.CTA')}
                </button>
            </form>
        </div>
    );
}
