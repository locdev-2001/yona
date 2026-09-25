import { Fragment, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { CONVERSATION_STATUS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { popoutChatWindow } from '../../sdk/helpers/popoutHelper';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { getAuthToken } from '../api/client';
import { t } from '../i18n';
import ResetSessionDialog from './ResetSessionDialog';
import { useEmailTranscript } from './useEmailTranscript';
import { startNewConversation } from '../screens/navigation';
import { HEADER_ACTION_CLASS } from './headerActionClass';

interface HeaderMenuItem {
    key: string;
    icon: string;
    label: string;
    className?: string;
    /** Thao tác huỷ/kết thúc: chữ đỏ, tách khỏi nhóm trên bằng một đường kẻ. */
    danger?: boolean;
    onSelect: () => void;
}

// Menu ⋯: gom các thao tác phụ để header chỉ còn tên + nút đóng như design.
function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
    const [isOpen, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }, [isOpen]);

    const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            // Esc đóng menu, không lan lên khung chat (Esc ở đó đóng widget).
            event.stopPropagation();
            close();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

        event.preventDefault();
        const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
        const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        menuItems[(currentIndex + step + menuItems.length) % menuItems.length]?.focus();
    };

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-label={t('HEADER.MORE')}
                title={t('HEADER.MORE')}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={HEADER_ACTION_CLASS}
                onClick={() => setOpen(open => !open)}
            >
                <span className="i-lucide-ellipsis size-5" />
            </button>
            {isOpen ? (
                <>
                    <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        ref={menuRef}
                        role="menu"
                        aria-label={t('HEADER.MORE')}
                        className="absolute end-0 top-full z-50 mt-1.5 w-max min-w-[224px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] p-1.5 shadow-[var(--yona-chat-shadow-pop)]"
                        onKeyDown={onMenuKeyDown}
                    >
                        {items.map((item, index) => (
                            <Fragment key={item.key}>
                                {item.danger && index > 0 ? <div role="separator" className="mx-2.5 my-1 h-px bg-[var(--yona-chat-line)]" /> : null}
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={`flex items-center w-full gap-2.5 px-2.5 text-start rounded-[10px] min-h-11 text-[13.5px] font-medium ${item.danger ? 'text-[var(--yona-chat-danger)]' : 'text-[var(--yona-chat-ink)]'} hover:bg-[var(--yona-chat-field)] focus-visible:bg-[var(--yona-chat-field)] focus-visible:outline-none ${item.className ?? ''}`.trim()}
                                    onClick={() => {
                                        setOpen(false);
                                        item.onSelect();
                                    }}
                                >
                                    <span className={`${item.icon} size-[18px] flex-shrink-0 ${item.danger ? '' : 'text-[var(--yona-chat-ink-soft)]'}`} />
                                    <span>{item.label}</span>
                                </button>
                            </Fragment>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

export default function HeaderActions({ showPopoutButton = false }: { showPopoutButton?: boolean }) {
    const [isConfirmingReset, setConfirmingReset] = useState(false);
    const conversationStatus = useWidgetState(state => state.conversationAttributes.status);
    const canUserEndConversation = useWidgetState(state => state.appConfig.enableEndConversation);
    const enabledFeatures = useWidgetState(state => state.channelConfig?.enabledFeatures);
    const websiteToken = useWidgetState(state => state.channelConfig?.websiteToken ?? '');
    const locale = useWidgetState(state => state.channelConfig?.locale ?? 'en');
    const hasConversationHistory = useWidgetState(state => Object.keys(state.conversations).length > 0);
    const transcript = useEmailTranscript();

    const isIframe = IFrameHelper.isIFrame();
    const hasEndConversationEnabled = Boolean(enabledFeatures?.includes('end_conversation'));
    const canLeaveConversation = (
        [CONVERSATION_STATUS.OPEN, CONVERSATION_STATUS.SNOOZED, CONVERSATION_STATUS.PENDING] as string[]
    ).includes(conversationStatus);

    const closeWindow = () => {
        if (isIframe) IFrameHelper.sendMessage({ event: 'closeWindow' });
    };

    // Thứ tự theo design: mở cửa sổ riêng, gửi lịch sử, hội thoại mới, xoá phiên; kết thúc tách riêng ở cuối.
    const menuItems: HeaderMenuItem[] = [];
    if (showPopoutButton) {
        menuItems.push({
            key: 'popout',
            icon: 'i-lucide-external-link',
            label: t('HEADER.POPOUT'),
            className: 'new-window--button',
            onSelect: () => {
                closeWindow();
                popoutChatWindow(window.location.origin, websiteToken, locale, getAuthToken());
            },
        });
    }
    if (transcript.available && hasConversationHistory) {
        menuItems.push({ key: 'transcript', icon: 'i-lucide-mail', label: t('HEADER.TRANSCRIPT'), onSelect: () => void transcript.send() });
    }
    // Hội thoại mới giữ lịch sử (tab Tin nhắn vẫn thấy hội thoại cũ); khác với xoá phiên bên dưới.
    if (hasConversationHistory) {
        menuItems.push({ key: 'new-conversation', icon: 'i-lucide-message-square-plus', label: t('HEADER.NEW_CONVERSATION'), onSelect: startNewConversation });
    }
    // Cửa sổ bật riêng không có SDK giữ cookie để xoá cùng, nên chỉ xoá phiên khi nằm trong trang khách.
    if (isIframe && hasConversationHistory) {
        menuItems.push({
            key: 'reset-session',
            icon: 'i-lucide-rotate-ccw',
            label: t('RESET_SESSION.BUTTON'),
            onSelect: () => setConfirmingReset(true),
        });
    }
    if (canLeaveConversation && canUserEndConversation && hasEndConversationEnabled) {
        menuItems.push({
            key: 'end-conversation',
            icon: 'i-lucide-log-out',
            label: t('END_CONVERSATION'),
            danger: true,
            onSelect: () => void widgetStore.resolveConversation(),
        });
    }

    if (!menuItems.length && !isIframe) return null;

    return (
        <div className="actions flex items-center flex-shrink-0 gap-2">
            {menuItems.length ? <HeaderMenu items={menuItems} /> : null}
            {isIframe ? (
                <button
                    type="button"
                    aria-label={t('HEADER.CLOSE')}
                    title={t('HEADER.CLOSE')}
                    className={`${HEADER_ACTION_CLASS} close-button`}
                    onClick={closeWindow}
                >
                    <span className="i-lucide-x size-[18px]" />
                </button>
            ) : null}
            {isConfirmingReset ? <ResetSessionDialog onClose={() => setConfirmingReset(false)} /> : null}
        </div>
    );
}
