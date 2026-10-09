import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import type { DashboardPageProps } from '../../types';

// Port từ settings/profile/MfaSettingsCard.vue.
export default function MfaSettingsCard() {
    const { currentAccount } = usePage<DashboardPageProps>().props;

    return (
        <div className="panel-surface rounded-xl p-4">
            <div className="flex flex-col xs:flex-row items-center justify-between gap-4">
                <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2">
                        <Icon icon="i-lucide-lock-keyhole" className="size-4 text-n-slate-10 flex-shrink-0" />
                        <h5 className="text-heading-3 text-n-slate-12">{t('MFA_SETTINGS.TITLE')}</h5>
                    </div>
                    <p className="text-body-para text-n-slate-11">{t('MFA_SETTINGS.DESCRIPTION')}</p>
                </div>
                <Button
                    type="button"
                    faded
                    label={t('PROFILE_SETTINGS.FORM.SECURITY_SECTION.MFA_BUTTON')}
                    icon="i-lucide-settings"
                    className="flex-shrink-0"
                    onClick={() => router.visit(`/app/accounts/${currentAccount.id}/profile/mfa`)}
                />
            </div>
        </div>
    );
}
