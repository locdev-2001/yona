import { useState } from 'react';

import Spinner from 'shared/components/Spinner';

import { getContrastingTextColor } from '../../helpers/colorHelper';
import { t } from '../../i18n';
import { useWidgetState } from '../../store/hooks';
import { widgetStore } from '../../store/widgetStore';
import { ChevronRightIcon } from '../icons';

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
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const [email, setEmail] = useState('');
    const [isTouched, setTouched] = useState(false);
    const [isUpdating, setUpdating] = useState(false);

    const hasSubmitted = Boolean(messageContentAttributes?.submitted_email);
    if (hasSubmitted) return <div />;

    const isInvalid = !email || !EMAIL_PATTERN.test(email);
    const textColor = getContrastingTextColor(widgetColor);

    const onSubmit = async () => {
        if (isInvalid) return;
        setUpdating(true);
        try {
            await widgetStore.updateMessage({ messageId, email });
        } catch {
            // Bỏ qua như bản gốc.
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div>
            <form
                className="email-input-group h-10 flex my-2 mx-0 min-w-[200px]"
                onSubmit={event => {
                    event.preventDefault();
                    void onSubmit();
                }}
            >
                <input
                    value={email}
                    type="email"
                    placeholder={t('EMAIL_PLACEHOLDER')}
                    className={isTouched && isInvalid ? 'error' : undefined}
                    onChange={event => {
                        setEmail(event.target.value);
                        setTouched(true);
                    }}
                />
                <button
                    className="button small"
                    disabled={isInvalid}
                    style={{ background: widgetColor, borderColor: widgetColor, color: textColor }}
                >
                    {isUpdating ? <Spinner className="mx-2" /> : <ChevronRightIcon />}
                </button>
            </form>
        </div>
    );
}
