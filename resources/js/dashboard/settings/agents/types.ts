// Shape trả về của /api/v1/accounts/{id}/agents (api/v1/models/_agent.json.jbuilder).
export interface Agent {
    id: number;
    account_id: number;
    availability_status: 'online' | 'offline' | 'busy';
    auto_offline: boolean;
    confirmed: boolean;
    email: string;
    provider: string;
    available_name: string;
    custom_attributes: Record<string, unknown>;
    name: string;
    role: 'agent' | 'administrator';
    thumbnail: string;
}

export interface InviteLink {
    id: number;
    role: 'agent' | 'administrator';
    status: 'active' | 'revoked' | 'expired' | 'exhausted';
    expires_at: string;
    max_uses: number | null;
    use_count: number;
    revoked_at: string | null;
    created_by_name: string | null;
}

export interface CreatedInviteLink {
    link: InviteLink;
    url: string;
}
