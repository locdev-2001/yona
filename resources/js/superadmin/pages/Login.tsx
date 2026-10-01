import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';

import Login from '@admin/views/pages/auth/login';
import LoginForm from '@admin/views/pages/auth/login/login-form';
import TwoSteps from '@admin/views/pages/auth/two-steps';
import TwoStepsForm from '@admin/views/pages/auth/two-steps/two-steps-form';

import { t } from '../../i18n';
import { useConsoleLabels } from '../labels';
import type { SuperAdminPageProps } from '../types';

interface SuperAdminLoginPageProps extends SuperAdminPageProps {
    otpRequired?: boolean;
    otpToken?: string;
    otpError?: string | null;
}

// Đăng nhập console: email + mật khẩu, rồi bước OTP (hoặc mã dự phòng) khi tài
// khoản đã bật 2FA — máy chủ trả lại trang này kèm otpRequired + otpToken.
export default function SuperAdminLogin() {
    const { flash, otpRequired, otpToken, otpError } = usePage<SuperAdminLoginPageProps>().props;
    const { data, setData, post, processing } = useForm({
        super_admin: { email: '', password: '' },
    });
    const label = useConsoleLabels();
    const [verifying, setVerifying] = useState(false);
    const [dismissedOtp, setDismissedOtp] = useState(false);

    const showOtp = Boolean(otpRequired && otpToken) && !dismissedOtp;

    const submitOtp = (payload: { otpCode?: string; backupCode?: string }) => {
        setVerifying(true);
        router.post(
            '/admin/sign_in',
            {
                otp_token: otpToken,
                otp_code: payload.otpCode ?? '',
                backup_code: payload.backupCode ?? '',
            },
            { onFinish: () => setVerifying(false) },
        );
    };

    if (showOtp) {
        return (
            <>
                <Head title={label('login_title')} />
                <TwoSteps title={t('MFA_VERIFICATION.TITLE')} description={t('MFA_VERIFICATION.DESCRIPTION')}>
                    <TwoStepsForm
                        isVerifying={verifying}
                        errorMessage={otpError}
                        labels={{
                            otpCode: t('MFA_VERIFICATION.ENTER_OTP_CODE'),
                            backupCode: t('MFA_VERIFICATION.ENTER_BACKUP_CODE'),
                            backupCodePlaceholder: t('MFA_VERIFICATION.BACKUP_CODE_PLACEHOLDER'),
                            useBackupCode: t('MFA_VERIFICATION.BACKUP_CODE'),
                            useAuthenticator: t('MFA_VERIFICATION.AUTHENTICATOR_APP'),
                            submit: t('MFA_VERIFICATION.VERIFY_BUTTON'),
                            cancel: t('MFA_VERIFICATION.CANCEL_LOGIN'),
                        }}
                        onVerify={submitOtp}
                        onCancel={() => setDismissedOtp(true)}
                    />
                </TwoSteps>
            </>
        );
    }

    return (
        <>
            <Head title={label('login_title')} />
            <Login title={label('login_title')} description={label('login_description')}>
                <LoginForm
                    id="new_super_admin"
                    email={data.super_admin.email}
                    password={data.super_admin.password}
                    error={flash?.error}
                    processing={processing}
                    labels={{
                        email: label('login_email'),
                        emailPlaceholder: label('login_email_placeholder'),
                        password: label('login_password'),
                        submit: label('login_submit'),
                        showPassword: label('show_secret'),
                        hidePassword: label('hide_secret'),
                    }}
                    onEmailChange={email => setData('super_admin', { ...data.super_admin, email })}
                    onPasswordChange={password => setData('super_admin', { ...data.super_admin, password })}
                    onSubmit={() => post('/admin/sign_in')}
                />
            </Login>
        </>
    );
}

SuperAdminLogin.layout = null;
