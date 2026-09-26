import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { canRecallMessage } from '../../helpers/messageHelpers';
import { useWidgetState } from '../../store/hooks';
import { widgetStore } from '../../store/widgetStore';
import { t } from '../../i18n';
import { MoreIcon, ReactIcon, ReplyIcon } from './icons';
import { ReactionPicker } from './Reactions';
import type { WidgetMessage } from '../../types';

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-ink-soft)]"
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function RecallConfirm({
    windowSeconds,
    onCancel,
    onConfirm,
}: {
    windowSeconds: number;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    // Vẽ ra body: khung luồng tin và ô nhập là hai lớp xếp chồng riêng, hộp thoại
    // nằm trong luồng tin sẽ bị ô nhập đè lên.
    return createPortal(
        <div className="fixed inset-0 z-50 bg-[var(--yona-chat-scrim-soft)]" onClick={onCancel}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="yona-recall-title"
                className="absolute inset-x-3 bottom-3 overflow-hidden rounded-[16px] bg-[var(--yona-chat-panel)] shadow-[var(--yona-chat-shadow-pop)]"
                onClick={event => event.stopPropagation()}
            >
                <div className="px-4 pb-[14px] pt-4">
                    <div id="yona-recall-title" className="text-[15px] font-semibold leading-[1.35] text-[var(--yona-chat-ink)]">
                        {t('RECALL.CONFIRM_TITLE')}
                    </div>
                    <div className="mt-[5px] text-[12.5px] leading-[1.5] text-[var(--yona-chat-ink-soft)]">
                        {t('RECALL.CONFIRM_BODY', { minutes: Math.max(1, Math.round(windowSeconds / 60)) })}
                    </div>
                </div>
                <div className="flex border-t border-[var(--yona-chat-line)]">
                    <button
                        type="button"
                        className="flex-1 border-e border-[var(--yona-chat-line)] p-[14px] text-[13.5px] font-semibold leading-none text-[var(--yona-chat-ink-soft)]"
                        onClick={onCancel}
                    >
                        {t('RECALL.CANCEL')}
                    </button>
                    <button
                        type="button"
                        className="flex-1 p-[14px] text-[13.5px] font-semibold leading-none text-[var(--yona-chat-danger)]"
                        onClick={onConfirm}
                    >
                        {t('RECALL.CONFIRM')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

interface MessageActionsProps {
    message: WidgetMessage;
    isOwn: boolean;
    onReply: () => void;
    className?: string;
}

// Nút tròn cạnh bong bóng: cảm xúc (tin của shop), trả lời và "thêm". Thu hồi nằm trong
// menu "thêm", chỉ hiện khi tin còn trong hạn thu hồi của kênh (máy chủ vẫn kiểm lại).
export default function MessageActions({ message, isOwn, onReply, className = '' }: MessageActionsProps) {
    const recallWindowSeconds = useWidgetState(state => state.messagingPolicy.recallWindowSeconds);
    const canReact = useWidgetState(state => !isOwn && state.messagingPolicy.reactions.length > 0);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isPickerOpen, setPickerOpen] = useState(false);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Chỉ đóng khi bấm ra ngoài: chính cú bấm mở menu vẫn đang lan lên document.
    useEffect(() => {
        if (!isMenuOpen && !isPickerOpen) return undefined;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (event.target instanceof Node && containerRef.current?.contains(event.target)) return;
            setMenuOpen(false);
            setPickerOpen(false);
        };
        document.addEventListener('click', closeOnOutsideClick);
        return () => document.removeEventListener('click', closeOnOutsideClick);
    }, [isMenuOpen, isPickerOpen]);

    const showRecall = isOwn && canRecallMessage(message, recallWindowSeconds);
    const showCopy = Boolean(message.content) && typeof navigator !== 'undefined' && Boolean(navigator.clipboard);
    const hasMenu = showRecall || showCopy;
    // Tin của khách nằm bên phải: menu mở về phía trái để khỏi tràn khung.
    const menuAnchor = isOwn ? 'ltr:left-0 rtl:right-0' : 'ltr:right-0 rtl:left-0';

    const copyContent = () => {
        setMenuOpen(false);
        void navigator.clipboard.writeText(message.content ?? '');
    };

    const confirmRecall = () => {
        setConfirmOpen(false);
        void widgetStore.recallMessage(message.id).catch(() => undefined);
    };

    return (
        <div
            ref={containerRef}
            className={`yona-msg-actions flex flex-none items-center gap-[2px] ${className} ${
                isMenuOpen || isConfirmOpen || isPickerOpen ? '!opacity-100' : ''
            }`}
        >
            {canReact ? (
                <RoundButton
                    label={t('MESSAGE_ACTIONS.REACT')}
                    onClick={() => {
                        setMenuOpen(false);
                        setPickerOpen(current => !current);
                    }}
                >
                    <ReactIcon />
                </RoundButton>
            ) : null}
            <RoundButton label={t('MESSAGE_ACTIONS.REPLY')} onClick={onReply}>
                <ReplyIcon />
            </RoundButton>
            {hasMenu ? (
                <span className="relative flex">
                    <RoundButton
                        label={t('MESSAGE_ACTIONS.MORE')}
                        onClick={() => {
                            setPickerOpen(false);
                            setMenuOpen(current => !current);
                        }}
                    >
                        <MoreIcon />
                    </RoundButton>
                    {isMenuOpen ? (
                        <div
                            role="menu"
                            className={`absolute bottom-[36px] z-20 w-[176px] overflow-hidden rounded-[12px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] shadow-[var(--yona-chat-shadow-pop)] ${menuAnchor}`}
                            onClick={event => event.stopPropagation()}
                        >
                            {showCopy ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="block w-full px-[13px] py-[11px] text-start text-[13.5px] text-[var(--yona-chat-ink)]"
                                    onClick={copyContent}
                                >
                                    {t('MESSAGE_ACTIONS.COPY')}
                                </button>
                            ) : null}
                            {showRecall ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="block w-full border-t border-[var(--yona-chat-line)] px-[13px] py-[11px] text-start text-[13.5px] text-[var(--yona-chat-danger)] first:border-t-0"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setConfirmOpen(true);
                                    }}
                                >
                                    {t('MESSAGE_ACTIONS.RECALL')}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </span>
            ) : null}

            {isPickerOpen ? (
                // Khung chứa là cả hàng tin (MessageRow `relative`): thanh nằm trên bong bóng,
                // canh mép đầu bong bóng, sau cột avatar 26px + khoảng cách 8px.
                <div className="absolute bottom-full z-20 mb-1 ltr:left-[34px] rtl:right-[34px]">
                    <ReactionPicker message={message} onDone={() => setPickerOpen(false)} />
                </div>
            ) : null}

            {isConfirmOpen ? (
                <RecallConfirm
                    windowSeconds={recallWindowSeconds}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={confirmRecall}
                />
            ) : null}
        </div>
    );
}
