import { useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../../../../types';

import { t } from '../../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import FormInput from 'v3/components/Form/Input';
import OAuthButtons from 'v3/components/OAuthButtons';
import NextButton from 'dashboard/components-next/button/Button';
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH, isValidPassword } from 'v3/views/auth/passwordRules';
import PasswordRequirements from './PasswordRequirements';

// Port từ v3/views/auth/signup/components/Signup/Form.vue
// Bỏ hCaptcha; business-email validator của bản cloud thay bằng validate email
// thường (SME VN dùng gmail phổ biến).
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Tên tài khoản không lấy từ tên miền email (mọi tài khoản gmail thành "Gmail"):
// server mặc định theo tên người dùng, khách đổi ở bước onboarding.
function fullNameFromEmail(email: string) {
    return capitalize(email.split('@')[0].split('+')[0]);
}

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
        router.post(
            '/app/auth/signup',
            {
                user_full_name: fullNameFromEmail(credentials.email),
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
