import { useEffect } from 'react';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { usePage } from '@inertiajs/react';

import { useAgentsList } from 'dashboard/composables/useAgentsList';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { useConversation } from 'dashboard/conversation/ConversationContext';
import { STATUS_TYPE } from 'dashboard/conversation/constants';
import { updateConversationLabels } from 'dashboard/conversation/labelApi';
import {
    activeLabels as resolveActiveLabels,
    inactiveLabels as resolveInactiveLabels,
    titlesAfterAdd,
    titlesAfterRemove,
} from 'dashboard/conversation/labelHelpers';
import { useTeamsList } from 'dashboard/conversation/conversationbox/contact/useTeamsList';
import type { TeamMeta } from 'dashboard/conversation/types';
import { buildPriorityOptions } from 'dashboard/conversation/conversationbox/contact/priorityOptions';
import {
    MUTE_ACTION,
    OPEN_CONVERSATION_ACTIONS,
    RESOLVED_CONVERSATION_ACTIONS,
    SEND_TRANSCRIPT_ACTION,
    SNOOZE_CONVERSATION_ACTIONS,
    UNMUTE_ACTION,
} from 'dashboard/helper/commandbar/actions';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import {
    ICON_ADD_LABEL,
    ICON_ASSIGN_AGENT,
    ICON_ASSIGN_PRIORITY,
    ICON_ASSIGN_TEAM,
    ICON_PRIORITY_HIGH,
    ICON_PRIORITY_LOW,
    ICON_PRIORITY_MEDIUM,
    ICON_PRIORITY_NONE,
    ICON_PRIORITY_URGENT,
    ICON_REMOVE_LABEL,
} from 'dashboard/helper/commandbar/icons';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

const SOURCE = 'conversation';

const prepareActions = (actions: CommandBarAction[]): CommandBarAction[] =>
    actions.map(action => ({ ...action, title: t(action.title), section: t(action.section) }));

const PRIORITY_ICONS: Record<string, string> = {
    none: ICON_PRIORITY_NONE,
    urgent: ICON_PRIORITY_URGENT,
    high: ICON_PRIORITY_HIGH,
    medium: ICON_PRIORITY_MEDIUM,
    low: ICON_PRIORITY_LOW,
};

// Nhánh cha + con của một nhóm action (assign agent/team/priority) — gốc lặp
// nguyên khối này ba lần trong useConversationHotKeys.js.
function buildParentAction(
    parentId: string,
    parentTitleKey: string,
    icon: string,
    options: CommandBarAction[],
): CommandBarAction[] {
    return [
        {
            id: parentId,
            title: t(parentTitleKey),
            section: t('COMMAND_BAR.SECTIONS.CONVERSATION'),
            icon,
            children: options.map(option => option.id),
        },
        ...options,
    ];
}

