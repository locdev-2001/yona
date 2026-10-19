import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { Person } from 'shared/people/person';

export type FriendshipState = 'none' | 'outgoing' | 'incoming' | 'friends';

export interface FriendRequest {
    id: number;
    created_at: string;
    person: Person;
}

export interface PendingFriendRequests {
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
}

export interface FriendshipProfile {
    person: Person & { joined_at: string | null };
    state: FriendshipState;
    friendship_id: number | null;
    friends_since: string | null;
}

const FRIENDSHIPS_URL = '/api/v1/friendships';

export async function fetchPendingFriendRequests(): Promise<PendingFriendRequests> {
    return (await getJson<{ payload: PendingFriendRequests }>(FRIENDSHIPS_URL)).payload;
}

export async function fetchFriendshipProfile(userId: number): Promise<FriendshipProfile> {
    return (await getJson<{ payload: FriendshipProfile }>(`${FRIENDSHIPS_URL}/with/${userId}`)).payload;
}

export async function sendFriendRequest(userId: number): Promise<FriendshipProfile> {
    return (await postJson<{ payload: FriendshipProfile }>(FRIENDSHIPS_URL, { user_id: userId })).payload;
}

export async function acceptFriendRequest(friendshipId: number): Promise<FriendshipProfile> {
    return (await postJson<{ payload: FriendshipProfile }>(`${FRIENDSHIPS_URL}/${friendshipId}/accept`, {})).payload;
}

// Từ chối, huỷ lời mời và huỷ kết bạn.
export function removeFriendship(friendshipId: number): Promise<unknown> {
    return deleteJson(`${FRIENDSHIPS_URL}/${friendshipId}`);
}
