import { useCallback, useEffect, useState } from 'react';
import { getUnixTime } from 'date-fns';

import CustomSnoozeModal from 'dashboard/components/CustomSnoozeModal';
import Modal from 'dashboard/components/Modal';
import { useAlert } from 'dashboard/composables/useAlert';
import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { useConversation } from 'dashboard/conversation/ConversationContext';
import { STATUS_TYPE } from 'dashboard/conversation/constants';
import { CMD_SNOOZE_CONVERSATION } from 'dashboard/helper/commandbar/events';
import { findSnoozeTime } from 'dashboard/helper/snoozeHelpers';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../i18n';

// Port từ routes/dashboard/commands/CmdBarConversationSnooze.vue: nhận
// CMD_SNOOZE_CONVERSATION từ command bar (preset hoặc epoch) → toggleStatus snoozed;
// "Custom..." mở CustomSnoozeModal. Bỏ: contextMenuChatId (context menu card chưa port).
export default function CmdBarConversationSnooze() {
    const { toggleStatus } = useConversation();
    const [showCustomSnoozeModal, setShowCustomSnoozeModal] = useState(false);

    const snoozeUntil = useCallback(
        async (snoozedUntil: number | null) => {
            await toggleStatus({ status: STATUS_TYPE.SNOOZED, snoozedUntil });
            useAlert(t('CONVERSATION.CHANGE_STATUS'));
        },
        [toggleStatus],
    );

    useEffect(() => {
        const onCmdSnoozeConversation = (snoozeType: unknown) => {
            if (snoozeType === SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME) {
                setShowCustomSnoozeModal(true);
            } else if (typeof snoozeType === 'number') {
                void snoozeUntil(snoozeType);
            } else {
                void snoozeUntil(findSnoozeTime(String(snoozeType)) || null);
            }
        };
        emitter.on(CMD_SNOOZE_CONVERSATION, onCmdSnoozeConversation);
        return () => emitter.off(CMD_SNOOZE_CONVERSATION, onCmdSnoozeConversation);
    }, [snoozeUntil]);

    const hideCustomSnoozeModal = useCallback(() => setShowCustomSnoozeModal(false), []);

    const chooseSnoozeTime = (customSnoozeTime: Date | null) => {
        setShowCustomSnoozeModal(false);
        if (customSnoozeTime) {
            void snoozeUntil(getUnixTime(customSnoozeTime));
        }
    };

    return (
        <Modal show={showCustomSnoozeModal} onClose={hideCustomSnoozeModal}>
            <CustomSnoozeModal onClose={hideCustomSnoozeModal} onChooseTime={chooseSnoozeTime} />
        </Modal>
    );
}
