import { useEffect, useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { t } from '../../../i18n';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';

// Port từ widgets/conversation/MoreActions.vue + components/buttons/ResolveAction.vue.
// Khác biệt cố ý B3: các nút render đúng cấu trúc/pixel nhưng CHƯA có hành vi —
// toggle status/snooze/mark pending (B5), mute/unmute (B4 Redis), send transcript
// (mailer B5); bấm item chỉ đóng menu.
export default function MoreActions() {
    const { selectedConversation } = useConversation();
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const [showResolveDropdown, setShowResolveDropdown] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showActionsDropdown && !showResolveDropdown) return undefined;

        const handleClickAway = (event: globalThis.MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setShowActionsDropdown(false);
                setShowResolveDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showActionsDropdown, showResolveDropdown]);

    if (!selectedConversation) return null;

    const status = selectedConversation.status;
    const isOpen = status === STATUS_TYPE.OPEN;
    const isPending = status === STATUS_TYPE.PENDING;
    const isResolved = status === STATUS_TYPE.RESOLVED;
    const isSnoozed = status === STATUS_TYPE.SNOOZED;
    const showOpenButton = isPending || isSnoozed;
    const showAdditionalActions = !isPending && !isSnoozed;

    const actionMenuItems = [
        {
            icon: 'i-lucide-volume-off',
            label: t('CONTACT_PANEL.MUTE_CONTACT'),
            action: 'mute',
            value: 'mute',
        },
        {
            icon: 'i-lucide-share',
            label: t('CONTACT_PANEL.SEND_TRANSCRIPT'),
            action: 'send_transcript',
            value: 'send_transcript',
        },
    ];

    return (
        <div ref={rootRef} className="relative flex items-center gap-2 actions--container">
            <div className="flex relative justify-end items-center resolve-actions">
                <div
                    className={`flex-shrink-0 rounded-lg shadow outline-1 outline ${
                        !showOpenButton ? 'outline-n-container' : 'outline-transparent'
                    }`}
                >
                    {isOpen ? (
                        <NextButton
                            label={t('CONVERSATION.HEADER.RESOLVE_ACTION')}
                            sm
                            slate
                            noAnimation
                            className="ltr:rounded-r-none rtl:rounded-l-none !outline-0"
                        />
                    ) : isResolved ? (
                        <NextButton
                            label={t('CONVERSATION.HEADER.REOPEN_ACTION')}
                            sm
                            slate
                            noAnimation
                            className="ltr:rounded-r-none rtl:rounded-l-none !outline-0"
                        />
                    ) : showOpenButton ? (
                        <NextButton label={t('CONVERSATION.HEADER.OPEN_ACTION')} sm slate noAnimation />
                    ) : null}
                    {showAdditionalActions ? (
                        <NextButton
                            icon="i-lucide-chevron-down"
                            sm
                            slate
                            noAnimation
                            trailingIcon
                            className="ltr:rounded-l-none rtl:rounded-r-none !outline-0"
                            onClick={() => setShowResolveDropdown(open => !open)}
                        />
                    ) : null}
                </div>
                {showResolveDropdown ? (
                    <div className="border rounded-lg shadow-lg border-n-strong dark:border-n-strong box-content p-2 w-fit z-10 bg-n-alpha-3 backdrop-blur-[100px] absolute block left-auto top-full mt-0.5 start-0 xl:start-auto xl:end-0 max-w-[12.5rem] min-w-[9.75rem]">
                        <ul className="mb-0 list-none m-0 p-0 flex flex-col gap-0.5">
                            <li>
                                <NextButton
                                    label={t('CONVERSATION.RESOLVE_DROPDOWN.SNOOZE_UNTIL')}
                                    ghost
                                    slate
                                    sm
                                    start
                                    icon="i-lucide-alarm-clock-minus"
                                    className="w-full"
                                    onClick={() => setShowResolveDropdown(false)}
                                />
                            </li>
                            <li>
                                <NextButton
                                    label={t('CONVERSATION.RESOLVE_DROPDOWN.MARK_PENDING')}
                                    ghost
                                    slate
                                    sm
                                    start
                                    icon="i-lucide-circle-dot-dashed"
                                    className="w-full"
                                    onClick={() => setShowResolveDropdown(false)}
                                />
                            </li>
                        </ul>
                    </div>
                ) : null}
            </div>
            <div className="relative flex items-center group">
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
                        onAction={() => setShowActionsDropdown(false)}
                    />
                ) : null}
            </div>
        </div>
    );
}
