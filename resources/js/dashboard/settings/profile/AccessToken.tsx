import { useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import ConfirmButton from 'dashboard/components-next/button/ConfirmButton';
import Icon from 'dashboard/components-next/icon/Icon';

// Port từ settings/profile/AccessToken.vue — ô token che mặc định + Copy +
// Reset (2 bước xác nhận). B1 dùng cho webhook secret của inbox API; trang
// profile gắn lại ở F8.
interface AccessTokenProps {
    value: string;
    showResetButton?: boolean;
    disabled?: boolean;
    onCopy: (value: string) => void;
    onReset?: () => void;
}

export default function AccessToken({
    value,
    showResetButton = true,
    disabled = false,
    onCopy,
    onReset,
}: AccessTokenProps) {
    const [isMasked, setMasked] = useState(true);

    return (
        <div className="flex flex-row justify-between gap-4">
            <label className="input-container flex-1 relative">
                <input
                    name="access_token"
                    type={isMasked ? 'password' : 'text'}
                    value={value}
                    disabled={disabled}
                    readOnly
                    className="!py-1.5 ltr:!pr-9 ltr:!pl-3 rtl:!pl-9 rtl:!pr-3 cursor-not-allowed"
                    style={{ borderRadius: '12px', fontSize: '14px', marginBottom: '2px' }}
                    onChange={() => undefined}
                />
                <button
                    className="absolute top-0 bottom-0 ltr:right-0.5 rtl:left-0.5 px-2"
                    type="button"
                    disabled={disabled}
                    onClick={() => setMasked(masked => !masked)}
                >
                    <Icon icon={isMasked ? 'i-lucide-eye-off' : 'i-lucide-eye'} className="size-4 text-n-slate-11" />
                </button>
            </label>
            <div className="flex flex-row gap-2">
                <Button
                    label={t('PROFILE_SETTINGS.FORM.ACCESS_TOKEN.COPY')}
                    slate
                    outline
                    type="button"
                    icon="i-lucide-copy"
                    className="rounded-xl"
                    disabled={disabled}
                    onClick={() => onCopy(value)}
                />
                {showResetButton && onReset ? (
                    <ConfirmButton
                        label={t('PROFILE_SETTINGS.FORM.ACCESS_TOKEN.RESET')}
                        confirmLabel={t('PROFILE_SETTINGS.FORM.ACCESS_TOKEN.CONFIRM_RESET')}
                        confirmHint={t('PROFILE_SETTINGS.FORM.ACCESS_TOKEN.CONFIRM_HINT')}
                        color="slate"
                        confirmColor="ruby"
                        variant="outline"
                        icon="i-lucide-key-round"
                        className="rounded-xl"
                        disabled={disabled}
                        onClick={onReset}
                    />
                ) : null}
            </div>
        </div>
    );
}
