import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import Code from 'dashboard/components/Code';
import EmptyState from 'dashboard/components/widgets/EmptyState';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../types';
import type { Inbox } from './types';

// Port từ settings/inbox/FinishSetup.vue — nhánh kênh API + Website (QR của
// whatsapp/telegram/messenger và EmailInboxFinish vào cùng kênh của chúng).
interface FinishSetupProps {
    inboxId: number;
}

export default function FinishSetup({ inboxId }: FinishSetupProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [inbox, setInbox] = useState<Inbox | null>(null);

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(setInbox);
    }, [accountId, inboxId]);

    const webWidgetScript = inbox?.web_widget_script ?? '';
    const message = webWidgetScript ? t('INBOX_MGMT.FINISH.WEBSITE_SUCCESS') : t('INBOX_MGMT.FINISH.MESSAGE');

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.FINISH}>
                    <div className="overflow-auto col-span-6 p-6 w-full h-full">
                        <EmptyState title={t('INBOX_MGMT.FINISH.TITLE')} message={message}>
                            <div className="w-full text-center">
                                <div className="my-4 mx-auto max-w-[70%]">
                                    {webWidgetScript ? <Code script={webWidgetScript} /> : null}
                                </div>
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
