import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, putJson } from 'dashboard/helper/apiClient';
import FormInput from 'v3/components/Form/Input';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import NextButton from 'dashboard/components-next/button/Button';
import type { SharedPageProps } from '../../../../types';

// Port từ v3/views/auth/password/Edit.vue (đường "Accept invitation" của agent
// được mời cũng đi qua màn này — API xác nhận tài khoản luôn).
interface PasswordEditProps extends SharedPageProps {
    resetPasswordToken: string;
}

export default function PasswordEdit() {
    const { resetPasswordToken } = usePage<PasswordEditProps>().props;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [touched, setTouched] = useState({ password: false, confirmPassword: false });
    const [showLoading, setShowLoading] = useState(false);

    const passwordInvalid = password.length < 6;
    const confirmPasswordInvalid = confirmPassword.length < 6 || confirmPassword !== password;

    const submitForm = async (event: FormEvent) => {
        event.preventDefault();
        setTouched({ password: true, confirmPassword: true });
        if (passwordInvalid || confirmPasswordInvalid) return;

        setShowLoading(true);
        try {
            await putJson('/app/auth/password', {
                reset_password_token: resetPasswordToken,
                password,
                password_confirmation: confirmPassword,
            });
            window.location.href = '/app';
        } catch (error) {
            setShowLoading(false);
            useAlert(parseApiErrorMessage(error) || t('SET_NEW_PASSWORD.API.ERROR_MESSAGE'));
        }
    };

    return (
        <AuthShell>
            <form className={authCard} onSubmit={event => void submitForm(event)}>
                <h1 className="mb-1 text-2xl font-medium tracking-tight text-left text-n-slate-12">
                    {t('SET_NEW_PASSWORD.TITLE')}
                </h1>

                <div className="space-y-5">
                    <FormInput
                        className="mt-3"
                        name="password"
                        type="password"
                        label=""
                        placeholder={t('SET_NEW_PASSWORD.PASSWORD.PLACEHOLDER')}
                        value={password}
                        hasError={touched.password && passwordInvalid}
                        errorMessage={t('SET_NEW_PASSWORD.PASSWORD.ERROR')}
                        onChange={event => setPassword(event.target.value)}
                        onBlur={() => setTouched(current => ({ ...current, password: true }))}
                    />
                    <FormInput
                        className="mt-3"
                        name="confirm_password"
                        type="password"
                        label=""
                        placeholder={t('SET_NEW_PASSWORD.CONFIRM_PASSWORD.PLACEHOLDER')}
                        value={confirmPassword}
                        hasError={touched.confirmPassword && confirmPasswordInvalid}
                        errorMessage={t('SET_NEW_PASSWORD.CONFIRM_PASSWORD.ERROR')}
                        onChange={event => setConfirmPassword(event.target.value)}
                        onBlur={() => setTouched(current => ({ ...current, confirmPassword: true }))}
                    />
                    <NextButton
                        lg
                        type="submit"
                        data-testid="submit_button"
                        className="w-full"
                        label={t('SET_NEW_PASSWORD.SUBMIT')}
                        disabled={passwordInvalid || confirmPasswordInvalid || showLoading}
                        isLoading={showLoading}
                    />
                </div>
            </form>
        </AuthShell>
    );
}
