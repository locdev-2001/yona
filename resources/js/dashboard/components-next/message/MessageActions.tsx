import { useEffect, useRef, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import { t } from '../../../i18n';
import { useMessageContext } from './provider';
import { MESSAGE_TYPES, ORIENTATION } from './constants';
import { QUICK_REACTIONS } from './helpers/reactions';

// MỞ RỘNG NGOÀI GỐC: Chatwoot v4.17.1 không có UI biểu cảm và đặt "Xoá" trong
// context menu chuột phải (chưa port). Thanh hành động hiện khi rê chuột lên tin,
// gate theo NĂNG LỰC KÊNH (docs/channel-capabilities.md §3 FE) — không theo
// `channel_type`. Kênh không khai gì thì không render gì.

export default function MessageActions({ className = '' }: { className?: string }) {
    const { messageType, contentAttributes, inboxCapabilities, orientation, onToggleReaction, onDeleteMessage } =
        useMessageContext();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isPickerOpen) return undefined;
        const onDocumentMouseDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsPickerOpen(false);
        };
        document.addEventListener('mousedown', onDocumentMouseDown);
        return () => document.removeEventListener('mousedown', onDocumentMouseDown);
    }, [isPickerOpen]);

    const inbox = { capabilities: inboxCapabilities };
    const isDeleted = Boolean(contentAttributes.deleted);
    const canReact = Boolean(onToggleReaction) && inboxSupports(inbox, 'outbound_reaction') && !isDeleted;
    // Endpoint xoá là MỘT; kênh khai `outbound_recall` thì thu hồi cả hai đầu,
    // không khai thì chỉ xoá ở Yona — nhãn phải nói đúng việc sẽ xảy ra.
    const canDelete =
        Boolean(onDeleteMessage) && !isDeleted && messageType === MESSAGE_TYPES.OUTGOING;
    const deleteLabel = inboxSupports(inbox, 'outbound_recall')
        ? t('CONVERSATION.MESSAGE_ACTIONS.RECALL')
        : t('CONVERSATION.MESSAGE_ACTIONS.DELETE');

    if (!canReact && !canDelete) return null;

    const buttonClass =
        'size-6 grid place-content-center rounded-md text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2 cursor-pointer transition-colors duration-150';

    return (
        <div
            ref={rootRef}
            className={`relative flex items-center gap-0.5 opacity-0 focus-within:opacity-100 group-hover/message:opacity-100 transition-opacity duration-150 ${className}`.trim()}
        >
            {canReact ? (
                <button
                    type="button"
                    className={buttonClass}
                    title={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    aria-expanded={isPickerOpen}
                    onClick={() => setIsPickerOpen(open => !open)}
                >
                    <Icon icon="i-lucide-smile-plus" className="size-[14px]" />
                </button>
            ) : null}
            {canDelete ? (
                <button
                    type="button"
                    className={buttonClass}
                    title={deleteLabel}
                    aria-label={deleteLabel}
                    onClick={() => onDeleteMessage?.()}
                >
                    <Icon icon="i-lucide-undo-2" className="size-[14px]" />
                </button>
            ) : null}
            {isPickerOpen ? (
                <div
                    role="group"
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    className={`absolute bottom-7 z-20 flex items-center gap-0.5 p-1 rounded-full border border-n-weak bg-n-solid-2 shadow-md ${
                        orientation === ORIENTATION.RIGHT ? 'ltr:right-0 rtl:left-0' : 'ltr:left-0 rtl:right-0'
                    }`}
                >
                    {QUICK_REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            aria-label={emoji}
                            className="size-7 grid place-content-center rounded-full hover:bg-n-alpha-2 cursor-pointer transition-transform duration-150 hover:scale-110"
                            onClick={() => {
                                onToggleReaction?.(emoji);
                                setIsPickerOpen(false);
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
