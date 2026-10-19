import { useCallback, useEffect, useState } from 'react';

import { fetchTeams } from 'dashboard/conversation/bulkApi';
import type { BulkActionTeam } from 'dashboard/conversation/bulkApi';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { t } from '../../../../../i18n';
import BulkActionDropdown from './BulkActionDropdown';
import ConfirmationFooter from './ConfirmationFooter';
import { confirmationLabel } from './confirmationLabel';

// Port từ conversationBulkActions/BulkTeamActions.vue. Getter `teams/getTeams` = mọi
// team của account (props Inertia chỉ có team của user) → nạp qua GET /teams lần đầu mở.
interface BulkTeamActionsProps {
    accountId: number;
    conversationCount: number;
    isUpdating: boolean;
    onSelect: (team: BulkActionTeam) => void;
}

const NONE_TEAM = (): BulkActionTeam => ({ id: 0, name: t('BULK_ACTION.TEAMS.NONE') });

export default function BulkTeamActions({
    accountId,
    conversationCount,
    isUpdating,
    onSelect,
}: BulkTeamActionsProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<BulkActionTeam | null>(null);
    const [teams, setTeams] = useState<BulkActionTeam[]>([]);

    useEffect(() => {
        if (!showDropdown) return;
        fetchTeams(accountId)
            .then(setTeams)
            .catch(() => setTeams([]));
    }, [showDropdown, accountId]);

    const menuItems: DropdownMenuItem[] = [
        {
            action: 'select',
            value: 'none',
            label: t('BULK_ACTION.TEAMS.NONE'),
            isSelected: selectedTeam?.id === 0,
        },
        ...teams.map(team => ({
            action: 'select',
            value: team.id,
            label: team.name,
            isSelected: selectedTeam?.id === team.id,
        })),
    ];

    const handleSelectTeam = (item: DropdownMenuItem) => {
        if (item.value === 'none') {
            setSelectedTeam(NONE_TEAM());
            return;
        }
        const team = teams.find(candidate => candidate.id === item.value);
        setSelectedTeam(team ? { id: team.id, name: team.name } : NONE_TEAM());
    };

    const handleAssign = () => {
        if (isUpdating || !selectedTeam) return;
        onSelect(selectedTeam);
        setSelectedTeam(null);
        setShowDropdown(false);
    };

    const handleDismiss = useCallback(() => {
        setSelectedTeam(null);
        setShowDropdown(false);
    }, []);

    const footerLabel = selectedTeam?.id
        ? confirmationLabel('BULK_ACTION.TEAMS.ASSIGN_TEAM_CONFIRMATION_LABEL', conversationCount, {
              teamName: selectedTeam.name,
          })
        : confirmationLabel('BULK_ACTION.TEAMS.UNASSIGN_TEAM_CONFIRMATION_LABEL', conversationCount);

    return (
        <BulkActionDropdown
            icon="i-lucide-users-round"
            tooltip={t('BULK_ACTION.ASSIGN_TEAM_TOOLTIP')}
            isOpen={showDropdown}
            menuItems={menuItems}
            menuClassName="ltr:-right-2 rtl:-left-2 bottom-8 w-60 max-h-80"
            showSearch
            searchPlaceholder={t('BULK_ACTION.SEARCH_INPUT_PLACEHOLDER')}
            footer={
                selectedTeam ? (
                    <ConfirmationFooter
                        label={footerLabel}
                        isUpdating={isUpdating}
                        onCancel={() => setSelectedTeam(null)}
                        onConfirm={handleAssign}
                    />
                ) : undefined
            }
            onToggle={() => setShowDropdown(open => !open)}
            onDismiss={handleDismiss}
            onAction={handleSelectTeam}
        />
    );
}
