import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useBranding } from 'shared/composables/useBranding';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import FormInput from 'v3/components/Form/Input';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ v3/views/auth/reset/password/Index.vue
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordIndex() {
    const { replaceInstallationName } = useBranding();

    const [email, setEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const [showLoading, setShowLoading] = useState(false);

    const emailInvalid = !email || email.length < 4 || !EMAIL_REGEX.test(email);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (emailInvalid) return;

        setShowLoading(true);
        try {
            const response = await postJson<{ message?: string }>('/app/auth/password', { email });
            useAlert(response.message || t('RESET_PASSWORD.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('RESET_PASSWORD.API.ERROR_MESSAGE'));
        } finally {
            setShowLoading(false);
        }
    };

    return (
        <AuthShell>
            <form className={authCard} onSubmit={event => void submit(event)}>
                <h1 className="mb-1 text-2xl font-medium tracking-tight text-left text-n-slate-12">
                    {t('RESET_PASSWORD.TITLE')}
                </h1>
                <p className="mb-4 text-sm font-normal leading-6 tracking-normal text-n-slate-11">
                    {replaceInstallationName(t('RESET_PASSWORD.DESCRIPTION'))}
                </p>
                <div className="space-y-5">
                    <FormInput
                        label=""
                        name="email_address"
                        value={email}
                        placeholder={t('RESET_PASSWORD.EMAIL.PLACEHOLDER')}
                        hasError={touched && emailInvalid}
                        errorMessage={t('RESET_PASSWORD.EMAIL.ERROR')}
                        onChange={event => {
                            setEmail(event.target.value);
                            setTouched(true);
                        }}
                    />
                    <NextButton
                        lg
                        type="submit"
                        data-testid="submit_button"
                        className="w-full"
                        label={t('RESET_PASSWORD.SUBMIT')}
                        disabled={emailInvalid || showLoading}
                        isLoading={showLoading}
                    />
                </div>
                <p className="mt-4 -mb-1 text-sm text-n-slate-11">
                    {t('RESET_PASSWORD.GO_BACK_TO_LOGIN')}{' '}
                    <a href="/app/login" className="text-n-blue-10 font-medium hover:text-n-blue-11">
                        {t('COMMON.CLICK_HERE')}.
                    </a>
                </p>
            </form>
        </AuthShell>
    );
}
