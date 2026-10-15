import type { SharedPageProps } from '../types';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import type { AvailabilityStatus } from './constants/globals';

export interface CurrentAccount {
    id: number;
    name: string;
    locale: string;
    status: number;
    // enabled_features: chỉ chứa feature đang bật ({tên: true}).
    features: Record<string, boolean>;
}

export interface CurrentAccountUser {
    role: 'agent' | 'administrator';
    availability: AvailabilityStatus;
    auto_offline: boolean;
}

export interface UserAccount {
    id: number;
    name: string;
    role: string;
}

export interface DashboardPageProps extends SharedPageProps {
    currentAccount: CurrentAccount;
    currentAccountUser: CurrentAccountUser;
    userAccounts: UserAccount[];
    // Nhóm Channels trên sidebar (share từ SetCurrentAccount).
    inboxes?: {
        id: number;
        name: string;
        channel_type: string;
        capabilities?: readonly string[];
        // Kênh mất phiên xác thực (Zalo mất phiên, Facebook/Instagram bị Meta thu hồi
        // quyền, …) — điều khiển icon cảnh báo sidebar + banner khung chat.
        reauthorization_required?: boolean;
        // Ảnh tài khoản kênh ('' khi chưa có) — tin gửi từ điện thoại mang ảnh này.
        avatar_url?: string;
        platform?: ChannelPlatform | null;
        // AI agent gắn với kênh, kể cả khi đang tắt; null khi kênh chưa gắn AI.
        ai_agent?: { id: number; name: string; enabled: boolean } | null;
    }[];
    // Nhóm Teams trên sidebar — chỉ team user là member (teams/getMyTeams).
    teams?: { id: number; name: string }[];
}

export type { AvailabilityStatus };
