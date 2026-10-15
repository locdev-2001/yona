import type { ChannelPlatform } from 'shared/constants/channelPlatform';

export interface AiAgent {
    id: number;
    name: string;
    persona: string | null;
    instructions: string | null;
    enabled: boolean;
    avatar_url: string;
    inbox_ids: number[];
    auto_reply_conversations_count: number;
}

export interface AiAgentInbox {
    id: number;
    name: string;
    channel_type: string;
    platform: ChannelPlatform | null;
    ai_agent_id: number | null;
    auto_reply_conversations_count: number;
}

export interface AiAgentFormValues {
    name: string;
    persona: string;
    instructions: string;
    inbox_ids: number[];
}

export interface AiAgentsIndexResponse {
    payload: AiAgent[];
    inboxes: AiAgentInbox[];
}