// Port từ composables/commands/useConversationHotKeys.js. Bỏ: macro (D3),
// AI assist (Captain/EE), `contextMenuChatId` (context menu thẻ hội thoại chưa port).
// Gốc chỉ bật ở route conversation/inbox — hook này chỉ được gọi từ ConversationView
// nên tương đương.
export function useConversationHotKeys(): void {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { selectedConversation, assignAgent, assignTeam, togglePriority } = useConversation();
    const { agentsList } = useAgentsList();
    const teams = useTeamsList(accountId);
    const accountLabels = useLabelsList(accountId);

    const conversationId = selectedConversation?.id ?? 0;
    const status = selectedConversation?.status;
    const muted = selectedConversation?.muted;
    const priority = selectedConversation?.priority ?? null;
    const hasAssignedTeam = Boolean(selectedConversation?.meta?.team);
    const savedLabels = selectedConversation?.labels ?? [];

    const agentsKey = agentsList.map(agent => agent.id).join('|');
    const teamsKey = teams.map(team => team.id).join('|');
    const labelsKey = accountLabels.map(label => label.title).join('|');
    const savedLabelsKey = savedLabels.join('|');

    useEffect(() => {
        if (!selectedConversation) {
            clearCommandBarActions(SOURCE);
            return undefined;
        }

        let statusActions: CommandBarAction[] = [];
        if (status === STATUS_TYPE.OPEN) {
            statusActions = [...OPEN_CONVERSATION_ACTIONS, ...SNOOZE_CONVERSATION_ACTIONS];
        } else if (status === STATUS_TYPE.RESOLVED || status === STATUS_TYPE.SNOOZED) {
            statusActions = RESOLVED_CONVERSATION_ACTIONS;
        }
        const additionalActions = [muted ? UNMUTE_ACTION : MUTE_ACTION, SEND_TRANSCRIPT_ACTION];

        const agentOptions: CommandBarAction[] = agentsList.map(agent => ({
            id: `agent-${agent.id}`,
            title: agent.name,
            parent: 'assign_an_agent',
            section: t('COMMAND_BAR.SECTIONS.CHANGE_ASSIGNEE'),
            icon: ICON_ASSIGN_AGENT,
            handler: () => {
                const target = agent as AssignableAgent;
                void assignAgent(target.id ? target : null, target.id ? target.assignee_type || 'User' : null);
            },
        }));

        // teamsList gốc: chèn "None" khi hội thoại đang có team.
        const teamsList: TeamMeta[] = hasAssignedTeam
            ? [{ id: 0, name: t('TEAMS_SETTINGS.LIST.NONE') } as TeamMeta, ...teams]
            : teams;
        const teamOptions: CommandBarAction[] = teamsList.map(team => ({
            id: `team-${team.id}`,
            title: team.name,
            parent: 'assign_a_team',
            section: t('COMMAND_BAR.SECTIONS.CHANGE_TEAM'),
            icon: ICON_ASSIGN_TEAM,
            handler: () => void assignTeam(team.id ? team : null),
        }));

        // createPriorityOptions gốc: bỏ mức đang áp dụng khỏi danh sách.
        const priorityOptions: CommandBarAction[] = buildPriorityOptions()
            .filter(option => option.id !== priority)
            .map(option => ({
                id: `priority-${option.id}`,
                title: option.name,
                parent: 'assign_priority',
                section: t('COMMAND_BAR.SECTIONS.CHANGE_PRIORITY'),
                icon: PRIORITY_ICONS[option.id ?? 'none'],
                handler: () => void togglePriority(option.id),
            }));

        const currentActiveLabels = resolveActiveLabels(accountLabels, savedLabels);
        const currentInactiveLabels = resolveInactiveLabels(accountLabels, savedLabels);

        const addLabelActions: CommandBarAction[] = [
            ...currentInactiveLabels.map(label => ({
                id: label.title,
                title: `#${label.title}`,
                parent: 'add_a_label_to_the_conversation',
                section: t('COMMAND_BAR.SECTIONS.ADD_LABEL'),
                icon: ICON_ADD_LABEL,
                handler: () => {
                    void updateConversationLabels(
                        accountId,
                        conversationId,
                        titlesAfterAdd(currentActiveLabels, label.title),
                    );
                },
            })),
            {
                id: 'add_a_label_to_the_conversation',
                title: t('COMMAND_BAR.COMMANDS.ADD_LABELS_TO_CONVERSATION'),
                section: t('COMMAND_BAR.SECTIONS.CONVERSATION'),
                icon: ICON_ADD_LABEL,
                children: currentInactiveLabels.map(label => label.title),
            },
        ];

        const removeLabelActions: CommandBarAction[] = [
            ...currentActiveLabels.map(label => ({
                id: label.title,
                title: `#${label.title}`,
                parent: 'remove_a_label_to_the_conversation',
                section: t('COMMAND_BAR.SECTIONS.REMOVE_LABEL'),
                icon: ICON_REMOVE_LABEL,
                handler: () => {
                    void updateConversationLabels(
                        accountId,
                        conversationId,
                        titlesAfterRemove(currentActiveLabels, label.title),
                    );
                },
            })),
            {
                id: 'remove_a_label_to_the_conversation',
                title: t('COMMAND_BAR.COMMANDS.REMOVE_LABEL_FROM_CONVERSATION'),
                section: t('COMMAND_BAR.SECTIONS.CONVERSATION'),
                icon: ICON_REMOVE_LABEL,
                children: currentActiveLabels.map(label => label.title),
            },
        ];

        setCommandBarActions(SOURCE, [
            ...prepareActions([...statusActions, ...additionalActions]),
            ...buildParentAction(
                'assign_an_agent',
                'COMMAND_BAR.COMMANDS.ASSIGN_AN_AGENT',
                ICON_ASSIGN_AGENT,
                agentOptions,
            ),
            ...(isProductFeatureVisible('teams') ? buildParentAction(
                'assign_a_team',
                'COMMAND_BAR.COMMANDS.ASSIGN_A_TEAM',
                ICON_ASSIGN_TEAM,
                teamOptions,
            ) : []),
            ...addLabelActions,
            ...(currentActiveLabels.length ? removeLabelActions : []),
            ...(isProductFeatureVisible('conversationPriority') ? buildParentAction(
                'assign_priority',
                'COMMAND_BAR.COMMANDS.ASSIGN_PRIORITY',
                ICON_ASSIGN_PRIORITY,
                priorityOptions,
            ) : []),
        ]);

        return () => clearCommandBarActions(SOURCE);
        // Chỉ dữ liệu hiển thị trong danh sách mới ảnh hưởng action.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, status, muted, priority, hasAssignedTeam, agentsKey, teamsKey, labelsKey, savedLabelsKey]);
}
