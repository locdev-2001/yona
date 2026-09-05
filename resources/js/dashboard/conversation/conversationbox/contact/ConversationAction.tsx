import { useMemo } from 'react';

import MultiselectDropdown from 'shared/components/ui/MultiselectDropdown';
import type { MultiselectOption } from 'shared/components/ui/MultiselectDropdown';
import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../../../i18n';
import { useConversation } from '../../ConversationContext';
import ContactDetailsItem from './ContactDetailsItem';
import { buildPriorityOptions, findPriorityOption, resolvePrioritySelection } from './priorityOptions';
import type { PriorityOption } from './priorityOptions';

// Port từ routes/dashboard/conversation/ConversationAction.vue — CHỈ khối priority.
// Khối "Assigned Agent" / "Assigned Team" (MultiselectDropdown + self-assign) là B6,
// khối "Conversation Labels" (LabelBox) là B7 — chưa dựng, giữ nguyên thứ tự gốc khi thêm.
// `useTrack` (analytics Chatwoot) không port.
export default function ConversationAction() {
    const { selectedConversation, togglePriority } = useConversation();

    const priorityOptions = useMemo(() => buildPriorityOptions(), []);

    if (!selectedConversation) return null;

    const assignedPriority = findPriorityOption(priorityOptions, selectedConversation.priority);

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
        </div>
    );
}
