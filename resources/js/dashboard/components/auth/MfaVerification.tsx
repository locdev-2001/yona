import { useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';

import { t } from '../../../i18n';
import { handleOtpPaste } from 'shared/helpers/clipboard';
import Icon from 'dashboard/components-next/icon/Icon';
import FormInput from 'v3/components/Form/Input';
import NextButton from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

// Port từ dashboard/components/auth/MfaVerification.vue. Chatwoot gọi thẳng
// axios POST /auth/sign_in; ở đây trang đăng nhập giữ việc gửi (Inertia).
const OTP = 'otp';
const BACKUP = 'backup';

interface MfaVerificationProps {
    isVerifying: boolean;
    errorMessage: string;
    onVerify: (payload: { otpCode?: string; backupCode?: string }) => void;
    onCancel: () => void;
}

export default function MfaVerification({
    isVerifying,
    errorMessage,
    onVerify,
    onCancel,
}: MfaVerificationProps) {
    const [verificationMethod, setVerificationMethod] = useState<typeof OTP | typeof BACKUP>(OTP);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [backupCode, setBackupCode] = useState('');
    const helpModalRef = useRef<DialogHandle>(null);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const otpCode = otpDigits.join('');
    const canSubmit = verificationMethod === OTP ? otpCode.length === 6 : backupCode.length === 8;

    const focusInput = (index: number) => otpInputRefs.current[index]?.focus();

    // Gốc xoá ô nhập khi server báo lỗi; ở đây xoá ngay lúc gửi — nhìn thấy như
    // nhau (gửi đúng thì chuyển trang) và tránh lần thử sau tự gửi mã cũ.
    const clearInputs = () => {
        setOtpDigits(['', '', '', '', '', '']);
        setBackupCode('');
        focusInput(0);
    };

    const submit = (code = otpCode) => {
        if (isVerifying) return;
        if (verificationMethod === OTP) {
            if (code.length !== 6) return;
            onVerify({ otpCode: code });
        } else {
            if (!backupCode) return;
            onVerify({ backupCode });
        }
        clearInputs();
    };

    const handleOtpInput = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const digits = [...otpDigits];
        digits[index] = value;
        setOtpDigits(digits);

        if (value && index < 5) focusInput(index + 1);

        const joined = digits.join('');
        if (joined.length === 6) submit(joined);
    };

    const handleBackspace = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (!otpDigits[index] && index > 0) {
            event.preventDefault();
            focusInput(index - 1);
            const digits = [...otpDigits];
            digits[index - 1] = '';
            setOtpDigits(digits);
        }
    };

    const handleOtpCodePaste = (event: ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const code = handleOtpPaste(event, 6);
        if (code) {
            setOtpDigits(code.split(''));
            submit(code);
        }
    };

    const handleTryAnotherMethod = () => {
        setVerificationMethod(current => (current === OTP ? BACKUP : OTP));
        setOtpDigits(['', '', '', '', '', '']);
        setBackupCode('');
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        submit();
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white shadow sm:mx-auto sm:w-full sm:max-w-lg dark:bg-n-solid-2 p-11 sm:shadow-lg sm:rounded-lg">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center size-14 bg-n-solid-1 outline outline-n-weak rounded-full mb-4">
                        <Icon icon="i-lucide-lock-keyhole" className="size-6 text-n-slate-10" />
                    </div>
                    <h2 className="text-2xl font-semibold text-n-slate-12">{t('MFA_VERIFICATION.TITLE')}</h2>
                    <p className="text-sm text-n-slate-11 mt-2">{t('MFA_VERIFICATION.DESCRIPTION')}</p>
                </div>

                <div className="flex rounded-lg bg-n-alpha-black2 p-1 mb-6">
                    {[OTP, BACKUP].map(method => (
                        <button
                            key={method}
                            type="button"
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                                verificationMethod === method
                                    ? 'bg-n-solid-active text-n-slate-12 shadow-sm'
                                    : 'text-n-slate-12'
                            }`}
                            onClick={() => setVerificationMethod(method as typeof OTP | typeof BACKUP)}
                        >
                            {method === OTP
                                ? t('MFA_VERIFICATION.AUTHENTICATOR_APP')
                                : t('MFA_VERIFICATION.BACKUP_CODE')}
                        </button>
                    ))}
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {verificationMethod === OTP ? (
                        <div>
                            <label className="block text-sm font-medium text-n-slate-12 mb-2">
                                {t('MFA_VERIFICATION.ENTER_OTP_CODE')}
                            </label>
                            <div className="flex justify-between gap-2">
                                {otpDigits.map((digit, index) => (
                                    <input
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={index}
                                        ref={element => {
                                            otpInputRefs.current[index] = element;
                                        }}
                                        value={digit}
                                        type="text"
                                        maxLength={1}
                                        pattern="[0-9]"
                                        inputMode="numeric"
                                        className="w-12 h-12 text-center text-lg font-semibold border-2 border-n-weak hover:border-n-strong rounded-lg focus:border-n-brand bg-n-alpha-black2 text-n-slate-12 placeholder:text-n-slate-10"
                                        onChange={event => handleOtpInput(index, event.target.value)}
                                        onKeyDown={event => {
                                            if (event.key === 'ArrowLeft') {
                                                event.preventDefault();
                                                focusInput(index - 1);
                                            }
                                            if (event.key === 'ArrowRight') {
                                                event.preventDefault();
                                                focusInput(index + 1);
                                            }
                                            if (event.key === 'Backspace') handleBackspace(event, index);
                                        }}
                                        onPaste={handleOtpCodePaste}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <FormInput
                                value={backupCode}
                                onChange={event => setBackupCode(event.target.value)}
                                name="backup_code"
                                type="text"
                                data-testid="backup_code_input"
                                tabIndex={1}
                                required
                                label={t('MFA_VERIFICATION.ENTER_BACKUP_CODE')}
                                placeholder={t('MFA_VERIFICATION.BACKUP_CODE_PLACEHOLDER')}
                            />
                        </div>
                    )}

                    {errorMessage ? (
                        <div className="p-3 bg-n-ruby-3 outline outline-n-ruby-5 outline-1 rounded-lg">
                            <p className="text-sm text-n-ruby-9">{errorMessage}</p>
                        </div>
                    ) : null}

                    <NextButton
                        lg
                        type="submit"
                        data-testid="submit_button"
                        className="w-full"
                        tabIndex={2}
                        label={t('MFA_VERIFICATION.VERIFY_BUTTON')}
                        disabled={!canSubmit || isVerifying}
                        isLoading={isVerifying}
                    />

                    <div className="text-center flex items-center flex-col gap-2 pt-4">
                        <NextButton
                            sm
                            link
                            type="button"
                            className="w-full hover:!no-underline"
                            tabIndex={2}
                            label={t('MFA_VERIFICATION.TRY_ANOTHER_METHOD')}
                            onClick={handleTryAnotherMethod}
                        />
                        <NextButton
                            sm
                            slate
                            link
                            type="button"
                            className="w-full hover:!no-underline"
                            tabIndex={3}
                            label={t('MFA_VERIFICATION.CANCEL_LOGIN')}
                            onClick={onCancel}
                        />
                    </div>
                </form>
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm text-n-slate-11">{t('MFA_VERIFICATION.HELP_TEXT')}</p>
                <NextButton
                    sm
                    link
                    type="button"
                    className="w-full hover:!no-underline"
                    tabIndex={4}
                    label={t('MFA_VERIFICATION.LEARN_MORE')}
                    onClick={() => helpModalRef.current?.open()}
                />
            </div>

            <Dialog
                ref={helpModalRef}
                title={t('MFA_VERIFICATION.HELP_MODAL.TITLE')}
                showConfirmButton={false}
                onConfirm={() => helpModalRef.current?.close()}
            >
                <div className="space-y-4 text-sm text-n-slate-11">
                    {['AUTHENTICATOR', 'BACKUP'].map(section => (
                        <div key={section}>
                            <h4 className="font-medium text-n-slate-12 mb-2">
                                {t(`MFA_VERIFICATION.HELP_MODAL.${section}_TITLE`)}
                            </h4>
                            <p>{t(`MFA_VERIFICATION.HELP_MODAL.${section}_DESC`)}</p>
                        </div>
                    ))}
                    <div>
                        <h4 className="font-medium text-n-slate-12 mb-2">
                            {t('MFA_VERIFICATION.HELP_MODAL.CONTACT_TITLE')}
                        </h4>
                        <p>{t('MFA_VERIFICATION.HELP_MODAL.CONTACT_DESC_SELF_HOSTED')}</p>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
