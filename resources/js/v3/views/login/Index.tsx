import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useBranding } from 'shared/composables/useBranding';
import FormInput from 'v3/components/Form/Input';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import NextButton from 'dashboard/components-next/button/Button';
import type { SharedPageProps } from '../../../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Port từ v3/views/login/Index.vue (Google OAuth + SAML + MFA + session limit
// chưa port — chưa có ở A1, xem bảng trace).
export default function LoginIndex() {
    const { globalConfig, errors } = usePage<SharedPageProps>().props;
    const { replaceInstallationName } = useBranding();

    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [showLoading, setShowLoading] = useState(false);
    const [hasErrored, setHasErrored] = useState(false);

    const emailInvalid = !credentials.email || !EMAIL_REGEX.test(credentials.email);
    const passwordInvalid = !credentials.password;

    useEffect(() => {
        document.title = replaceInstallationName(t('LOGIN.TITLE'));
    }, [replaceInstallationName]);

    const submitLogin = () => {
        setHasErrored(false);
        setShowLoading(true);

        router.post(
            '/app/login',
            { email: credentials.email, password: credentials.password },
            {
                onError: pageErrors => {
                    setShowLoading(false);
                    setHasErrored(true);
                    useAlert(pageErrors.email || pageErrors.password || t('LOGIN.API.UNAUTH'));
                },
                onSuccess: () => {
                    useAlert(t('LOGIN.API.SUCCESS_MESSAGE'));
                },
            },
        );
    };

    const submitFormLogin = (event: FormEvent) => {
        event.preventDefault();
        if (emailInvalid) {
            useAlert(t('LOGIN.EMAIL.ERROR'));
            return;
        }
        submitLogin();
    };

    return (
        <main className="flex flex-col w-full min-h-screen py-20 bg-n-brand/5 dark:bg-n-background sm:px-6 lg:px-8">
            <section className="max-w-5xl mx-auto">
                <img
                    src={globalConfig.logo}
                    alt={globalConfig.installationName}
                    className="block w-auto h-8 mx-auto dark:hidden"
                />
                {globalConfig.logoDark ? (
                    <img
                        src={globalConfig.logoDark}
                        alt={globalConfig.installationName}
                        className="hidden w-auto h-8 mx-auto dark:block"
                    />
                ) : null}
                <h2 className="mt-6 text-3xl font-medium text-center text-n-slate-12">
                    {replaceInstallationName(t('LOGIN.TITLE'))}
                </h2>
                {globalConfig.signupEnabled ? (
                    <p className="mt-3 text-sm text-center text-n-slate-11">
                        {t('COMMON.OR')}{' '}
                        <a href="/app/auth/signup" className="lowercase text-link text-n-brand">
                            {t('LOGIN.CREATE_NEW_ACCOUNT')}
                        </a>
                    </p>
                ) : null}
            </section>

            <section
                className={`bg-white shadow sm:mx-auto mt-11 sm:w-full sm:max-w-lg dark:bg-n-solid-2 p-11 sm:shadow-lg sm:rounded-lg mb-8 mt-15 ${
                    hasErrored ? 'animate-wiggle' : ''
                }`}
            >
                <form className="space-y-5" onSubmit={submitFormLogin}>
                    <FormInput
                        value={credentials.email}
                        onChange={event => {
                            setCredentials(current => ({ ...current, email: event.target.value }));
                            setTouched(current => ({ ...current, email: true }));
                        }}
                        name="email_address"
                        type="text"
                        data-testid="email_input"
                        tabIndex={1}
                        required
                        label={t('LOGIN.EMAIL.LABEL')}
                        placeholder={t('LOGIN.EMAIL.PLACEHOLDER')}
                        hasError={(touched.email && emailInvalid) || Boolean(errors?.email)}
                    />
                    <FormInput
                        value={credentials.password}
                        onChange={event => {
                            setCredentials(current => ({ ...current, password: event.target.value }));
                            setTouched(current => ({ ...current, password: true }));
                        }}
                        type="password"
                        name="password"
                        data-testid="password_input"
                        required
                        tabIndex={2}
                        label={t('LOGIN.PASSWORD.LABEL')}
                        placeholder={t('LOGIN.PASSWORD.PLACEHOLDER')}
                        hasError={touched.password && passwordInvalid}
                        rightOfLabel={
                            <p>
                                <a href="/app/auth/reset/password" className="text-sm text-link" tabIndex={4}>
                                    {t('LOGIN.FORGOT_PASSWORD')}
                                </a>
                            </p>
                        }
                    />
                    <NextButton
                        lg
                        type="submit"
                        data-testid="submit_button"
                        className="w-full"
                        tabIndex={3}
                        label={t('LOGIN.SUBMIT')}
                        disabled={showLoading}
                        isLoading={showLoading}
                    />
                </form>
            </section>
            <SnackbarContainer />
        </main>
    );
}
