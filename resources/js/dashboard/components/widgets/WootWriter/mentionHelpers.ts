import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import type { TeamMeta } from 'dashboard/conversation/types';

// Logic thuần tách từ dashboard/components/widgets/conversation/TagAgents.vue
// (`matchesSearch`, `agentItems`, `teamItems`, `items`) để test được mà không
// cần dựng editor.

export type MentionRecordType = 'user' | 'team';

export type MentionRecord = (AssignableAgent | TeamMeta) & {
    type: MentionRecordType;
    displayName: string;
};

export interface MentionPickerItem {
    id: string;
    record: MentionRecord;
    label: string;
    title: string;
    subtitle?: string;
    group?: string;
}

export type MentionFilter = 'all' | 'agents' | 'teams';

export function matchesMentionSearch(name: string | undefined | null, searchTerm: string): boolean {
    return Boolean(name?.toLowerCase().includes(searchTerm));
}

function toAgentItem(agent: AssignableAgent): MentionPickerItem {
    return {
        id: `user-${agent.id}`,
        record: { ...agent, type: 'user', displayName: agent.name },
        label: agent.name,
        title: agent.name,
        subtitle: agent.email ?? undefined,
    };
}

function toTeamItem(team: TeamMeta): MentionPickerItem {
    return {
        id: `team-${team.id}`,
        record: { ...team, type: 'team', displayName: team.name },
        label: team.name,
        title: team.name,
        subtitle: team.description ?? undefined,
    };
}

interface MentionItemsInput {
    agents: AssignableAgent[];
    teams: TeamMeta[];
    searchKey: string;
    filter: MentionFilter;
    agentsGroupLabel: string;
    teamsGroupLabel: string;
}

export function buildMentionItems({
    agents,
    teams,
    searchKey,
    filter,
    agentsGroupLabel,
    teamsGroupLabel,
}: MentionItemsInput): MentionPickerItem[] {
    const searchTerm = searchKey.trim().toLowerCase();
    const agentItems = agents.filter(agent => matchesMentionSearch(agent.name, searchTerm)).map(toAgentItem);
    const teamItems = teams.filter(team => matchesMentionSearch(team.name, searchTerm)).map(toTeamItem);

    if (filter === 'agents') return agentItems;
    if (filter === 'teams') return teamItems;

    return [
        ...agentItems.map(item => ({ ...item, group: agentsGroupLabel })),
        ...teamItems.map(item => ({ ...item, group: teamsGroupLabel })),
    ];
}

export function countMentionItems(
    agents: AssignableAgent[],
    teams: TeamMeta[],
    searchKey: string,
): { agents: number; teams: number } {
    const searchTerm = searchKey.trim().toLowerCase();

    return {
        agents: agents.filter(agent => matchesMentionSearch(agent.name, searchTerm)).length,
        teams: teams.filter(team => matchesMentionSearch(team.name, searchTerm)).length,
    };
}
