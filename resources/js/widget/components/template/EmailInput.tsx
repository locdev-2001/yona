import { useId, useState } from 'react';

import Loader from 'shared/components/loader/Loader';

import { t } from '../../i18n';
import { widgetStore } from '../../store/widgetStore';
import { ArrowRight, Check, Mail } from '../../../shared/messaging/kit/icons';
import { KitRoot } from '../../../shared/messaging/kit/primitives';

// Luật email của ô xin email: @vuelidate `required` + `email`.
// Regex của @vuelidate/validators 2.0.4 (luật `email`) — giữ nguyên, kể cả nét
// lạ `[A-z]`, để nút mũi tên bật/tắt trùng oracle.
// eslint-disable-next-line no-control-regex
export const EMAIL_PATTERN =
    /^(?:[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[A-z0-9](?:[A-z0-9-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9-]*[A-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[A-z0-9-]*[A-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])$/;

interface EmailInputProps {
    title: string;
    messageId: number | string;
    messageContentAttributes: Record<string, unknown>;
}

/** Tin bot xin email (`input_email`): cùng thẻ thu thông tin một ô của message kit. */
export default function EmailInput({ title, messageId, messageContentAttributes }: EmailInputProps) {
    const inputId = useId();
    const [email, setEmail] = useState('');
    const [isTouched, setTouched] = useState(false);
    const [isUpdating, setUpdating] = useState(false);
    const [hasSaveFailed, setSaveFailed] = useState(false);

    const submitted = messageContentAttributes?.submitted_email;
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

    if (submitted) {
        return (
            <KitRoot>
                <div className="mk-card mk-pad">
                    <div className="mk-row">
                        <span className="mk-tile mk-tile--good">
                            <Check />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="mk-title">{title}</span>
                            <span className="mk-meta mk-truncate">{t('EMAIL_CAPTURE.DONE', { email: String(submitted) })}</span>
                        </span>
                    </div>
                </div>
            </KitRoot>
        );
    }

    return (
        <KitRoot>
            <form
                className="mk-card mk-pad"
                noValidate
                onSubmit={event => {
                    event.preventDefault();
                    void onSubmit();
                }}
            >
                <div className="mk-row">
                    <span className="mk-tile mk-tile--accent">
                        <Mail />
                    </span>
                    <span className="flex min-w-0 flex-col">
                        <span className="mk-title">{title}</span>
                        <span className="mk-meta">{t('EMAIL_CAPTURE.HINT')}</span>
                    </span>
                </div>
                <div className="mk-field">
                    <label className="mk-label" htmlFor={inputId}>
                        {t('EMAIL_CAPTURE.LABEL')}
                    </label>
                    <span className="mk-inline-field">
                        <input
                            id={inputId}
                            value={email}
                            type="email"
                            inputMode="email"
                            aria-invalid={showsError}
                            aria-describedby={hasSaveFailed ? `${inputId}-error` : undefined}
                            placeholder={t('EMAIL_PLACEHOLDER')}
                            className="mk-input reset-base yona-touch-field"
                            onChange={event => {
                                setEmail(event.target.value);
                                setTouched(true);
                            }}
                        />
                        <button type="submit" className="mk-go" aria-label={t('COMPOSER.SEND')} title={t('COMPOSER.SEND')} disabled={isInvalid || isUpdating}>
                            {isUpdating ? <Loader size={16} /> : <ArrowRight />}
                        </button>
                    </span>
                    {hasSaveFailed ? (
                        <span id={`${inputId}-error`} role="alert" className="mk-error">
                            {t('EMAIL_SAVE_FAILED')}
                        </span>
                    ) : null}
                </div>
            </form>
        </KitRoot>
    );
}
