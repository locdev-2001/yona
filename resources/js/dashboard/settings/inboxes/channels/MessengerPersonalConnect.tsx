import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../../Dashboard';
import SettingsContent from '../../SettingsContent';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import WizardLayout, { INBOX_WIZARD_ROUTES } from '../WizardLayout';
import MessengerPersonalLoginPanel from './MessengerPersonalLoginPanel';
import type { DashboardPageProps } from '../../../types';

// Bước đăng nhập Facebook của wizard tạo hộp thư Messenger cá nhân — URL riêng
// (settings/inboxes/new/{inboxId}/messenger_personal) như bước quét QR của Zalo.
interface MessengerPersonalConnectProps {
    inboxId: number;
}

export default function MessengerPersonalConnect({ inboxId }: MessengerPersonalConnectProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.INBOX}>
                    <div className="h-full w-full p-4 sm:p-6 col-span-6">
                        <SettingsSubPageHeader
                            headerTitle={t('INBOX_MGMT.MESSENGER_PERSONAL.CONNECT.TITLE')}
                            headerContent={t('INBOX_MGMT.MESSENGER_PERSONAL.CONNECT.DESC')}
                        />
                        <MessengerPersonalLoginPanel
                            accountId={accountId}
                            inboxId={inboxId}
                            onConnected={() =>
                                router.visit(accountScopedUrl(accountId, `settings/inboxes/new/${inboxId}/agents`))
                            }
                        />
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
