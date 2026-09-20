import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import NextButton from 'dashboard/components-next/button/Button';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import { BrandMark } from '../../../components/BrandMark';
import type { SharedPageProps } from '../../../../types';

interface VerifyEmailProps extends SharedPageProps {
    email: string;
}

// Port từ v3/views/auth/verify-email/Index.vue (bỏ hCaptcha)
export default function VerifyEmailIndex() {
    const { email } = usePage<VerifyEmailProps>().props;
    const [isResendingEmail, setResendingEmail] = useState(false);

    const handleResendEmail = () => {
        if (isResendingEmail) return;
        setResendingEmail(true);
        router.post(
            '/app/auth/verify-email/resend',
            { email },
            {
                onSuccess: () => useAlert(t('REGISTER.VERIFY_EMAIL.RESEND_SUCCESS')),
                onError: () => useAlert(t('REGISTER.VERIFY_EMAIL.RESEND_ERROR')),
                onFinish: () => setResendingEmail(false),
            },
        );
    };

    return (
        <AuthShell>
            <section className={authCard}>
                <div className="mb-6">
                    <BrandMark className="h-7" />
                    <h2 className="mt-6 text-2xl font-semibold text-n-slate-12">{t('REGISTER.VERIFY_EMAIL.TITLE')}</h2>
                    <p className="mt-2 text-sm text-n-slate-11">
                        {t('REGISTER.VERIFY_EMAIL.DESCRIPTION', { email })}
                    </p>
                </div>
                <div className="space-y-4">
                    <NextButton
                        lg
                        type="button"
                        data-testid="resend_email_button"
                        className="w-full"
                        label={t('REGISTER.VERIFY_EMAIL.RESEND')}
                        isLoading={isResendingEmail}
                        onClick={handleResendEmail}
                    />
                </div>
            </section>
        </AuthShell>
    );
}
