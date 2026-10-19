// Shape trả về của /api/v1/accounts/{id}/teams (api/v1/models/_team.json.jbuilder).
export interface Team {
    id: number;
    name: string;
    description: string | null;
    allow_auto_assign: boolean;
    icon: string;
    icon_color: string;
    account_id: number;
    is_member: boolean;
}

export interface TeamFormPayload extends Record<string, unknown> {
    name: string;
    description: string;
    allow_auto_assign: boolean;
    icon: string;
    icon_color: string;
}
