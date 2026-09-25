import { useState } from 'react';

import Spinner from 'shared/components/Spinner';

import { t } from '../../i18n';
import { widgetStore } from '../../store/widgetStore';
import { ArrowRightIcon } from '../message/icons';

// Port từ widget/components/template/EmailInput.vue — ô nhập email trong bong
// bóng bot `input_email`. Luật @vuelidate `required` + `email`.
// Regex của @vuelidate/validators 2.0.4 (luật `email`) — giữ nguyên, kể cả nét
// lạ `[A-z]`, để nút mũi tên bật/tắt trùng oracle.
// eslint-disable-next-line no-control-regex
export const EMAIL_PATTERN =
    /^(?:[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[A-z0-9](?:[A-z0-9-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9-]*[A-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[A-z0-9-]*[A-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])$/;

interface EmailInputProps {
    messageId: number | string;
    messageContentAttributes: Record<string, unknown>;
}

export default function EmailInput({ messageId, messageContentAttributes }: EmailInputProps) {
    const [email, setEmail] = useState('');
    const [isTouched, setTouched] = useState(false);
    const [isUpdating, setUpdating] = useState(false);
    const [hasSaveFailed, setSaveFailed] = useState(false);

    const hasSubmitted = Boolean(messageContentAttributes?.submitted_email);
    if (hasSubmitted) return <div />;

    const isInvalid = !email || !EMAIL_PATTERN.test(email);
    const showsError = isTouched && isInvalid;

    const onSubmit = async () => {
        if (isInvalid) return;
        setUpdating(true);
        setSaveFailed(false);
        const isSaved = await widgetStore.updateMessage({ messageId, email });
        setSaveFailed(!isSaved);
        setUpdating(false);
    };

    // Ô email gọn trong bong bóng bot: trường nền ô nhập bo 11, nút gửi tròn màu
    // nhấn (xám khi email chưa hợp lệ) như nút gửi của ô nhập.
    return (
        <div className="mt-2 min-w-[200px]">
            <form
                className={`flex items-center gap-1 rounded-[11px] border bg-[var(--yona-chat-field)] py-1 pe-1 ps-3 ${
                    showsError ? 'border-[var(--yona-chat-danger)]' : 'border-[var(--yona-chat-line)]'
                }`}
                onSubmit={event => {
                    event.preventDefault();
                    void onSubmit();
                }}
            >
                <input
                    value={email}
                    type="email"
                    aria-label={t('EMAIL_PLACEHOLDER')}
                    aria-invalid={showsError}
                    placeholder={t('EMAIL_PLACEHOLDER')}
                    className="reset-base min-w-0 flex-1 border-none bg-transparent py-[7px] yona-touch-field text-[var(--yona-chat-ink)] outline-none placeholder:text-[var(--yona-chat-ink-muted)]"
                    onChange={event => {
                        setEmail(event.target.value);
                        setTouched(true);
                    }}
                />
                <button
                    type="submit"
                    aria-label={t('COMPOSER.SEND')}
                    title={t('COMPOSER.SEND')}
                    disabled={isInvalid || isUpdating}
                    className={`relative flex size-9 flex-none items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] active:scale-[0.97] ${
                        isInvalid
                            ? 'cursor-default bg-[var(--yona-chat-send-idle)] text-[var(--yona-chat-on-send-idle)]'
                            : 'bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)]'
                    }`}
                >
                    {isUpdating ? <Spinner /> : <ArrowRightIcon />}
                </button>
            </form>
            {hasSaveFailed ? (
                <p role="alert" className="mt-1 text-[11.5px] leading-[1.4] text-[var(--yona-chat-danger)]">
                    {t('EMAIL_SAVE_FAILED')}
                </p>
            ) : null}
        </div>
    );
}
