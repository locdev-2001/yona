import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import ChannelItem from 'dashboard/components/widgets/ChannelItem';
import type { ChannelOption } from 'dashboard/components/widgets/ChannelItem';
import type { DashboardPageProps } from '../../types';
import type { ChannelConnection } from './channelConnection';

// Bước 1 chọn kênh. Danh sách và thứ tự do backend quyết (mỗi driver kênh tự khai
// DeclaresConnection): kênh chưa mở hay thiếu app nền tảng không có trong `channels`.
interface NewChannelListProps {
    channels: ChannelConnection[];
}

const LISTED_CHANNEL_KEYS = ['zalo', 'messenger_personal', 'website', 'email', 'facebook'];

export default function NewChannelList({ channels = [] }: NewChannelListProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const channelList: ChannelOption[] = channels.filter(({ key }) => LISTED_CHANNEL_KEYS.includes(key)).map(({ key, logo_url }) => ({
        key,
        title: t(`INBOX_MGMT.ADD.AUTH.CHANNEL.${key.toUpperCase()}.TITLE`),
        description: t(`INBOX_MGMT.ADD.AUTH.CHANNEL.${key.toUpperCase()}.DESCRIPTION`),
        icon: ICONS.channelDefault,
        logoUrl: logo_url,
    }));

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.CHANNEL}>
                    <div className="grid max-w-3xl grid-cols-1 xs:grid-cols-2 mx-0 gap-6 sm:grid-cols-3 p-4 sm:p-8">
                        {channelList.map(channel => (
                            <ChannelItem
                                key={channel.key}
                                channel={channel}
                                onChannelItemClick={key => {
                                    window.location.href = accountScopedUrl(accountId, `settings/inboxes/new/${key}`);
                                }}
                            />
                        ))}
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
