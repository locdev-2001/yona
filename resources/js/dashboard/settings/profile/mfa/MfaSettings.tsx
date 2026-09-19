import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../../Dashboard';
import SettingsWrapper from '../../SettingsWrapper';
import BaseSettingsHeader from '../../BaseSettingsHeader';
import MfaStatusCard from './MfaStatusCard';
import MfaSetupWizard from './MfaSetupWizard';
import MfaManagementActions from './MfaManagementActions';
import type { MfaManagementHandle } from './MfaManagementActions';
import { mfaApi } from './mfaApi';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/routes/dashboard/settings/profile/MfaSettings.vue.
export default function MfaSettings() {
    const { globalConfig } = usePage<DashboardPageProps>().props;

    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [provisioningUri, setProvisioningUri] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationError, setVerificationError] = useState('');

    const managementRef = useRef<MfaManagementHandle>(null);

    useEffect(() => {
        mfaApi
            .get()
            .then(status => setMfaEnabled(status.enabled))
            .catch(() => {});
    }, []);

    const startMfaSetup = async () => {
        try {
            const payload = await mfaApi.enable();
            setProvisioningUri(payload.provisioning_url);
            setSecretKey(payload.secret);
            setBackupCodes([]);
            setVerificationError('');
            setShowSetup(true);
        } catch {
            useAlert(t('MFA_SETTINGS.SETUP.ERROR_STARTING'));
        }
    };

    const verifyCode = async (code: string): Promise<boolean> => {
        try {
            const payload = await mfaApi.verify(code);
            setBackupCodes(payload.backup_codes ?? []);
            setVerificationError('');
            return true;
        } catch (error) {
            setVerificationError(parseApiErrorMessage(error) || t('MFA_SETTINGS.SETUP.INVALID_CODE'));
            return false;
        }
    };

    const completeMfaSetup = () => {
        setMfaEnabled(true);
        setShowSetup(false);
        useAlert(t('MFA_SETTINGS.SETUP.SUCCESS'));
    };

    const disableMfa = async ({
        password,
        otpCode,
        backupCode,
    }: {
        password: string;
        otpCode: string;
        backupCode: string;
    }) => {
        try {
            await mfaApi.disable(password, { otpCode, backupCode });
            setMfaEnabled(false);
            managementRef.current?.resetDisableForm();
            useAlert(t('MFA_SETTINGS.DISABLE.SUCCESS'));
        } catch {
            useAlert(t('MFA_SETTINGS.DISABLE.ERROR'));
        }
    };

    const regenerateBackupCodes = async ({ otpCode }: { otpCode: string }) => {
        try {
            const payload = await mfaApi.regenerateBackupCodes(otpCode);
            setBackupCodes(payload.backup_codes);
            managementRef.current?.resetRegenerateForm();
            managementRef.current?.showBackupCodesDialog();
            useAlert(t('MFA_SETTINGS.REGENERATE.SUCCESS'));
        } catch {
            useAlert(t('MFA_SETTINGS.REGENERATE.ERROR'));
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="grid w-full">
                    <BaseSettingsHeader
                        title={t('MFA_SETTINGS.TITLE')}
                        description={t('MFA_SETTINGS.SUBTITLE')}
                        backButtonLabel={t('PROFILE_SETTINGS.TITLE')}
                    />

                    <div className="grid gap-4 w-full mt-4">
                        <MfaStatusCard
                            mfaEnabled={mfaEnabled}
                            showSetup={showSetup}
                            onEnableMfa={() => void startMfaSetup()}
                        />
                        <MfaSetupWizard
                            showSetup={showSetup}
                            mfaEnabled={mfaEnabled}
                            provisioningUri={provisioningUri}
                            secretKey={secretKey}
                            backupCodes={backupCodes}
                            installationName={globalConfig.installationName}
                            verificationError={verificationError}
                            onCancel={() => setShowSetup(false)}
                            onVerify={verifyCode}
                            onComplete={completeMfaSetup}
                        />
                        <MfaManagementActions
                            ref={managementRef}
                            mfaEnabled={mfaEnabled}
                            backupCodes={backupCodes}
                            installationName={globalConfig.installationName}
                            onDisableMfa={payload => void disableMfa(payload)}
                            onRegenerateBackupCodes={payload => void regenerateBackupCodes(payload)}
                        />
                    </div>
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
