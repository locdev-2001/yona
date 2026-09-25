import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { emitter } from 'shared/helpers/emitter';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { WIDGET_BUS_EVENTS } from '../../helpers/constants';
import { isDeletedMessage } from '../../helpers/messageHelpers';
import MessageActions from './MessageActions';
import MessageBody from './MessageBody';
import { ReactionSummary } from './Reactions';
import { messageElementId } from './QuotedReply';
import type { WidgetMessage } from '../../types';

const LONG_PRESS_MS = 450;

interface MessageRowProps {
    message: WidgetMessage;
    replyTo: WidgetMessage | null;
    isOwn: boolean;
    position: MessageGroupPosition;
    avatar?: ReactNode;
    footer?: ReactNode;
}

// Một dòng tin trong nhóm: (avatar) + thân tin + hai nút hành động. Nút hiện khi
// rê chuột, hoặc khi giữ lâu trên màn cảm ứng.
export default function MessageRow({ message, replyTo, isOwn, position, avatar = null, footer = null }: MessageRowProps) {
    const [isActionsPinned, setActionsPinned] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasActions =
        typeof message.id === 'number' &&
        !isDeletedMessage(message) &&
        message.status !== 'in_progress' &&
        message.status !== 'failed';

    useEffect(() => {
        if (!isActionsPinned) return undefined;
        const unpin = (event: Event) => {
            const row = document.getElementById(messageElementId(message.id));
            if (row && event.target instanceof Node && row.contains(event.target)) return;
            setActionsPinned(false);
        };
        document.addEventListener('touchstart', unpin);
        document.addEventListener('click', unpin);
        return () => {
            document.removeEventListener('touchstart', unpin);
            document.removeEventListener('click', unpin);
        };
    }, [isActionsPinned, message.id]);

    useEffect(() => () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const cancelLongPress = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    };

    const startLongPress = () => {
        if (!hasActions) return;
        cancelLongPress();
        longPressTimer.current = setTimeout(() => setActionsPinned(true), LONG_PRESS_MS);
    };

    const actions = hasActions ? (
        <MessageActions
            message={message}
            isOwn={isOwn}
            onReply={() => {
                setActionsPinned(false);
                emitter.emit(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, message);
            }}
            className={`transition-opacity ${
                isActionsPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
            }`}
        />
    ) : null;

    return (
        <div
            id={messageElementId(message.id)}
            className={`yona-msg group flex items-end gap-2 rounded-[12px] ${isOwn ? 'justify-end' : 'justify-start'}`}
            data-own={isOwn ? 'true' : 'false'}
            onTouchStart={startLongPress}
            onTouchMove={cancelLongPress}
            onTouchEnd={cancelLongPress}
            onContextMenu={event => {
                if (!isActionsPinned) return;
                event.preventDefault();
            }}
        >
            {isOwn ? actions : <div className="w-[26px] flex-none self-end">{avatar}</div>}
            <div className={`flex min-w-0 max-w-[74%] flex-col gap-[2px] ${isOwn ? 'items-end' : 'items-start'}`}>
                <MessageBody message={message} replyTo={replyTo} isOwn={isOwn} position={position} />
                {isDeletedMessage(message) ? null : <ReactionSummary message={message} isOwn={isOwn} />}
                {footer}
            </div>
            {isOwn ? null : actions}
        </div>
    );
}
