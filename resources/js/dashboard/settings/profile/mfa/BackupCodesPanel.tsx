import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyBackupCodes, downloadBackupCodes } from './backupCodesFile';

// Lưới mã dự phòng + hai nút tải/chép — dùng chung cho bước cài đặt
// (MfaSetupWizard) và hộp thoại sinh lại mã (MfaManagementActions).
interface BackupCodesPanelProps {
    codes: string[];
    installationName: string;
}

export function BackupCodesWarning() {
    return (
        <div className="flex items-start gap-2 p-4 bg-n-solid-1 outline outline-n-weak rounded-xl outline-1">
            <Icon icon="i-lucide-alert-circle" className="size-4 text-n-slate-10 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-n-slate-11">
                <strong>{t('MFA_SETTINGS.BACKUP.IMPORTANT')}</strong>
                {t('MFA_SETTINGS.BACKUP.IMPORTANT_NOTE')}
            </p>
        </div>
    );
}

export default function BackupCodesPanel({ codes, installationName }: BackupCodesPanelProps) {
    const onCopy = async () => {
        await copyBackupCodes(codes);
        useAlert(t('MFA_SETTINGS.BACKUP.CODES_COPIED'));
    };

    return (
        <div className="bg-n-solid-1 rounded-xl outline-1 outline-n-weak outline flex flex-col gap-6 p-6">
            <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-5 gap-3">
                {codes.map((code, index) => (
                    <span
                        key={`${code}-${index}`}
                        className="px-1 py-2 font-mono text-base text-center text-n-slate-12"
                    >
                        {code}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-center gap-3">
                <Button
                    type="button"
                    outline
                    slate
                    sm
                    icon="i-lucide-download"
                    label={t('MFA_SETTINGS.BACKUP.DOWNLOAD')}
                    onClick={() => downloadBackupCodes(codes, installationName)}
                />
                <Button
                    type="button"
                    outline
                    slate
                    sm
                    icon="i-lucide-clipboard"
                    label={t('MFA_SETTINGS.BACKUP.COPY_ALL')}
                    onClick={() => void onCopy()}
                />
            </div>
        </div>
    );
}
