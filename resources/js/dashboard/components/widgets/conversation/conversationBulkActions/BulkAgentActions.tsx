import { useCallback, useState } from 'react';

import { fetchAssignableAgentsForInboxes } from 'dashboard/conversation/bulkApi';
import type { AssignableAgent, BulkActionAgent } from 'dashboard/conversation/bulkApi';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../../../../i18n';
import BulkActionDropdown from './BulkActionDropdown';
import ConfirmationFooter from './ConfirmationFooter';
import { confirmationLabel } from './confirmationLabel';

// Port từ conversationBulkActions/BulkAgentActions.vue — nạp danh sách agent mỗi
// lần mở dropdown như gốc (store `inboxAssignableAgents` thay bằng state cục bộ vì
// khóa ở đây là TẬP inbox, không phải một inbox).
interface BulkAgentActionsProps {
    accountId: number;
    selectedInboxes: number[];
    conversationCount: number;
    isUpdating: boolean;
    onSelect: (agent: BulkActionAgent) => void;
}

const NONE_AGENT = (): BulkActionAgent => ({ id: null, name: t('BULK_ACTION.NONE') });

export default function BulkAgentActions({
    accountId,
    selectedInboxes,
    conversationCount,
    isUpdating,
    onSelect,
}: BulkAgentActionsProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<BulkActionAgent | null>(null);
    const [agents, setAgents] = useState<AssignableAgent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const menuItems: DropdownMenuItem[] = [
        {
            action: 'select',
            value: 'none',
            label: t('BULK_ACTION.NONE'),
            thumbnail: { name: t('BULK_ACTION.NONE'), src: '' },
            isSelected: selectedAgent?.id === null,
        },
        ...agents.map(agent => ({
            action: 'select',
            value: agent.id,
            label: agent.name,
            thumbnail: { name: agent.name, src: agent.thumbnail ?? '', seed: avatarSeed('user', agent.id) },
            isSelected: selectedAgent?.id === agent.id,
        })),
    ];

    const handleSelectAgent = (item: DropdownMenuItem) => {
        if (item.value === 'none') {
            setSelectedAgent(NONE_AGENT());
            return;
        }
        const agent = agents.find(item2 => item2.id === item.value);
        setSelectedAgent(agent ? { id: agent.id, name: agent.name } : NONE_AGENT());
    };

    const handleAssign = () => {
        if (isUpdating || !selectedAgent) return;
        onSelect(selectedAgent);
        setSelectedAgent(null);
        setShowDropdown(false);
    };

    const handleDismiss = useCallback(() => {
        setSelectedAgent(null);
        setShowDropdown(false);
    }, []);

    const handleToggleDropdown = () => {
        const willOpen = !showDropdown;
        setShowDropdown(willOpen);

        if (willOpen && selectedInboxes.length > 0) {
            setIsLoading(true);
            fetchAssignableAgentsForInboxes(accountId, selectedInboxes)
                .then(setAgents)
                .catch(() => setAgents([]))
                .finally(() => setIsLoading(false));
        }
    };

    const footerLabel = selectedAgent?.id
        ? confirmationLabel('BULK_ACTION.ASSIGN_AGENT_CONFIRMATION_LABEL', conversationCount, {
              agentName: selectedAgent.name,
          })
        : confirmationLabel('BULK_ACTION.UNASSIGN_AGENT_CONFIRMATION_LABEL', conversationCount);

    return (
        <BulkActionDropdown
            icon="i-lucide-user-round-check"
            tooltip={t('BULK_ACTION.ASSIGN_AGENT_TOOLTIP')}
            isOpen={showDropdown}
            menuItems={menuItems}
            menuClassName="ltr:-right-10 rtl:-left-10 ltr:2xl:right-0 rtl:2xl:left-0 bottom-8 w-60 max-h-80"
            isLoading={isLoading}
            showSearch
            searchPlaceholder={t('BULK_ACTION.SEARCH_INPUT_PLACEHOLDER')}
            footer={
                selectedAgent ? (
                    <ConfirmationFooter
                        label={footerLabel}
                        isUpdating={isUpdating}
                        onCancel={() => setSelectedAgent(null)}
                        onConfirm={handleAssign}
                    />
                ) : undefined
            }
            onToggle={handleToggleDropdown}
            onDismiss={handleDismiss}
            onAction={handleSelectAgent}
        />
    );
}
