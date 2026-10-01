import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import MfaSetupWizard from 'dashboard/settings/profile/mfa/MfaSetupWizard';
import { createMfaApi } from 'dashboard/settings/profile/mfa/mfaApi';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import type { SuperAdminPageProps } from '../types';
import { Alert } from '../ui/Alert';
import { PageHeader } from '../ui/PageHeader';

const superAdminMfaApi = createMfaApi('/admin/mfa');

// Super admin chưa bật 2FA bị EnsureSuperAdminMfaEnrolled đưa thẳng vào đây —
// bắt buộc quét QR + xác nhận mã trước khi dùng phần còn lại của console.
// Backend (MfaController::setupPage) đã tự điều hướng về /admin nếu 2FA
// đã bật, nên trang này chỉ còn nhánh "chưa bật". Component wizard dùng chung
// với settings 2FA của agent.
export default function SuperAdminMfaSetup() {
    const { superAdmin } = usePage<SuperAdminPageProps>().props;

    const [provisioningUri, setProvisioningUri] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationError, setVerificationError] = useState('');
    const [startError, setStartError] = useState('');

    useEffect(() => {
        superAdminMfaApi
            .enable()
            .then(payload => {
                setProvisioningUri(payload.provisioning_url);
                setSecretKey(payload.secret);
            })
            .catch(error => setStartError(parseApiErrorMessage(error) || t('MFA_SETTINGS.SETUP.ERROR_STARTING')));
    }, []);

    const verifyCode = async (code: string): Promise<boolean> => {
        try {
            const payload = await superAdminMfaApi.verify(code);
            setBackupCodes(payload.backup_codes ?? []);
            setVerificationError('');
            return true;
        } catch (error) {
            setVerificationError(parseApiErrorMessage(error) || t('MFA_SETTINGS.SETUP.INVALID_CODE'));
            return false;
        }
    };

    const completeMfaSetup = () => {
        router.visit('/admin');
    };

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <PageHeader
                title={t('SUPER_ADMIN_MFA.REQUIRED_TITLE')}
                description={t('SUPER_ADMIN_MFA.REQUIRED_DESCRIPTION', { installationName: superAdmin.installationName })}
            />

            {startError ? <Alert tone="destructive">{startError}</Alert> : null}

            <MfaSetupWizard
                showSetup
                mfaEnabled={false}
                provisioningUri={provisioningUri}
                secretKey={secretKey}
                backupCodes={backupCodes}
                installationName={superAdmin.installationName}
                verificationError={verificationError}
                onCancel={() => {
                    window.location.href = '/admin/logout';
                }}
                onVerify={verifyCode}
                onComplete={completeMfaSetup}
            />
        </div>
    );
}
