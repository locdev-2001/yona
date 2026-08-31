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
