import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import NextButton from 'dashboard/components-next/button/Button';
import SnackbarContainer from 'v3/components/SnackBar/Container';
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
        <main className="flex flex-col w-full min-h-screen py-20 bg-n-brand/5 dark:bg-n-background sm:px-6 lg:px-8">
            <section className="bg-white shadow sm:mx-auto mt-11 sm:w-full sm:max-w-lg dark:bg-n-solid-2 p-11 sm:shadow-lg sm:rounded-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-n-slate-12">{t('REGISTER.VERIFY_EMAIL.TITLE')}</h2>
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
            <SnackbarContainer />
        </main>
    );
}
