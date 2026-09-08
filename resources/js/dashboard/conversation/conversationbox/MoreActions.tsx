import { useCallback, useEffect, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmailTranscriptModal from 'dashboard/components/EmailTranscriptModal';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    CMD_MUTE_CONVERSATION,
    CMD_SEND_TRANSCRIPT,
    CMD_UNMUTE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import ResolveAction from './ResolveAction';

// Port từ widgets/conversation/MoreActions.vue: ResolveAction + menu ⋮ (mute/unmute
// theo currentChat.muted, send transcript) + EmailTranscriptModal; cùng nhận lệnh
// từ command bar qua emitter.
export default function MoreActions({ isCompact = false }: { isCompact?: boolean } = {}) {
    const { selectedConversation, accountId, muteConversation, unmuteConversation } = useConversation();
    const [showEmailActionsModal, setShowEmailActionsModal] = useState(false);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showActionsDropdown) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!actionsRef.current?.contains(event.target as Node)) setShowActionsDropdown(false);
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showActionsDropdown]);

    const mute = useCallback(() => {
        void muteConversation();
        useAlert(t('CONTACT_PANEL.MUTED_SUCCESS'));
    }, [muteConversation]);

    const unmute = useCallback(() => {
        void unmuteConversation();
        useAlert(t('CONTACT_PANEL.UNMUTED_SUCCESS'));
    }, [unmuteConversation]);

    const toggleEmailModal = useCallback(() => setShowEmailActionsModal(open => !open), []);

    useEffect(() => {
        emitter.on(CMD_MUTE_CONVERSATION, mute);
        emitter.on(CMD_UNMUTE_CONVERSATION, unmute);
        emitter.on(CMD_SEND_TRANSCRIPT, toggleEmailModal);
        return () => {
            emitter.off(CMD_MUTE_CONVERSATION, mute);
            emitter.off(CMD_UNMUTE_CONVERSATION, unmute);
            emitter.off(CMD_SEND_TRANSCRIPT, toggleEmailModal);
        };
    }, [mute, unmute, toggleEmailModal]);

    if (!selectedConversation) return null;

    const actionMenuItems = [
        !selectedConversation.muted
            ? { icon: 'i-lucide-volume-off', label: t('CONTACT_PANEL.MUTE_CONTACT'), action: 'mute', value: 'mute' }
            : { icon: 'i-lucide-volume-1', label: t('CONTACT_PANEL.UNMUTE_CONTACT'), action: 'unmute', value: 'unmute' },
        {
            icon: 'i-lucide-share',
            label: t('CONTACT_PANEL.SEND_TRANSCRIPT'),
            action: 'send_transcript',
            value: 'send_transcript',
        },
    ];

    const handleActionClick = ({ action }: { action: string }) => {
        setShowActionsDropdown(false);
        if (action === 'mute') {
            mute();
        } else if (action === 'unmute') {
            unmute();
        } else if (action === 'send_transcript') {
            toggleEmailModal();
        }
    };

    return (
        <div className={`relative flex items-center actions--container ${isCompact ? 'gap-1' : 'gap-2'}`}>
            <ResolveAction isCompact={isCompact} />
            <div ref={actionsRef} className="relative flex items-center group">
                <NextButton
                    title={t('CONVERSATION.HEADER.MORE_ACTIONS')}
                    sm
                    ghost
                    slate
                    icon="i-lucide-more-vertical"
                    className="rounded-md group-hover:bg-n-alpha-2"
                    onClick={() => setShowActionsDropdown(open => !open)}
                />
                {showActionsDropdown ? (
                    <DropdownMenu
                        menuItems={actionMenuItems}
                        className="mt-1 ltr:right-0 rtl:left-0 top-full"
                        onAction={handleActionClick}
                    />
                ) : null}
            </div>
            {showEmailActionsModal ? (
                <EmailTranscriptModal
                    show={showEmailActionsModal}
                    currentChat={selectedConversation}
                    accountId={accountId}
                    onCancel={toggleEmailModal}
                />
            ) : null}
        </div>
    );
}
