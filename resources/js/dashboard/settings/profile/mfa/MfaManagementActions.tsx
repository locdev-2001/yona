import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import Icon from 'dashboard/components-next/icon/Icon';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import BackupCodesPanel, { BackupCodesWarning } from './BackupCodesPanel';

// Port từ settings/profile/MfaManagementActions.vue.
export interface MfaManagementHandle {
    resetDisableForm: () => void;
    resetRegenerateForm: () => void;
    showBackupCodesDialog: () => void;
}

interface MfaManagementActionsProps {
    mfaEnabled: boolean;
    backupCodes: string[];
    installationName: string;
    onDisableMfa: (payload: { password: string; otpCode: string; backupCode: string }) => void;
    onRegenerateBackupCodes: (payload: { otpCode: string }) => void;
}

const MfaManagementActions = forwardRef<MfaManagementHandle, MfaManagementActionsProps>(
    function MfaManagementActions(
        { mfaEnabled, backupCodes, installationName, onDisableMfa, onRegenerateBackupCodes },
        ref,
    ) {
        const disableDialogRef = useRef<DialogHandle>(null);
        const regenerateDialogRef = useRef<DialogHandle>(null);
        const backupCodesDialogRef = useRef<DialogHandle>(null);

        const [disablePassword, setDisablePassword] = useState('');
        const [disableOtpCode, setDisableOtpCode] = useState('');
        const [disableBackupCode, setDisableBackupCode] = useState('');
        const [useBackupCodeToDisable, setUseBackupCodeToDisable] = useState(false);
        const [regenerateOtpCode, setRegenerateOtpCode] = useState('');

        useImperativeHandle(ref, () => ({
            resetDisableForm: () => {
                setDisablePassword('');
                setDisableOtpCode('');
                setDisableBackupCode('');
                setUseBackupCodeToDisable(false);
                disableDialogRef.current?.close();
            },
            resetRegenerateForm: () => {
                setRegenerateOtpCode('');
                regenerateDialogRef.current?.close();
            },
            showBackupCodesDialog: () => backupCodesDialogRef.current?.open(),
        }));

        if (!mfaEnabled) return null;

        const toggleDisableMethod = () => {
            setUseBackupCodeToDisable(current => !current);
            setDisableOtpCode('');
            setDisableBackupCode('');
        };

        return (
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="panel-surface rounded-xl p-5">
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="i-lucide-key" className="size-4 flex-shrink-0 text-n-slate-11" />
                                <h4 className="font-medium text-n-slate-12">
                                    {t('MFA_SETTINGS.MANAGEMENT.BACKUP_CODES')}
                                </h4>
                            </div>
                            <p className="text-sm text-n-slate-11">
                                {t('MFA_SETTINGS.MANAGEMENT.BACKUP_CODES_DESC')}
                            </p>
                            <Button
                                faded
                                slate
                                label={t('MFA_SETTINGS.MANAGEMENT.REGENERATE')}
                                onClick={() => regenerateDialogRef.current?.open()}
                            />
                        </div>
                    </div>

                    <div className="panel-surface rounded-xl p-5">
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Icon
                                    icon="i-lucide-lock-keyhole-open"
                                    className="size-4 flex-shrink-0 text-n-slate-11"
                                />
                                <h4 className="font-medium text-n-slate-12">
                                    {t('MFA_SETTINGS.MANAGEMENT.DISABLE_MFA')}
                                </h4>
                            </div>
                            <p className="text-sm text-n-slate-11">
                                {t('MFA_SETTINGS.MANAGEMENT.DISABLE_MFA_DESC')}
                            </p>
                            <Button
                                faded
                                ruby
                                label={t('MFA_SETTINGS.MANAGEMENT.DISABLE_BUTTON')}
                                onClick={() => disableDialogRef.current?.open()}
                            />
                        </div>
                    </div>
                </div>

                <Dialog
                    ref={disableDialogRef}
                    type="alert"
                    title={t('MFA_SETTINGS.DISABLE.TITLE')}
                    description={t('MFA_SETTINGS.DISABLE.DESCRIPTION')}
                    confirmButtonLabel={t('MFA_SETTINGS.DISABLE.CONFIRM')}
                    cancelButtonLabel={t('MFA_SETTINGS.DISABLE.CANCEL')}
                    onConfirm={() =>
                        onDisableMfa({
                            password: disablePassword,
                            otpCode: useBackupCodeToDisable ? '' : disableOtpCode,
                            backupCode: useBackupCodeToDisable ? disableBackupCode : '',
                        })
                    }
                >
                    <div className="space-y-4">
                        <Input
                            value={disablePassword}
                            onChange={event => setDisablePassword(event.target.value)}
                            type="password"
                            label={t('MFA_SETTINGS.DISABLE.PASSWORD')}
                        />
                        {useBackupCodeToDisable ? (
                            <Input
                                value={disableBackupCode}
                                onChange={event => setDisableBackupCode(event.target.value)}
                                type="text"
                                maxLength={8}
                                label={t('MFA_SETTINGS.DISABLE.BACKUP_CODE')}
                                placeholder={t('MFA_SETTINGS.DISABLE.BACKUP_CODE_PLACEHOLDER')}
                            />
                        ) : (
                            <Input
                                value={disableOtpCode}
                                onChange={event => setDisableOtpCode(event.target.value)}
                                type="text"
                                maxLength={6}
                                label={t('MFA_SETTINGS.DISABLE.OTP_CODE')}
                                placeholder={t('MFA_SETTINGS.DISABLE.OTP_CODE_PLACEHOLDER')}
                            />
                        )}
                        <Button
                            link
                            sm
                            type="button"
                            label={
                                useBackupCodeToDisable
                                    ? t('MFA_SETTINGS.DISABLE.USE_OTP_CODE')
                                    : t('MFA_SETTINGS.DISABLE.USE_BACKUP_CODE')
                            }
                            onClick={toggleDisableMethod}
                        />
                    </div>
                </Dialog>

                <Dialog
                    ref={regenerateDialogRef}
                    type="edit"
                    title={t('MFA_SETTINGS.REGENERATE.TITLE')}
                    description={t('MFA_SETTINGS.REGENERATE.DESCRIPTION')}
                    confirmButtonLabel={t('MFA_SETTINGS.REGENERATE.CONFIRM')}
                    cancelButtonLabel={t('MFA_SETTINGS.DISABLE.CANCEL')}
                    onConfirm={() => onRegenerateBackupCodes({ otpCode: regenerateOtpCode })}
                >
                    <Input
                        value={regenerateOtpCode}
                        onChange={event => setRegenerateOtpCode(event.target.value)}
                        type="text"
                        maxLength={6}
                        label={t('MFA_SETTINGS.REGENERATE.OTP_CODE')}
                        placeholder={t('MFA_SETTINGS.REGENERATE.OTP_CODE_PLACEHOLDER')}
                    />
                </Dialog>

                <Dialog
                    ref={backupCodesDialogRef}
                    type="edit"
                    width="2xl"
                    title={t('MFA_SETTINGS.REGENERATE.NEW_CODES_TITLE')}
                    description={t('MFA_SETTINGS.REGENERATE.NEW_CODES_DESC')}
                    showCancelButton={false}
                    confirmButtonLabel={t('MFA_SETTINGS.REGENERATE.CODES_SAVED')}
                    onConfirm={() => backupCodesDialogRef.current?.close()}
                >
                    <BackupCodesWarning />
                    <BackupCodesPanel codes={backupCodes} installationName={installationName} />
                </Dialog>
            </div>
        );
    },
);

export default MfaManagementActions;
