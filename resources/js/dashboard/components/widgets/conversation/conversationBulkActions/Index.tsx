import { useCallback, useEffect, useState } from 'react';
import { getUnixTime } from 'date-fns';

import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import NextButton from 'dashboard/components-next/button/Button';
import CustomSnoozeModal from 'dashboard/components/CustomSnoozeModal';
import Modal from 'dashboard/components/Modal';
import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { STATUS_TYPE } from 'dashboard/conversation/constants';
import type { BulkActionAgent, BulkActionTeam } from 'dashboard/conversation/bulkApi';
import type { ConversationStatus } from 'dashboard/conversation/types';
import {
    CMD_BULK_ACTION_REOPEN_CONVERSATION,
    CMD_BULK_ACTION_RESOLVE_CONVERSATION,
    CMD_BULK_ACTION_SNOOZE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import { findSnoozeTime } from 'dashboard/helper/snoozeHelpers';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../../../../i18n';
import BulkAgentActions from './BulkAgentActions';
import BulkLabelActions from './BulkLabelActions';
import BulkTeamActions from './BulkTeamActions';
import BulkUpdateActions from './BulkUpdateActions';

// Port từ conversationBulkActions/Index.vue.
interface ConversationBulkActionsProps {
    accountId: number;
    conversations: number[];
    allConversationsSelected: boolean;
    selectedInboxes: number[];
    // appliedLabelsForSelection gốc — hợp nhãn của mọi hội thoại đang chọn.
    appliedLabels: string[];
    showOpenAction?: boolean;
    showResolvedAction?: boolean;
    showSnoozedAction?: boolean;
    isUpdating: boolean;
    className?: string;
    onSelectAllConversations: (checked: boolean) => void;
    onAssignAgent: (agent: BulkActionAgent) => void;
    onAssignTeam: (team: BulkActionTeam) => void;
    onAssignLabels: (labels: string[]) => void;
    onRemoveLabels: (labels: string[]) => void;
    onUpdateConversations: (status: ConversationStatus, snoozedUntil?: number | null) => void;
}

export default function ConversationBulkActions({
    accountId,
    conversations,
    allConversationsSelected,
    selectedInboxes,
    appliedLabels,
    showOpenAction = false,
    showResolvedAction = false,
    showSnoozedAction = false,
    isUpdating,
    className = '',
    onSelectAllConversations,
    onAssignAgent,
    onAssignTeam,
    onAssignLabels,
    onRemoveLabels,
    onUpdateConversations,
}: ConversationBulkActionsProps) {
    const [showCustomTimeSnoozeModal, setShowCustomTimeSnoozeModal] = useState(false);

    useEffect(() => {
        const onCmdSnoozeConversation = (snoozeType: unknown) => {
            if (snoozeType === SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME) {
                setShowCustomTimeSnoozeModal(true);
            } else if (typeof snoozeType === 'number') {
                onUpdateConversations(STATUS_TYPE.SNOOZED, snoozeType);
            } else {
                onUpdateConversations(STATUS_TYPE.SNOOZED, findSnoozeTime(String(snoozeType)) || null);
            }
        };
        const onCmdReopenConversation = () => onUpdateConversations(STATUS_TYPE.OPEN, null);
        const onCmdResolveConversation = () => onUpdateConversations(STATUS_TYPE.RESOLVED, null);

        emitter.on(CMD_BULK_ACTION_SNOOZE_CONVERSATION, onCmdSnoozeConversation);
        emitter.on(CMD_BULK_ACTION_REOPEN_CONVERSATION, onCmdReopenConversation);
        emitter.on(CMD_BULK_ACTION_RESOLVE_CONVERSATION, onCmdResolveConversation);

        return () => {
            emitter.off(CMD_BULK_ACTION_SNOOZE_CONVERSATION, onCmdSnoozeConversation);
            emitter.off(CMD_BULK_ACTION_REOPEN_CONVERSATION, onCmdReopenConversation);
            emitter.off(CMD_BULK_ACTION_RESOLVE_CONVERSATION, onCmdResolveConversation);
        };
    }, [onUpdateConversations]);

    const hideCustomSnoozeModal = useCallback(() => setShowCustomTimeSnoozeModal(false), []);

    const chooseCustomSnoozeTime = (customSnoozedTime: Date | null) => {
        setShowCustomTimeSnoozeModal(false);
        if (customSnoozedTime) {
            onUpdateConversations(STATUS_TYPE.SNOOZED, getUnixTime(customSnoozedTime));
        }
    };

    const selectedLabel = t('BULK_ACTION.CONVERSATIONS_SELECTED', { conversationCount: conversations.length });

    return (
        <>
            {conversations.length > 0 ? (
                <div
                    className={`px-2 absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full origin-bottom ${className}`.trim()}
                >
                    {allConversationsSelected ? (
                        <div className="bg-n-amber-2 outline -outline-offset-1 outline-1 outline-n-amber-5 rounded-lg text-sm mb-2 py-1.5 px-2 text-n-amber-text">
                            {t('BULK_ACTION.ALL_CONVERSATIONS_SELECTED_ALERT')}
                        </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 p-2 bg-n-button-color outline outline-1 -outline-offset-1 rounded-[10px] outline-n-weak shadow-[0_0_12px_0_rgba(27,40,59,0.08)]">
                        <div className="ms-0.5 flex items-center gap-1 min-w-0">
                            <label className="cursor-pointer flex items-center gap-1.5 min-w-0">
                                <Checkbox
                                    checked={allConversationsSelected}
                                    indeterminate={!allConversationsSelected}
                                    className="flex-shrink-0"
                                    onChange={() => onSelectAllConversations(!allConversationsSelected)}
                                />
                                <span title={selectedLabel} className="cursor-pointer truncate">
                                    {selectedLabel}
                                </span>
                            </label>
                            <div className="w-px h-3 bg-n-weak rounded-lg ms-1 flex-shrink-0" />
                            <NextButton
                                label={t('BULK_ACTION.CLEAR_SELECTION')}
                                ghost
                                className="!text-n-blue-11 !px-1 !h-6 flex-shrink-0"
                                sm
                                onClick={() => onSelectAllConversations(false)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <BulkLabelActions onApply={onAssignLabels} />
                            <BulkLabelActions
                                action="remove"
                                appliedLabels={appliedLabels}
                                onApply={onRemoveLabels}
                            />
                            <BulkUpdateActions
                                showResolve={!showResolvedAction}
                                showReopen={!showOpenAction}
                                showSnooze={!showSnoozedAction}
                                onUpdate={onUpdateConversations}
                            />
                            <BulkAgentActions
                                accountId={accountId}
                                selectedInboxes={selectedInboxes}
                                conversationCount={conversations.length}
                                isUpdating={isUpdating}
                                onSelect={onAssignAgent}
                            />
                            <BulkTeamActions
                                accountId={accountId}
                                conversationCount={conversations.length}
                                isUpdating={isUpdating}
                                onSelect={onAssignTeam}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
            <Modal show={showCustomTimeSnoozeModal} onClose={hideCustomSnoozeModal}>
                <CustomSnoozeModal onClose={hideCustomSnoozeModal} onChooseTime={chooseCustomSnoozeTime} />
            </Modal>
        </>
    );
}
