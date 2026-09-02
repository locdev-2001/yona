import type { AvailabilityStatus } from 'dashboard/constants/globals';

export type { AvailabilityStatus };

// Payload `user` của conversation.typing_on/off (Ruby: Conversations::TypingStatusManager → user/contact push_event_data).
export interface TypingUser {
    id: number;
    name: string;
    type: 'user' | 'contact';
    avatar_url?: string;
    thumbnail?: string;
    availability_status?: AvailabilityStatus;
}

// presence.update từ RoomChannel#broadcast_presence: users = {id: status}, contacts = {id: 'online'}.
export interface PresenceUpdatePayload {
    account_id: number;
    users: Record<string, AvailabilityStatus>;
    contacts?: Record<string, 'online'>;
}

export type AgentPresenceMap = Record<number, AvailabilityStatus>;
export type ContactPresenceMap = Record<number, 'online'>;

export interface RealtimeIdentity {
    accountId: number;
    userId: number;
    pubsubToken: string;
}

export type RealtimeEventHandler<T = unknown> = (data: T) => void;
