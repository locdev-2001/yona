import { createContext, useContext } from 'react';

import type { ChannelPlatform } from 'shared/constants/channelPlatform';

export interface ChannelAccountIdentity {
    name: string;
    avatarUrl: string;
    platform: ChannelPlatform | null;
}

export interface ConversationSenderIdentity {
    // Tài khoản kênh của hộp thư đang mở: tin gửi từ điện thoại mang danh tính này.
    channelAccount: ChannelAccountIdentity | null;
    // Badge cho tin gửi từ bản cài đặt (nhân viên, bot, tự động, ghi chú).
    installation: ChannelPlatform | null;
}

export const SenderIdentityContext = createContext<ConversationSenderIdentity | null>(null);

export const useSenderIdentityContext = () => useContext(SenderIdentityContext);
