import { useState } from 'react';
import type { FormEvent } from 'react';
import { router } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import FormInput from 'v3/components/Form/Input';
import WithLabel from 'v3/components/Form/WithLabel';
import NextButton from 'dashboard/components-next/button/Button';
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH, isValidPassword } from 'v3/views/auth/passwordRules';
import PasswordRequirements from 'v3/views/auth/signup/components/Signup/PasswordRequirements';

export default function SignupJoinForm({ token }: { token: string }) {
    const [fields, setFields] = useState({ name: '', email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isPasswordFocused, setPasswordFocused] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);

    const emailInvalid = !fields.email || !EMAIL_REGEX.test(fields.email);
    const passwordInvalid =
        !fields.password || fields.password.length < MIN_PASSWORD_LENGTH || !isValidPassword(fields.password);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched({ email: true, password: true });
        if (isSubmitting || emailInvalid || passwordInvalid) return;

        setSubmitting(true);
        router.post(
            `/invite/${token}`,
            { name: fields.name, email: fields.email, password: fields.password },
            {
                onError: pageErrors => {
                    useAlert(pageErrors.email || pageErrors.password || t('INVITE_LINKS.API.ERROR_MESSAGE'));
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <form className="space-y-3 w-full" onSubmit={submit}>
            <FormInput
                value={fields.name}
                onChange={event => setFields(current => ({ ...current, name: event.target.value }))}
                type="text"
                name="name"
                label={t('INVITE_LINKS.PAGE.SIGNUP.NAME.LABEL')}
                placeholder={t('INVITE_LINKS.PAGE.SIGNUP.NAME.PLACEHOLDER')}
            />
            <FormInput
                value={fields.email}
                onChange={event => setFields(current => ({ ...current, email: event.target.value }))}
                type="email"
                name="email"
                label={t('INVITE_LINKS.PAGE.SIGNUP.EMAIL.LABEL')}
                placeholder={t('INVITE_LINKS.PAGE.SIGNUP.EMAIL.PLACEHOLDER')}
                hasError={touched.email && emailInvalid}
                errorMessage={t('INVITE_LINKS.PAGE.SIGNUP.EMAIL.ERROR')}
                onBlur={() => setTouched(current => ({ ...current, email: true }))}
            />
            <div className="relative">
                <WithLabel
                    label={t('INVITE_LINKS.PAGE.SIGNUP.PASSWORD.LABEL')}
                    name="password"
                    hasError={touched.password && passwordInvalid}
                >
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={fields.password}
                        placeholder={t('INVITE_LINKS.PAGE.SIGNUP.PASSWORD.PLACEHOLDER')}
                        className="block w-full border-none rounded-md shadow-sm bg-n-alpha-black2 appearance-none outline outline-1 focus:outline focus:outline-1 text-n-slate-12 placeholder:text-n-slate-10 sm:text-sm sm:leading-6 px-3 py-3 outline-n-weak hover:outline-n-slate-6 focus:outline-n-brand"
                        onChange={event => setFields(current => ({ ...current, password: event.target.value }))}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => {
                            setPasswordFocused(false);
                            setTouched(current => ({ ...current, password: true }));
                        }}
                    />
                </WithLabel>
                {isPasswordFocused ? <PasswordRequirements password={fields.password} /> : null}
            </div>
            <NextButton
                lg
                type="submit"
                className="w-full font-medium"
                label={t('INVITE_LINKS.PAGE.SIGNUP.SUBMIT')}
                disabled={isSubmitting || emailInvalid || passwordInvalid}
                isLoading={isSubmitting}
            />
        </form>
    );
}
