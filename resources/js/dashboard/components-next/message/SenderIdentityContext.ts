import { createContext, useContext } from 'react';

import type { ChannelPlatform } from 'shared/constants/channelPlatform';

export interface ChannelAccountIdentity {
    name: string;
    avatarUrl: string;
    // Định danh bền (avatarSeed của hộp thư) cho avatar hình khối khi tài khoản kênh chưa có ảnh.
    seed?: string;
    platform: ChannelPlatform | null;
}

export interface ConversationSenderIdentity {
    // Tài khoản kênh của hộp thư đang mở: tin chủ hộp thư gửi thẳng từ ứng dụng của kênh mang danh tính này.
    channelAccount: ChannelAccountIdentity | null;
    // Badge cho tin gửi từ bản cài đặt (nhân viên, bot, tự động, ghi chú).
    installation: ChannelPlatform | null;
}

export const SenderIdentityContext = createContext<ConversationSenderIdentity | null>(null);

export const useSenderIdentityContext = () => useContext(SenderIdentityContext);
