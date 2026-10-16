import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import MultiselectDropdown from 'shared/components/ui/MultiselectDropdown';
import type { MultiselectOption } from 'shared/components/ui/MultiselectDropdown';
import NextButton from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useConversation } from '../../ConversationContext';
import type { TeamMeta } from '../../types';
import ContactDetailsItem from './ContactDetailsItem';
import LabelBox from './LabelBox';
import { agentOptionAvatarSeed, buildTeamsList, resolveTeamSelection, teamOptionAvatarSeed } from './assignmentOptions';
import { buildPriorityOptions, findPriorityOption, resolvePrioritySelection } from './priorityOptions';
import type { PriorityOption } from './priorityOptions';
import { useConversationAssignment } from './useConversationAssignment';
import { useTeamsList } from './useTeamsList';

// Port từ routes/dashboard/conversation/ConversationAction.vue — khối Assignee /
// Team / Priority / Conversation Labels, đúng thứ tự bản gốc.
// Không gửi analytics theo dõi thao tác.
export default function ConversationAction() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const { selectedConversation, assignTeam, togglePriority } = useConversation();
    const { agentsList, assignedAgent, isAssignedToMe, selfAssign, toggleAgent } = useConversationAssignment();
    const teams = useTeamsList(currentAccount.id);

    const priorityOptions = useMemo(() => buildPriorityOptions(), []);

    if (!selectedConversation) return null;

    const assignedTeam = selectedConversation.meta.team ?? null;
    const teamsList = buildTeamsList(teams, Boolean(assignedTeam), t('TEAMS_SETTINGS.LIST.NONE'));
    const assignedPriority = findPriorityOption(priorityOptions, selectedConversation.priority);

    const onClickAssignTeam = (selectedItem: MultiselectOption) => {
        assignTeam(resolveTeamSelection(assignedTeam, selectedItem as TeamMeta))
            .then(() => useAlert(t('CONVERSATION.CHANGE_TEAM')))
            .catch(() => undefined);
    };

    const onClickAssignPriority = (selectedItem: MultiselectOption) => {
        const nextPriority = resolvePrioritySelection(
            priorityOptions,
            assignedPriority,
            selectedItem as PriorityOption,
        );

        togglePriority(nextPriority.id)
            .then(() =>
                useAlert(
                    t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.SUCCESSFUL', {
                        priority: nextPriority.name,
                        conversationId: selectedConversation.id,
                    }),
                ),
            )
            .catch(() => useAlert(t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.FAILED')));
    };

    return (
        <div>
            <div>
                <ContactDetailsItem
                    compact
                    title={t('CONVERSATION_SIDEBAR.ASSIGNEE_LABEL')}
                    button={
                        !isAssignedToMe ? (
                            <NextButton
                                link
                                xs
                                icon="i-lucide-arrow-right"
                                className="!gap-1"
                                label={t('CONVERSATION_SIDEBAR.SELF_ASSIGN')}
                                onClick={selfAssign}
                            />
                        ) : null
                    }
                />
                <MultiselectDropdown
                    options={agentsList}
                    selectedItem={assignedAgent}
                    avatarSeedOf={agentOptionAvatarSeed}
                    multiselectorTitle={t('AGENT_MGMT.MULTI_SELECTOR.TITLE.AGENT')}
                    multiselectorPlaceholder={t('AGENT_MGMT.MULTI_SELECTOR.PLACEHOLDER')}
                    noSearchResult={t('AGENT_MGMT.MULTI_SELECTOR.SEARCH.NO_RESULTS.AGENT')}
                    inputPlaceholder={t('AGENT_MGMT.MULTI_SELECTOR.SEARCH.PLACEHOLDER.AGENT')}
                    onSelect={selectedItem => toggleAgent(selectedItem as AssignableAgent)}
                />
            </div>
            {isProductFeatureVisible('teams') ? (
                <div>
                    <ContactDetailsItem compact title={t('CONVERSATION_SIDEBAR.TEAM_LABEL')} />
                    <MultiselectDropdown
                        options={teamsList}
                        selectedItem={assignedTeam}
                        avatarSeedOf={teamOptionAvatarSeed}
                        showEmojiIcon
                        multiselectorTitle={t('AGENT_MGMT.MULTI_SELECTOR.TITLE.TEAM')}
                        multiselectorPlaceholder={t('AGENT_MGMT.MULTI_SELECTOR.PLACEHOLDER')}
                        noSearchResult={t('AGENT_MGMT.MULTI_SELECTOR.SEARCH.NO_RESULTS.TEAM')}
                        inputPlaceholder={t('AGENT_MGMT.MULTI_SELECTOR.SEARCH.PLACEHOLDER.TEAM')}
                        onSelect={onClickAssignTeam}
                    />
                </div>
            ) : null}
            {isProductFeatureVisible('conversationPriority') ? (
                <div>
                    <ContactDetailsItem compact title={t('CONVERSATION.PRIORITY.TITLE')} />
                    <MultiselectDropdown
                        options={priorityOptions}
                        selectedItem={assignedPriority}
                        multiselectorTitle={t('CONVERSATION.PRIORITY.TITLE')}
                        multiselectorPlaceholder={t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.SELECT_PLACEHOLDER')}
                        noSearchResult={t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.NO_RESULTS')}
                        inputPlaceholder={t('CONVERSATION.PRIORITY.CHANGE_PRIORITY.INPUT_PLACEHOLDER')}
                        onSelect={onClickAssignPriority}
                    />
                </div>
            ) : null}
            <ContactDetailsItem compact title={t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_LABELS')} />
            <LabelBox />
        </div>
    );
}
