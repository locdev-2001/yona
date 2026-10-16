import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useCallback } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { useAgentsList } from 'dashboard/composables/useAgentsList';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { DEFAULT_ASSIGNEE_TYPE, resolveAgentSelection, resolveAssignedAgent, shouldShowSelfAssign } from './contact/assignmentOptions';

// Giao người phụ trách cho hội thoại đang mở (nút Phụ trách ở mũ khung chat).
export function useConversationAssignment() {
    const { auth, currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const { selectedConversation, assignAgent } = useConversation();
    const { agentsList } = useAgentsList(false, { includeAgentBots: isProductFeatureVisible('agentBots') });

    const currentUser = auth.user!;
    const assignedAgent = selectedConversation
        ? resolveAssignedAgent(selectedConversation.meta.assignee, selectedConversation.meta.assignee_type)
        : null;
    const isAssignedToMe = !shouldShowSelfAssign(assignedAgent, currentUser.id);

    const assign = useCallback(
        (agent: AssignableAgent | null) => {
            assignAgent(agent, agent ? agent.assignee_type || DEFAULT_ASSIGNEE_TYPE : null)
                .then(() => useAlert(t('CONVERSATION.CHANGE_AGENT')))
                .catch(() => useAlert(t('CONVERSATION.CHANGE_AGENT_FAILED')));
        },
        [assignAgent],
    );

    const selfAssign = () =>
        assign({
            account_id: currentAccount.id,
            availability_status: currentAccountUser.availability,
            available_name: currentUser.display_name || currentUser.name,
            email: currentUser.email,
            id: currentUser.id,
            name: currentUser.name,
            role: currentAccountUser.role,
            thumbnail: currentUser.avatar_url,
        });

    // Bấm lại đúng người đang phụ trách là bỏ giao.
    const toggleAgent = (agent: AssignableAgent) => assign(resolveAgentSelection(assignedAgent, agent));

    return {
        agentsList,
        assignedAgent,
        isAssignedToMe,
        selfAssign,
        toggleAgent,
        unassign: () => assign(null),
    };
}
