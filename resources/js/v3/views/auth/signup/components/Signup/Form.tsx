import { useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../../../../types';

import { t } from '../../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import FormInput from 'v3/components/Form/Input';
import OAuthButtons from 'v3/components/OAuthButtons';
import NextButton from 'dashboard/components-next/button/Button';
import PasswordRequirements from './PasswordRequirements';

// Port từ v3/views/auth/signup/components/Signup/Form.vue
// Bỏ hCaptcha; business-email validator của bản cloud thay bằng validate email
// thường (SME VN dùng gmail phổ biến).
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|'"/\\.,`<>:;?~]/;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Port từ v3/helpers/AuthHelper.js getCredentialsFromEmail
function getCredentialsFromEmail(email: string) {
    const [localPart, domain] = email.split('@');
    const namePart = localPart.split('+')[0];
    return {
        fullName: capitalize(namePart),
        accountName: capitalize(domain.split('.')[0]),
    };
}

const isValidPassword = (value: string) =>
    /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && SPECIAL_CHAR_REGEX.test(value);

interface SignupPageProps extends SharedPageProps {
    oauthProviders?: string[];
}

export default function SignupForm() {
    const { globalConfig, oauthProviders } = usePage<SignupPageProps>().props;
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isPasswordFocused, setPasswordFocused] = useState(false);
    const [isSignupInProgress, setSignupInProgress] = useState(false);

    const emailInvalid = !credentials.email || !EMAIL_REGEX.test(credentials.email);
    const passwordInvalid =
        !credentials.password ||
        credentials.password.length < MIN_PASSWORD_LENGTH ||
        !isValidPassword(credentials.password);

    const isFormValid = !emailInvalid && !passwordInvalid;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched({ email: true, password: true });
        if (isSignupInProgress || !isFormValid) return;

        setSignupInProgress(true);
        const { fullName, accountName } = getCredentialsFromEmail(credentials.email);

        router.post(
            '/app/auth/signup',
            {
                account_name: accountName,
                user_full_name: fullName,
                email: credentials.email,
                password: credentials.password,
            },
            {
                onError: pageErrors => {
                    useAlert(pageErrors.email || pageErrors.password || t('REGISTER.API.ERROR_MESSAGE'));
                },
                onFinish: () => setSignupInProgress(false),
            },
        );
    };

    return (
        <div className="flex-1">
            <OAuthButtons providers={oauthProviders} />
            <form className="space-y-3" onSubmit={submit}>
                <FormInput
                    value={credentials.email}
                    onChange={event => setCredentials(current => ({ ...current, email: event.target.value }))}
                    type="email"
                    name="email_address"
                    label={t('REGISTER.EMAIL.LABEL')}
                    placeholder={t('REGISTER.EMAIL.PLACEHOLDER')}
                    hasError={touched.email && emailInvalid}
                    errorMessage={t('REGISTER.EMAIL.ERROR')}
                    onBlur={() => setTouched(current => ({ ...current, email: true }))}
                />
                <div className="relative">
                    <FormInput
                        value={credentials.password}
                        onChange={event => setCredentials(current => ({ ...current, password: event.target.value }))}
                        type="password"
                        name="password"
                        label={t('LOGIN.PASSWORD.LABEL')}
                        placeholder={t('SET_NEW_PASSWORD.PASSWORD.PLACEHOLDER')}
                        hasError={touched.password && passwordInvalid}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => {
                            setPasswordFocused(false);
                            setTouched(current => ({ ...current, password: true }));
                        }}
                    />
                    {isPasswordFocused ? <PasswordRequirements password={credentials.password} /> : null}
                </div>
                <NextButton
                    lg
                    type="submit"
                    data-testid="submit_button"
                    className="w-full font-medium"
                    label={t('REGISTER.SUBMIT')}
                    disabled={isSignupInProgress || !isFormValid}
                    isLoading={isSignupInProgress}
                />
            </form>
            <p
                className="text-sm mt-5 mb-0 text-n-slate-11 [&>a]:text-n-blue-10 [&>a]:font-medium [&>a]:hover:text-n-blue-11"
                dangerouslySetInnerHTML={{
                    __html: t('REGISTER.TERMS_ACCEPT', {
                        termsURL: globalConfig.termsURL,
                        privacyURL: globalConfig.privacyURL,
                    }),
                }}
            />
        </div>
    );
}
