import { useCallback, useEffect, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { openCommandBar } from 'dashboard/commands/commandBarStore';
import { useAlert } from 'dashboard/composables/useAlert';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { CMD_REOPEN_CONVERSATION, CMD_RESOLVE_CONVERSATION } from 'dashboard/helper/commandbar/events';
import { emitter } from 'shared/helpers/emitter';
import { isTouchOnlyDevice, shortcutLabel } from 'shared/helpers/kbd';
import { t } from '../../../i18n';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import { statusDotColor } from '../statusAppearance';
import type { ConversationStatus } from '../types';
import { useMarkUnreadAndLeave } from '../useMarkUnreadAndLeave';
import { buildStatusMenuSections } from './statusMenu';
import type { StatusMenuAction } from './statusMenu';

// Nút hiện trạng thái hiện tại của hội thoại, bấm mở menu đổi trạng thái.
// `isCompact` (dưới ngưỡng ba cột): chỉ còn chấm màu để mũ khung chat gọn một dòng.
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
    const markUnreadAndLeave = useMarkUnreadAndLeave();
    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    useClickAway(containerRef, closeMenu, isMenuOpen);

    const toggleStatus = useCallback(
        (nextStatus: ConversationStatus, snoozedUntil: number | null = null) => {
            closeMenu();
            setIsLoading(true);
            toggleStatusRequest({ status: nextStatus, snoozedUntil }).then(() => {
                useAlert(t('CONVERSATION.CHANGE_STATUS'));
                setIsLoading(false);
            });
        },
        [closeMenu, toggleStatusRequest],
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
                if (!isLoading) setMenuOpen(true);
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

    const status = selectedConversation.status;
    const statusLabel = t(`CONVERSATION.RESOLVE_DROPDOWN.CURRENT_STATUS.${status}`);
    const showShortcuts = !isTouchOnlyDevice();
    const menuSections = buildStatusMenuSections(status).map(entries => ({
        items: entries.map(entry => ({
            label: t(entry.labelKey),
            value: entry.action,
            action: entry.action,
            icon: entry.icon,
            shortcut: entry.shortcut,
        })),
    }));

    const runAction: Record<StatusMenuAction, () => void> = {
        open: onCmdOpenConversation,
        resolve: onCmdResolveConversation,
        pending: () => toggleStatus(STATUS_TYPE.PENDING),
        snooze: () => {
            closeMenu();
            openCommandBar({ parent: 'snooze_conversation' });
        },
        unread: () => {
            closeMenu();
            void markUnreadAndLeave(selectedConversation.id);
        },
    };

    const renderShortcut = (item: DropdownMenuItem) =>
        showShortcuts && Array.isArray(item.shortcut) ? (
            <kbd className="ms-auto ps-4 font-sans text-xs text-n-slate-10">{shortcutLabel(item.shortcut as string[])}</kbd>
        ) : null;

    return (
        <div ref={containerRef} className="relative flex items-center flex-shrink-0 resolve-actions">
            <NextButton
                sm
                slate
                noAnimation
                trailingIcon={!isCompact}
                icon={isCompact ? undefined : 'i-lucide-chevron-down'}
                title={`${t('CONVERSATION.RESOLVE_DROPDOWN.CHANGE_STATUS')}: ${statusLabel}`}
                aria-label={`${t('CONVERSATION.RESOLVE_DROPDOWN.CHANGE_STATUS')}: ${statusLabel}`}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                data-testid="conversation-status-button"
                className={`!outline-0 max-md:h-11 ${isCompact ? '!px-0 w-8 max-md:w-11 justify-center' : ''}`}
                isLoading={isLoading}
                disabled={isLoading}
                onClick={() => setMenuOpen(open => !open)}
            >
                {/* Một khối duy nhất: trailingIcon đảo chiều hàng, khối giữ chấm đứng trước nhãn. */}
                <span className="flex items-center gap-1.5">
                    <span className={`size-2 flex-shrink-0 rounded-full ${statusDotColor(status)}`} aria-hidden="true" />
                    {isCompact ? null : <span className="whitespace-nowrap font-medium">{statusLabel}</span>}
                </span>
            </NextButton>
            {isMenuOpen ? (
                <DropdownMenu
                    menuSections={menuSections}
                    className="top-full mt-1 end-0 w-max min-w-[13rem]"
                    itemClassName="max-md:h-11"
                    renderTrailingIcon={renderShortcut}
                    onAction={item => runAction[item.action as StatusMenuAction]()}
                />
            ) : null}
        </div>
    );
}
