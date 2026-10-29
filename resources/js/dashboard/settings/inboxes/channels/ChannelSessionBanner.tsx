import type { ComponentType } from 'react';

import ZaloSessionBanner from './ZaloSessionBanner';
import MessengerPersonalSessionBanner from './MessengerPersonalSessionBanner';
import type { Inbox } from '../types';

// Biểu ngữ phiên đăng nhập của kênh ở đầu trang cấu hình hộp thư. Mỗi kênh có phiên
// tự khai một dòng ở đây; trang cấu hình không biết kênh nào.
interface SessionBannerProps {
    accountId: number;
    inbox: Inbox;
}

function ZaloBanner({ accountId, inbox }: SessionBannerProps) {
    return (
        <ZaloSessionBanner
            accountId={accountId}
            inboxId={inbox.id}
            state={inbox.zalo_state}
            displayName={inbox.zalo_display_name}
            avatarUrl={inbox.avatar_url}
            phone={inbox.zalo_phone}
            lastConnectedAt={inbox.zalo_last_connected_at}
        />
    );
}

const SESSION_BANNERS: Record<string, ComponentType<SessionBannerProps>> = {
    'Channel::Zalo': ZaloBanner,
    'Channel::MessengerPersonal': MessengerPersonalSessionBanner,
};

export default function ChannelSessionBanner({ accountId, inbox }: SessionBannerProps) {
    const Banner = SESSION_BANNERS[inbox.channel_type];

    return Banner ? <Banner accountId={accountId} inbox={inbox} /> : null;
}
