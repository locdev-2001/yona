import { useCallback, useEffect, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import { openCommandBar } from 'dashboard/commands/commandBarStore';
import { useAlert } from 'dashboard/composables/useAlert';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { CMD_REOPEN_CONVERSATION, CMD_RESOLVE_CONVERSATION } from 'dashboard/helper/commandbar/events';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../../i18n';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import type { ConversationStatus } from '../types';

// Port từ components/buttons/ResolveAction.vue. Bỏ: ConversationResolveAttributesModal +
// useConversationRequiredAttributes (EE). ButtonGroup gốc = div bọc 2 nút. Bấm Snooze gốc
// KHÔNG đóng dropdown (chỉ mở command bar) — giữ y vậy để pixel khớp.
//
// `isCompact` (dưới ngưỡng ba cột): nhãn nhường chỗ cho icon để mũ khung chat gọn
// trong một dòng; hành động và phím tắt không đổi.
const COMPACT_ICONS = {
    resolve: 'i-lucide-check',
    reopen: 'i-lucide-rotate-ccw',
    open: 'i-lucide-rotate-ccw',
} as const;

const getConversationParams = () => {
    const allConversations = document.querySelectorAll<HTMLElement>('.conversations-list .conversation');
    const activeConversation = document.querySelector('div.conversations-list div.conversation.active');
    const activeConversationIndex = [...allConversations].indexOf(activeConversation as HTMLElement);

    return {
        all: allConversations,
        activeIndex: activeConversationIndex,
        lastIndex: allConversations.length - 1,
    };
};

export default function ResolveAction({ isCompact = false }: { isCompact?: boolean } = {}) {
    const { selectedConversation, toggleStatus: toggleStatusRequest } = useConversation();
    const [isLoading, setIsLoading] = useState(false);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const status = selectedConversation?.status;
    const isOpen = status === STATUS_TYPE.OPEN;
    const isPending = status === STATUS_TYPE.PENDING;
    const isResolved = status === STATUS_TYPE.RESOLVED;
    const isSnoozed = status === STATUS_TYPE.SNOOZED;
    const showAdditionalActions = !isPending && !isSnoozed;
    const showOpenButton = isPending || isSnoozed;

    const closeDropdown = useCallback(() => setShowActionsDropdown(false), []);
    const openDropdown = useCallback(() => setShowActionsDropdown(true), []);

    useEffect(() => {
        if (!showActionsDropdown) return undefined;
        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) closeDropdown();
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showActionsDropdown, closeDropdown]);

    const openSnoozeModal = () => openCommandBar({ parent: 'snooze_conversation' });

    const toggleStatus = useCallback(
        (nextStatus: ConversationStatus, snoozedUntil: number | null = null) => {
            closeDropdown();
            setIsLoading(true);
            toggleStatusRequest({ status: nextStatus, snoozedUntil }).then(() => {
                useAlert(t('CONVERSATION.CHANGE_STATUS'));
                setIsLoading(false);
            });
        },
        [closeDropdown, toggleStatusRequest],
    );

    const onCmdOpenConversation = useCallback(() => toggleStatus(STATUS_TYPE.OPEN), [toggleStatus]);
    const onCmdResolveConversation = useCallback(() => toggleStatus(STATUS_TYPE.RESOLVED), [toggleStatus]);

    useEffect(() => {
        emitter.on(CMD_REOPEN_CONVERSATION, onCmdOpenConversation);
        emitter.on(CMD_RESOLVE_CONVERSATION, onCmdResolveConversation);
        return () => {
            emitter.off(CMD_REOPEN_CONVERSATION, onCmdOpenConversation);
            emitter.off(CMD_RESOLVE_CONVERSATION, onCmdResolveConversation);
        };
    }, [onCmdOpenConversation, onCmdResolveConversation]);

    useKeyboardEvents({
        'Alt+KeyM': {
            action: () => {
                if (showAdditionalActions && !isLoading) openDropdown();
            },
            allowOnFocusedInput: true,
        },
        'Alt+KeyE': {
            action: event => {
                // Chrome trên Windows coi Alt+E là phím mở menu của nó → chặn mặc định như gốc.
                event.preventDefault();
                onCmdResolveConversation();
            },
        },
        '$mod+Alt+KeyE': {
            action: event => {
                const { all, activeIndex, lastIndex } = getConversationParams();
                onCmdResolveConversation();

                if (activeIndex < lastIndex) {
                    all[activeIndex + 1].click();
                } else if (all.length > 1) {
                    all[0].click();
                    const list = document.querySelector('.conversations-list');
                    if (list) list.scrollTop = 0;
                }
                event.preventDefault();
            },
        },
    });

    if (!selectedConversation) return null;

    return (
        <div className="flex relative justify-end items-center resolve-actions">
            <div
                className="flex-shrink-0 rounded-lg"
            >
                {isOpen ? (
                    <NextButton
                        label={isCompact ? undefined : t('CONVERSATION.HEADER.RESOLVE_ACTION')}
                        title={t('CONVERSATION.HEADER.RESOLVE_ACTION')}
                        icon={isCompact ? COMPACT_ICONS.resolve : undefined}
                        sm
                        slate
                        noAnimation
                        className="ltr:rounded-r-none rtl:rounded-l-none !outline-0"
                        isLoading={isLoading}
                        onClick={onCmdResolveConversation}
                    />
                ) : isResolved ? (
                    <NextButton
                        label={isCompact ? undefined : t('CONVERSATION.HEADER.REOPEN_ACTION')}
                        title={t('CONVERSATION.HEADER.REOPEN_ACTION')}
                        icon={isCompact ? COMPACT_ICONS.reopen : undefined}
                        sm
                        slate
                        noAnimation
                        className="ltr:rounded-r-none rtl:rounded-l-none !outline-0"
                        isLoading={isLoading}
                        onClick={onCmdOpenConversation}
                    />
                ) : showOpenButton ? (
                    <NextButton
                        label={isCompact ? undefined : t('CONVERSATION.HEADER.OPEN_ACTION')}
                        title={t('CONVERSATION.HEADER.OPEN_ACTION')}
                        icon={isCompact ? COMPACT_ICONS.open : undefined}
                        sm
                        slate
                        noAnimation
                        isLoading={isLoading}
                        onClick={onCmdOpenConversation}
                    />
                ) : null}
                {showAdditionalActions ? (
                    <NextButton
                        icon="i-lucide-chevron-down"
                        disabled={isLoading}
                        sm
                        noAnimation
                        className="ltr:rounded-l-none rtl:rounded-r-none !outline-0"
                        slate
                        trailingIcon
                        onClick={openDropdown}
                    />
                ) : null}
            </div>
            {showActionsDropdown ? (
                <div
                    ref={dropdownRef}
                    className={`rounded-lg overlay-surface box-content p-2 w-fit z-10 absolute block left-auto top-full mt-0.5 max-w-[12.5rem] min-w-[9.75rem] [&_ul>li]:mb-0 ${
                        // Nút gọn nằm sát mép phải màn hẹp: neo start-0 như gốc thì
                        // menu 156px tràn ra ngoài khung nhìn.
                        isCompact ? 'end-0' : 'start-0 xl:start-auto xl:end-0'
                    }`}
                >
                    <ul className="mb-0 list-none m-0 p-0">
                        {!isPending ? (
                            <li>
                                <NextButton
                                    label={t('CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL')}
                                    ghost
                                    slate
                                    sm
                                    start
                                    icon="i-lucide-alarm-clock-minus"
                                    className="w-full"
                                    onClick={openSnoozeModal}
                                />
                            </li>
                        ) : null}
                        {!isPending ? (
                            <li>
                                <NextButton
                                    label={t('CONVERSATION.RESOLVE_DROPDOWN.MARK_PENDING')}
                                    ghost
                                    slate
                                    sm
                                    start
                                    icon="i-lucide-circle-dot-dashed"
                                    className="w-full"
                                    onClick={() => toggleStatus(STATUS_TYPE.PENDING)}
                                />
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
