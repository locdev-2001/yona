import { usePage } from '@inertiajs/react';
import { BRAND_ICONS, ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import ChannelItem from 'dashboard/components/widgets/ChannelItem';
import type { ChannelOption } from 'dashboard/components/widgets/ChannelItem';
import type { DashboardPageProps } from '../../types';

// Port từ settings/inbox/ChannelList.vue — bước 1 chọn kênh.
// Bỏ card tiktok (chỉ hiện khi cài đặt có tiktokAppId — mình không cấu hình).
// KHÁC BIỆT CỐ Ý so với bản gốc: Zalo đứng đầu (kênh chính của sản phẩm), kênh
// chưa bấm được dồn xuống cuối để không chen giữa các kênh dùng được.
const CHANNEL_KEYS = [
    'zalo',
    'website',
    'email',
    'telegram',
    'whatsapp',
    'sms',
    'api',
    'line',
    'facebook',
    'instagram',
    'whatsapp_call',
    'voice',
] as const;

const CHANNEL_ICONS: Record<string, string> = {
    website: ICONS.channelWebsite,
    facebook: 'i-yona-messenger',
    whatsapp: 'i-yona-whatsapp',
    sms: ICONS.channelSms,
    email: ICONS.channelEmail,
    api: ICONS.channelApi,
    telegram: 'i-yona-telegram',
    line: 'i-yona-line',
    instagram: 'i-yona-instagram',
    voice: ICONS.channelVoice,
    whatsapp_call: 'i-yona-whatsapp',
    zalo: BRAND_ICONS.zalo,
};

export default function NewChannelList() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const channelList: ChannelOption[] = CHANNEL_KEYS.map(key => ({
        key,
        title: t(`INBOX_MGMT.ADD.AUTH.CHANNEL.${key.toUpperCase()}.TITLE`),
        description: t(`INBOX_MGMT.ADD.AUTH.CHANNEL.${key.toUpperCase()}.DESCRIPTION`),
        icon: CHANNEL_ICONS[key],
    }));

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.CHANNEL}>
                    <div className="grid max-w-3xl grid-cols-1 xs:grid-cols-2 mx-0 gap-6 sm:grid-cols-3 p-8">
                        {channelList.map(channel => (
                            <ChannelItem
                                key={channel.key}
                                channel={channel}
                                onChannelItemClick={key => {
                                    window.location.href = accountScopedUrl(
                                        accountId,
                                        `settings/inboxes/new/${key}`,
                                    );
                                }}
                            />
                        ))}
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
