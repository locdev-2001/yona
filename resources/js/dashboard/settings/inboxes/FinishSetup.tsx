import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import EmptyState from 'dashboard/components/widgets/EmptyState';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../types';

// Port từ settings/inbox/FinishSetup.vue — nhánh kênh API (không QR/script;
// woot-code + QR của web widget/whatsapp/telegram vào cùng kênh của chúng).
interface FinishSetupProps {
    inboxId: number;
}

export default function FinishSetup({ inboxId }: FinishSetupProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.FINISH}>
                    <div className="overflow-auto col-span-6 p-6 w-full h-full">
                        <EmptyState title={t('INBOX_MGMT.FINISH.TITLE')} message={t('INBOX_MGMT.FINISH.MESSAGE')}>
                            <div className="w-full text-center">
                                <div className="flex gap-2 justify-center mt-4">
                                    <a href={accountScopedUrl(accountId, `settings/inboxes/${inboxId}`)}>
                                        <Button outline slate label={t('INBOX_MGMT.FINISH.MORE_SETTINGS')} />
                                    </a>
                                    <a href={accountScopedUrl(accountId, `inbox/${inboxId}`)}>
                                        <Button solid teal label={t('INBOX_MGMT.FINISH.BUTTON_TEXT')} />
                                    </a>
                                </div>
                            </div>
                        </EmptyState>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
