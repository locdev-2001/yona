import { useState } from 'react';
import type { FormEvent } from 'react';
import { router } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import FormInput from 'v3/components/Form/Input';
import WithLabel from 'v3/components/Form/WithLabel';
import NextButton from 'dashboard/components-next/button/Button';

// Người chưa có tài khoản: ký mật khẩu ngay trên trang mời, không qua bước xác
// nhận email riêng (docs/ux-decisions.md — tin cậy như email invite tự confirm
// khi đặt mật khẩu). Cùng luật mật khẩu với Signup/Form.tsx.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|'"/\\.,`<>:;?~]/;
const MIN_PASSWORD_LENGTH = 6;

const isValidPassword = (value: string) =>
    /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && SPECIAL_CHAR_REGEX.test(value);

export default function SignupJoinForm({ token }: { token: string }) {
    const [fields, setFields] = useState({ name: '', email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
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
                    useAlert(
                        pageErrors.email || pageErrors.password || t('INVITE_LINKS.PAGE.API.ERROR_MESSAGE'),
                    );
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
            {/* Không dùng FormInput ở đây: nút hiện/ẩn mật khẩu của nó rộng
                26px, dưới ngưỡng đích chạm 44px trên điện thoại (đo bằng
                scripts/check-ui.py). Trang mời chỉ dùng một lần, bỏ tiện ích
                hiện mật khẩu không đổi giá trị chấp nhận. */}
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
                    onBlur={() => setTouched(current => ({ ...current, password: true }))}
                />
            </WithLabel>
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
