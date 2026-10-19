import { useCallback, useState } from 'react';

import { openCommandBar } from 'dashboard/commands/commandBarStore';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { STATUS_TYPE } from 'dashboard/conversation/constants';
import type { ConversationStatus } from 'dashboard/conversation/types';
import { t } from '../../../../../i18n';
import BulkActionDropdown from './BulkActionDropdown';

// Port từ conversationBulkActions/BulkUpdateActions.vue — "Snooze" không cập nhật
// ngay mà mở command bar ở nhánh bulk_action_snooze_conversation như gốc.
interface BulkUpdateActionsProps {
    showResolve?: boolean;
    showReopen?: boolean;
    showSnooze?: boolean;
    onUpdate: (status: ConversationStatus) => void;
}

export default function BulkUpdateActions({
    showResolve = true,
    showReopen = true,
    showSnooze = true,
    onUpdate,
}: BulkUpdateActionsProps) {
    const [showDropdown, setShowDropdown] = useState(false);

    const menuItems: DropdownMenuItem[] = [
        ...(showResolve
            ? [
                  {
                      action: 'update',
                      value: STATUS_TYPE.RESOLVED,
                      label: t('CONVERSATION.HEADER.RESOLVE_ACTION'),
                      icon: 'i-lucide-check',
                  },
              ]
            : []),
        ...(showReopen
            ? [
                  {
                      action: 'update',
                      value: STATUS_TYPE.OPEN,
                      label: t('CONVERSATION.HEADER.REOPEN_ACTION'),
                      icon: 'i-lucide-redo',
                  },
              ]
            : []),
        ...(showSnooze
            ? [
                  {
                      action: 'update',
                      value: STATUS_TYPE.SNOOZED,
                      label: t('BULK_ACTION.UPDATE.SNOOZE_UNTIL'),
                      icon: 'i-lucide-alarm-clock',
                  },
              ]
            : []),
    ];

    const handleUpdate = (item: DropdownMenuItem) => {
        if (item.value === STATUS_TYPE.SNOOZED) {
            openCommandBar({ parent: 'bulk_action_snooze_conversation' });
        } else {
            onUpdate(item.value as ConversationStatus);
        }
        setShowDropdown(false);
    };

    const handleDismiss = useCallback(() => setShowDropdown(false), []);

    return (
        <BulkActionDropdown
            icon="i-lucide-circle-fading-arrow-up"
            tooltip={t('BULK_ACTION.UPDATE.CHANGE_STATUS')}
            isOpen={showDropdown}
            menuItems={menuItems}
            menuClassName="ltr:-right-[4.5rem] rtl:-left-[4.5rem] ltr:2xl:right-0 rtl:2xl:left-0 bottom-8 w-36"
            onToggle={() => setShowDropdown(open => !open)}
            onDismiss={handleDismiss}
            onAction={handleUpdate}
        />
    );
}
