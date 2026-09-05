import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import type { AvailabilityStatus } from '../../../types';
import type { AgentMeta, TeamMeta } from '../../types';

// Logic thuần tách từ ConversationAction.vue (khối Assignee + Team) để test được:
// `assignedAgent` get/set, `showSelfAssign`, `teamsList`, `onClickAssignAgent/Team`.

export const DEFAULT_ASSIGNEE_TYPE = 'User';

export function resolveAssignedAgent(
    assignee: AgentMeta | undefined,
    assigneeType: string | undefined,
): AssignableAgent | null {
    if (!assignee) return null;

    return {
        ...assignee,
        availability_status: assignee.availability_status as AvailabilityStatus | undefined,
        assignee_type: assigneeType || DEFAULT_ASSIGNEE_TYPE,
    };
}

export function shouldShowSelfAssign(assignedAgent: AssignableAgent | null, currentUserId: number): boolean {
    if (!assignedAgent) return true;

    return (
        assignedAgent.id !== currentUserId ||
        (assignedAgent.assignee_type || DEFAULT_ASSIGNEE_TYPE) !== DEFAULT_ASSIGNEE_TYPE
    );
}

// Bấm lại đúng agent đang gán → gỡ (null); khác → gán agent vừa chọn.
export function resolveAgentSelection(
    assignedAgent: AssignableAgent | null,
    selectedItem: AssignableAgent,
): AssignableAgent | null {
    const isSameAgent =
        assignedAgent?.id === selectedItem.id &&
        (assignedAgent?.assignee_type || DEFAULT_ASSIGNEE_TYPE) ===
            (selectedItem.assignee_type || DEFAULT_ASSIGNEE_TYPE);

    return isSameAgent ? null : selectedItem;
}

// `teamsList`: chỉ chèn mục "None" khi hội thoại ĐANG có team.
export function buildTeamsList(teams: TeamMeta[], hasAnAssignedTeam: boolean, noneLabel: string): TeamMeta[] {
    return hasAnAssignedTeam ? [{ id: 0, name: noneLabel }, ...teams] : teams;
}

export function resolveTeamSelection(assignedTeam: TeamMeta | null, selectedItem: TeamMeta): TeamMeta | null {
    return assignedTeam && assignedTeam.id === selectedItem.id ? null : selectedItem;
}
