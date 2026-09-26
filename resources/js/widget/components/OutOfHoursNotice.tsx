import { useId, useState } from 'react';

import { EMAIL_PATTERN } from './template/EmailInput';
import { useInboxAvailability } from './Availability';
import { findNextAvailableSlotDetails, formatClockTime } from '../helpers/availabilityHelpers';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { getLocale } from '../../i18n';
import { t } from '../i18n';

const DAY_NAME_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Khung trực kế tiếp theo giờ làm việc của hộp thư, đã quy về múi giờ của khách.
function useNextOpening(): { reopen: string | null; hours: string | null } {
    const { inboxConfig, currentTime } = useInboxAvailability([]);
    const slot = inboxConfig.workingHoursEnabled
        ? findNextAvailableSlotDetails(currentTime, inboxConfig.utcOffset, inboxConfig.workingHours)
        : null;
    if (!slot) return { reopen: null, hours: null };

    const locale = getLocale();
    const { config, daysUntilOpen, dayOfWeek } = slot;
    const day = t(`DAY_NAMES.${DAY_NAME_KEYS[dayOfWeek]}`);

    if (config.openAllDay) {
        return {
            reopen: daysUntilOpen <= 1 ? t('OUT_OF_HOURS.REOPEN_TOMORROW_ALL_DAY') : t('OUT_OF_HOURS.REOPEN_ON_DAY_ALL_DAY', { day }),
            hours: null,
        };
    }

    const time = formatClockTime(config.openHour ?? 0, config.openMinutes ?? 0, locale);
    const reopen =
        daysUntilOpen === 0
            ? t('OUT_OF_HOURS.REOPEN_TODAY', { time })
            : daysUntilOpen === 1
              ? t('OUT_OF_HOURS.REOPEN_TOMORROW', { time })
              : t('OUT_OF_HOURS.REOPEN_ON_DAY', { time, day });
    const hours =
        config.closeHour === undefined || config.closeHour === null
            ? null
            : t('OUT_OF_HOURS.HOURS', {
                  from: time,
                  to: formatClockTime(config.closeHour, config.closeMinutes ?? 0, locale),
              });

    return { reopen, hours };
}

// Ngoài giờ hỗ trợ, khi khách chưa nhắn gì: nói khi nào mở cửa lại, xin email (không bắt buộc)
// để trả lời sau, rồi khách nhắn như bình thường ở ô nhập.
export default function OutOfHoursNotice() {
    const hasEmail = useWidgetState(state => Boolean(state.contact?.has_email));
    const outOfOfficeMessage = useWidgetState(state => state.channelConfig?.outOfOfficeMessage?.trim() ?? '');
    const { reopen, hours } = useNextOpening();
    const [email, setEmail] = useState('');
    const [hasInvalidEmail, setInvalidEmail] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);
    const [hasSaveFailed, setSaveFailed] = useState(false);
    const errorId = useId();
    const emailId = useId();

    const defaultBody = [hours, reopen ? t('OUT_OF_HOURS.BODY_REOPEN', { reopen }) : t('OUT_OF_HOURS.BODY')]
        .filter(Boolean)
        .join(' ');

    const leaveMessage = async () => {
        const typedEmail = email.trim();
        if (typedEmail && !hasEmail) {
            if (!EMAIL_PATTERN.test(typedEmail)) {
                setInvalidEmail(true);
                return;
            }
            setSubmitting(true);
            setSaveFailed(false);
            const isSaved = await widgetStore.updateContact({ email: typedEmail });
            setSubmitting(false);
            if (!isSaved) {
                setSaveFailed(true);
                return;
            }
        }
        document.getElementById('chat-input')?.focus();
    };

    return (
        <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-8" data-testid="out-of-hours">
            <span aria-hidden="true" className="i-lucide-clock size-7 text-[var(--yona-chat-ink-soft)]" />
            <div>
                <h2 className="m-0 text-[22px] font-semibold leading-[29px] tracking-[-0.01em] text-[var(--yona-chat-ink)]">{t('OUT_OF_HOURS.TITLE')}</h2>
                <p className="mt-1.5 text-[15px] leading-[22px] whitespace-pre-line text-[var(--yona-chat-ink-soft)]">
                    {outOfOfficeMessage || defaultBody}
                </p>
                {outOfOfficeMessage && reopen ? (
                    <p className="mt-1 text-[15px] leading-[22px] text-[var(--yona-chat-ink-soft)]">{t('OUT_OF_HOURS.REOPEN', { reopen })}</p>
                ) : null}
            </div>
            <form
                className={hasEmail ? 'flex flex-col' : 'flex flex-col gap-3 rounded-2xl bg-[var(--yona-chat-panel)] p-4 shadow-[var(--yona-chat-shadow-card)]'}
                noValidate
                onSubmit={event => {
                    event.preventDefault();
                    void leaveMessage();
                }}
            >
                {!hasEmail ? (
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[15px] font-semibold text-[var(--yona-chat-ink)]">{t('OUT_OF_HOURS.EMAIL_TITLE')}</span>
                        <label htmlFor={emailId} className="text-[13px] text-[var(--yona-chat-ink-soft)]">
                            {t('OUT_OF_HOURS.EMAIL_LABEL')}
                        </label>
                        <input
                            id={emailId}
                            type="email"
                            value={email}
                            autoComplete="email"
                            aria-invalid={hasInvalidEmail}
                            aria-describedby={hasInvalidEmail ? errorId : undefined}
                            placeholder={t('OUT_OF_HOURS.EMAIL_PLACEHOLDER')}
                            className="reset-base w-full min-h-11 px-3 py-[11px] yona-touch-field rounded-[11px] border border-[var(--yona-chat-line-field)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-ink)] placeholder:text-[var(--yona-chat-ink-muted)] aria-[invalid=true]:border-[var(--yona-chat-danger)]"
                            onChange={event => {
                                setEmail(event.target.value);
                                setInvalidEmail(false);
                            }}
                        />
                        {hasInvalidEmail ? (
                            <p id={errorId} className="text-[12px] text-[var(--yona-chat-danger)]">
                                {t('PRE_CHAT_FORM.FIELDS.EMAIL_ADDRESS.VALID_ERROR')}
                            </p>
                        ) : null}
                    </div>
                ) : null}
                {hasSaveFailed ? (
                    <p role="alert" className="text-[12px] leading-[1.4] text-[var(--yona-chat-danger)]">
                        {t('EMAIL_SAVE_FAILED')}
                    </p>
                ) : null}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-11 rounded-full p-3 text-[15px] font-medium leading-none bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)] active:scale-[0.97] disabled:opacity-60"
                >
                    {t('OUT_OF_HOURS.CTA')}
                </button>
            </form>
            <p className="m-0 text-[14px] leading-[21px] text-[var(--yona-chat-ink-soft)]">{t('OUT_OF_HOURS.HINT')}</p>
        </div>
    );
}

// Ngoài giờ khi đã có hội thoại: một dòng nhắc ngay trên ô nhập thay cho màn đầy đủ.
export function OutOfHoursBanner() {
    const { reopen } = useNextOpening();

    return (
        <div
            role="status"
            data-testid="out-of-hours-banner"
            className="flex items-center gap-2 px-4 py-2 text-[12px] leading-[1.4] border-t border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-ink-soft)]"
        >
            <span aria-hidden="true" className="i-lucide-clock size-3.5 flex-shrink-0" />
            <span>{reopen ? t('OUT_OF_HOURS.BANNER', { reopen }) : t('OUT_OF_HOURS.BANNER_FALLBACK')}</span>
        </div>
    );
}
