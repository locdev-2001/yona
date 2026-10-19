import { useEffect, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import DeleteChatDialog from './DeleteChatDialog';
import ReportDialog from './ReportDialog';

// Menu ⋮ của mũ khung chat: chặn / bỏ chặn người bên kia, báo cáo vi phạm, xoá
// cuộc trò chuyện khỏi danh sách của mình.
export default function ChatActionsMenu({
    triggerClassName = '',
    onOpenGroupInfo,
    onOpenSearch,
}: {
    triggerClassName?: string;
    onOpenGroupInfo?: () => void;
    onOpenSearch?: () => void;
}) {
    const { selectedConversation, setCounterpartBlocked, updatePreferences } = useConversation();
    const [isOpen, setOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);
    const reportDialogRef = useRef<DialogHandle>(null);
    const deleteDialogRef = useRef<DialogHandle>(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!actionsRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [isOpen]);

    if (!selectedConversation) return null;

    const isBlocked = selectedConversation.blocked_by_me;
    const commonItems = [
        { icon: 'i-lucide-search', label: t('CHAT.SEARCH.TITLE'), action: 'search', value: 'search' },
        selectedConversation.pinned
            ? { icon: 'i-lucide-pin-off', label: t('CHAT.ACTIONS.UNPIN'), action: 'unpin', value: 'unpin' }
            : { icon: 'i-lucide-pin', label: t('CHAT.ACTIONS.PIN'), action: 'pin', value: 'pin' },
        selectedConversation.muted
            ? { icon: 'i-lucide-bell', label: t('CHAT.ACTIONS.UNMUTE'), action: 'unmute', value: 'unmute' }
            : { icon: 'i-lucide-bell-off', label: t('CHAT.ACTIONS.MUTE'), action: 'mute', value: 'mute' },
    ];
    const menuItems = [...commonItems, ...(selectedConversation.kind === 'group' ? [
        { icon: 'i-lucide-info', label: t('CHAT.GROUP.INFO'), action: 'info', value: 'info' },
        { icon: 'i-lucide-flag', label: t('CHAT.ACTIONS.REPORT'), action: 'report', value: 'report' },
        { icon: 'i-lucide-log-out', label: t('CHAT.GROUP.LEAVE'), action: 'info', value: 'leave' },
    ] : [
        isBlocked
            ? { icon: 'i-lucide-circle-check', label: t('CHAT.ACTIONS.UNBLOCK'), action: 'unblock', value: 'unblock' }
            : { icon: 'i-lucide-ban', label: t('CHAT.ACTIONS.BLOCK'), action: 'block', value: 'block' },
        { icon: 'i-lucide-flag', label: t('CHAT.ACTIONS.REPORT'), action: 'report', value: 'report' },
        { icon: 'i-lucide-trash-2', label: t('CHAT.ACTIONS.DELETE'), action: 'delete', value: 'delete' },
    ])];

    const handleAction = ({ action }: { action: string }) => {
        setOpen(false);
        if (action === 'block' || action === 'unblock') void setCounterpartBlocked(action === 'block');
        if (action === 'info') onOpenGroupInfo?.();
        if (action === 'search') onOpenSearch?.();
        if (action === 'pin' || action === 'unpin') void updatePreferences({ pinned: action === 'pin' });
        if (action === 'mute' || action === 'unmute') void updatePreferences({ muted: action === 'mute' });
        if (action === 'report') reportDialogRef.current?.open();
        if (action === 'delete') deleteDialogRef.current?.open();
    };

    return (
        <div ref={actionsRef} className="relative flex items-center group">
            <NextButton
                title={t('CONVERSATION.HEADER.MORE_ACTIONS')}
                sm
                ghost
                slate
                icon="i-lucide-ellipsis-vertical"
                className={`rounded-md group-hover:bg-n-alpha-2 ${triggerClassName}`}
                onClick={() => setOpen(open => !open)}
            />
            {isOpen ? <DropdownMenu menuItems={menuItems} className="mt-1 ltr:right-0 rtl:left-0 top-full" onAction={handleAction} /> : null}
            <ReportDialog ref={reportDialogRef} />
            <DeleteChatDialog ref={deleteDialogRef} />
        </div>
    );
}
