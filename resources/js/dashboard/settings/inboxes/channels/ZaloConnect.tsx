import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../../Dashboard';
import SettingsContent from '../../SettingsContent';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import WizardLayout, { INBOX_WIZARD_ROUTES } from '../WizardLayout';
import ZaloQrPanel from './ZaloQrPanel';
import type { DashboardPageProps } from '../../../types';

// Bước quét QR của wizard tạo inbox Zalo — có URL riêng
// (settings/inboxes/new/{inboxId}/zalo) để F5 hay bấm quay lại KHÔNG tạo thêm hộp
// thư mồ côi. Zalo.tsx giờ chỉ còn bước đặt tên, điều hướng sang trang này sau khi
// tạo inbox xong.
interface ZaloConnectProps {
    inboxId: number;
}

export default function ZaloConnect({ inboxId }: ZaloConnectProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.INBOX}>
                    <div className="h-full w-full p-6 col-span-6">
                        <SettingsSubPageHeader
                            headerTitle={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.TITLE')}
                            headerContent={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.DESC')}
                        />
                        <ZaloQrPanel
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
