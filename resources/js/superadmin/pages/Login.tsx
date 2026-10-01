import { useState } from 'react';
import type { ReactNode } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';

import MfaVerification from 'dashboard/components/auth/MfaVerification';
import type { SuperAdminPageProps } from '../types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, Input } from '../ui/Input';
import { useConsoleLabels } from '../ui/labels';

interface SuperAdminLoginPageProps extends SuperAdminPageProps {
    otpRequired?: boolean;
    otpToken?: string;
    otpError?: string | null;
}

// Bước OTP sau mật khẩu khi tài khoản đã bật 2FA — cùng component
// MfaVerification với màn đăng nhập agent (v3/views/login/Index.tsx).
export default function SuperAdminLogin() {
    const { flash, superAdmin, otpRequired, otpToken, otpError } = usePage<SuperAdminLoginPageProps>().props;
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
            <AuthShell title={label('login_title')}>
                <MfaVerification
                    isVerifying={verifying}
                    errorMessage={otpError ?? ''}
                    onVerify={submitOtp}
                    onCancel={() => setDismissedOtp(true)}
                />
            </AuthShell>
        );
    }

    return (
        <AuthShell title={label('login_title')}>
            <div className="flex flex-col items-center gap-3 text-center">
                <img src={superAdmin.logo} alt={superAdmin.installationName} className="h-8 w-auto" />
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-console-foreground">{label('login_title')}</h1>
                    <p className="mt-1 text-sm text-console-muted-foreground">{label('login_description')}</p>
                </div>
            </div>
            <Card className="mt-6 px-6 py-6 sm:px-8">
                {flash?.error ? <Alert tone="destructive">{flash.error}</Alert> : null}
                <form
                    id="new_super_admin"
                    className="flex flex-col gap-4"
                    onSubmit={event => {
                        event.preventDefault();
                        post('/admin/sign_in');
                    }}
                >
                    <Field label={label('login_email')} htmlFor="super_admin_email">
                        <Input
                            autoFocus
                            autoComplete="email"
                            placeholder={label('login_email_placeholder')}
                            type="email"
                            id="super_admin_email"
                            className="h-10"
                            value={data.super_admin.email}
                            onChange={event => setData('super_admin', { ...data.super_admin, email: event.target.value })}
                        />
                    </Field>
                    <Field label={label('login_password')} htmlFor="super_admin_password">
                        <Input
                            autoComplete="current-password"
                            type="password"
                            id="super_admin_password"
                            className="h-10"
                            value={data.super_admin.password}
                            onChange={event => setData('super_admin', { ...data.super_admin, password: event.target.value })}
                        />
                    </Field>
                    <Button type="submit" size="lg" disabled={processing} className="mt-2 w-full">
                        {label('login_submit')}
                    </Button>
                </form>
            </Card>
        </AuthShell>
    );
}

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-console-background px-4 py-12">
            <Head title={title} />
            <div className="w-full max-w-sm">{children}</div>
        </main>
    );
}

SuperAdminLogin.layout = null;
