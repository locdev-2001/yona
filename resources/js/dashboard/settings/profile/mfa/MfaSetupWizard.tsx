import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import BackupCodesPanel, { BackupCodesWarning } from './BackupCodesPanel';

// Port từ settings/profile/MfaSetupWizard.vue (thư viện QR giữ nguyên: `qrcode`).
interface MfaSetupWizardProps {
    showSetup: boolean;
    mfaEnabled: boolean;
    provisioningUri: string;
    secretKey: string;
    backupCodes: string[];
    installationName: string;
    verificationError: string;
    onCancel: () => void;
    onVerify: (code: string) => Promise<boolean>;
    onComplete: () => void;
}

export default function MfaSetupWizard({
    showSetup,
    mfaEnabled,
    provisioningUri,
    secretKey,
    backupCodes,
    installationName,
    verificationError,
    onCancel,
    onVerify,
    onComplete,
}: MfaSetupWizardProps) {
    const [setupStep, setSetupStep] = useState<'qr' | 'backup'>('qr');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false);

    useEffect(() => {
        if (!provisioningUri) return;
        QRCode.toDataURL(provisioningUri, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
        })
            .then(setQrCodeUrl)
            .catch(() => setQrCodeUrl(''));
    }, [provisioningUri]);

    useEffect(() => {
        if (showSetup) {
            setSetupStep('qr');
            setVerificationCode('');
            setBackupCodesConfirmed(false);
        }
    }, [showSetup]);

    if (!showSetup || mfaEnabled) return null;

    const verifyCode = async () => {
        if (await onVerify(verificationCode)) {
            setSetupStep('backup');
            setVerificationCode('');
        }
    };

    const copySecret = async () => {
        await copyTextToClipboard(secretKey);
        useAlert(t('MFA_SETTINGS.SETUP.SECRET_COPIED'));
    };

    const completeSetup = () => {
        setSetupStep('qr');
        setBackupCodesConfirmed(false);
        onComplete();
    };

    const cancelSetup = () => {
        setSetupStep('qr');
        setVerificationCode('');
        setBackupCodesConfirmed(false);
        onCancel();
    };

    if (setupStep === 'qr') {
        return (
            <div className="space-y-6">
                <div className="bg-n-solid-1 rounded-xl outline-1 outline-n-weak outline p-10 flex flex-col gap-4">
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-n-slate-12 mb-2">
                            {t('MFA_SETTINGS.SETUP.STEP1_TITLE')}
                        </h3>
                        <p className="text-sm text-n-slate-11">{t('MFA_SETTINGS.SETUP.STEP1_DESCRIPTION')}</p>
                    </div>
                    <div className="flex justify-center">
                        <div className="bg-n-background p-4 rounded-lg outline outline-1 outline-n-weak">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center bg-n-slate-2">
                                    <span className="text-n-slate-10">{t('MFA_SETTINGS.SETUP.LOADING_QR')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <details className="border border-n-slate-4 rounded-lg">
                        <summary className="px-4 py-3 cursor-pointer hover:bg-n-slate-2 text-sm font-medium text-n-slate-11">
                            {t('MFA_SETTINGS.SETUP.MANUAL_ENTRY')}
                        </summary>
                        <div className="px-4 pb-4">
                            <label className="block text-xs text-n-slate-10 mb-2">
                                {t('MFA_SETTINGS.SETUP.SECRET_KEY')}
                            </label>
                            <div className="flex items-center gap-2">
                                <Input value={secretKey} readOnly className="flex-1" />
                                <Button
                                    outline
                                    slate
                                    sm
                                    label={t('MFA_SETTINGS.SETUP.COPY')}
                                    onClick={() => void copySecret()}
                                />
                            </div>
                        </div>
                    </details>

                    <div className="flex flex-col items-start gap-3 w-full">
                        <Input
                            value={verificationCode}
                            onChange={event => setVerificationCode(event.target.value)}
                            onKeyUp={event => {
                                if (event.key === 'Enter') void verifyCode();
                            }}
                            type="text"
                            maxLength={6}
                            pattern="[0-9]{6}"
                            label={t('MFA_SETTINGS.SETUP.ENTER_CODE')}
                            placeholder={t('MFA_SETTINGS.SETUP.ENTER_CODE_PLACEHOLDER')}
                            message={verificationError}
                            messageType={verificationError ? 'error' : 'info'}
                            className="w-full"
                        />

                        <div className="flex gap-3 mt-1 w-full justify-between">
                            <Button
                                faded
                                slate
                                className="flex-1"
                                label={t('MFA_SETTINGS.SETUP.CANCEL')}
                                onClick={cancelSetup}
                            />
                            <Button
                                className="flex-1"
                                disabled={verificationCode.length !== 6}
                                label={t('MFA_SETTINGS.SETUP.VERIFY_BUTTON')}
                                onClick={() => void verifyCode()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-start">
                <h3 className="text-lg font-medium text-n-slate-12 mb-2">{t('MFA_SETTINGS.BACKUP.TITLE')}</h3>
                <p className="text-sm text-n-slate-11">{t('MFA_SETTINGS.BACKUP.DESCRIPTION')}</p>
            </div>

            <BackupCodesWarning />
            <BackupCodesPanel codes={backupCodes} installationName={installationName} />

            <div className="space-y-4">
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={backupCodesConfirmed}
                        onChange={event => setBackupCodesConfirmed(event.target.checked)}
                        className="mt-1 rounded border-n-slate-4 text-n-blue-9 focus:ring-n-blue-8"
                    />
                    <span className="text-sm text-n-slate-11">{t('MFA_SETTINGS.BACKUP.CONFIRM')}</span>
                </label>

                <Button
                    disabled={!backupCodesConfirmed}
                    label={t('MFA_SETTINGS.BACKUP.COMPLETE_SETUP')}
                    onClick={completeSetup}
                />
            </div>
        </div>
    );
}
