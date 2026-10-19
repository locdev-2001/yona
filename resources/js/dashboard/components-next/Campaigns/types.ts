// Shape của campaign trên API dashboard (_campaign.json.jbuilder) — `id` là
// display_id per-account.
export interface CampaignSender {
    id?: number;
    name?: string;
    thumbnail?: string;
}

export interface CampaignInbox {
    id: number;
    name: string;
    channel_type: string;
}

export interface Campaign {
    id: number;
    title: string;
    description: string | null;
    account_id: number;
    inbox: CampaignInbox;
    sender: CampaignSender | Record<string, never>;
    message: string;
    campaign_status: 'active' | 'completed' | 'processing';
    campaign_type: 'ongoing' | 'one_off';
    enabled: boolean;
    trigger_rules: { url?: string; time_on_page?: number };
    trigger_only_during_business_hours: boolean;
    quick_replies?: string[];
    show_to?: CampaignAudience;
    created_at: string;
    updated_at: string;
}

// Payload gửi lên khi tạo/sửa campaign live chat.
export interface LiveChatCampaignPayload {
    title: string;
    message: string;
    inbox_id: number | null;
    sender_id: number | null;
    enabled: boolean;
    trigger_only_during_business_hours: boolean;
    trigger_rules: { url: string; time_on_page: number };
    quick_replies: string[];
    show_to: CampaignAudience;
}

/** Lời mời hiện cho ai (khớp Campaign::SHOW_TO). */
export type CampaignAudience = 'all' | 'new' | 'returning';
