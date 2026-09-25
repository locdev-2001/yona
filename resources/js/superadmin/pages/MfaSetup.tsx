import { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import MfaSetupWizard from 'dashboard/settings/profile/mfa/MfaSetupWizard';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { superAdminMfaApi } from '../mfaApi';
import type { SuperAdminPageProps } from '../types';

interface MfaSetupPageProps extends SuperAdminPageProps {
    mfaEnabled: boolean;
}

// Dash #39: super admin chưa bật 2FA bị EnsureSuperAdminMfaEnrolled đưa thẳng
// vào đây — bắt buộc quét QR + xác nhận mã trước khi dùng phần còn lại của
// console. Component wizard dùng chung với settings 2FA của agent.
export default function SuperAdminMfaSetup() {
    const { superAdmin, mfaEnabled: initiallyEnabled } = usePage<MfaSetupPageProps>().props;

    const [provisioningUri, setProvisioningUri] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationError, setVerificationError] = useState('');
    const [startError, setStartError] = useState('');
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (initiallyEnabled) return;

        superAdminMfaApi
            .enable()
            .then(payload => {
                setProvisioningUri(payload.provisioning_url);
                setSecretKey(payload.secret);
            })
            .catch(error => setStartError(parseApiErrorMessage(error) || t('SUPER_ADMIN_MFA.START_ERROR')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const verifyCode = async (code: string): Promise<boolean> => {
        try {
            const payload = await superAdminMfaApi.verify(code);
            setBackupCodes(payload.backup_codes ?? []);
            setVerificationError('');
            return true;
        } catch (error) {
            setVerificationError(parseApiErrorMessage(error) || t('SUPER_ADMIN_MFA.INVALID_CODE'));
            return false;
        }
    };

    const completeMfaSetup = () => {
        setCompleted(true);
        router.visit('/super_admin');
    };

    if (initiallyEnabled || completed) {
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-6">
            <Head title="Set up 2FA" />
            <h1 className="text-2xl font-medium text-slate-900 mb-2">{t('SUPER_ADMIN_MFA.REQUIRED_TITLE')}</h1>
            <p className="text-sm text-slate-700 mb-6">{t('SUPER_ADMIN_MFA.REQUIRED_DESCRIPTION')}</p>

            {startError ? <p className="mb-5 text-sm text-ruby-600">{startError}</p> : null}

            <MfaSetupWizard
                showSetup
                mfaEnabled={false}
                provisioningUri={provisioningUri}
                secretKey={secretKey}
                backupCodes={backupCodes}
                installationName={superAdmin.installationName}
                verificationError={verificationError}
                onCancel={() => {
                    window.location.href = '/super_admin/logout';
                }}
                onVerify={verifyCode}
                onComplete={completeMfaSetup}
            />
        </div>
    );
}
