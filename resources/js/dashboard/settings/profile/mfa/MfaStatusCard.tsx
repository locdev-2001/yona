import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';

// Port từ settings/profile/MfaStatusCard.vue.
interface MfaStatusCardProps {
    mfaEnabled: boolean;
    showSetup: boolean;
    onEnableMfa: () => void;
}

export default function MfaStatusCard({ mfaEnabled, showSetup, onEnableMfa }: MfaStatusCardProps) {
    if (!mfaEnabled && !showSetup) {
        return (
            <div className="space-y-6">
                <div className="panel-surface rounded-xl p-6 text-center">
                    <Icon icon="i-lucide-lock-keyhole" className="size-8 text-n-slate-10 mx-auto mb-4 block" />
                    <h3 className="text-lg font-medium text-n-slate-12 mb-2">
                        {t('MFA_SETTINGS.ENHANCE_SECURITY')}
                    </h3>
                    <p className="text-sm text-n-slate-11 mb-6 max-w-md mx-auto">
                        {t('MFA_SETTINGS.ENHANCE_SECURITY_DESC')}
                    </p>
                    <Button
                        icon="i-lucide-settings"
                        label={t('MFA_SETTINGS.ENABLE_BUTTON')}
                        onClick={onEnableMfa}
                    />
                </div>
            </div>
        );
    }

    if (mfaEnabled && !showSetup) {
        return (
            <div>
                <div className="panel-surface rounded-xl p-4 flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Icon icon="i-lucide-lock-keyhole" className="size-4 flex-shrink-0 text-n-slate-11" />
                        <h4 className="text-sm font-medium text-n-slate-12">
                            {t('MFA_SETTINGS.STATUS_ENABLED')}
                        </h4>
                    </div>
                    <p className="text-sm text-n-slate-11">{t('MFA_SETTINGS.STATUS_ENABLED_DESC')}</p>
                </div>
            </div>
        );
    }

    return null;
}
