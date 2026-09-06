import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { messageStamp } from 'shared/helpers/timeHelper';
import { emitter } from 'shared/helpers/emitter';

import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { getContrastingTextColor } from '../helpers/colorHelper';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import { FileBubble, ImageBubble, VideoBubble } from './bubbles';
import ReplyToChip from './ReplyToChip';
import MessageReplyButton from './MessageReplyButton';
import type { WidgetMessage } from '../types';

// Port từ widget/components/UserMessage.vue + UserMessageBubble.vue.
// DragWrapper (vuốt để trả lời trên mobile) gộp thẳng vào đây bằng touch handler.

function UserMessageBubble({ message, widgetColor }: { message: string; widgetColor: string }) {
    return (
        <div
            className="chat-bubble user"
            style={{ background: widgetColor, color: getContrastingTextColor(widgetColor) }}
            dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(new MessageFormatter(message, false).formattedMessage),
            }}
        />
    );
}

const DRAG_THRESHOLD = 50;

interface UserMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
}

export default function UserMessage({ message, replyTo = null }: UserMessageProps) {
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const [hasImageError, setImageError] = useState(false);
    const [hasVideoError, setVideoError] = useState(false);
    const [dragDistance, setDragDistance] = useState(0);
    const [dragStartX, setDragStartX] = useState<number | null>(null);

    useEffect(() => {
        setImageError(false);
        setVideoError(false);
    }, [message]);

    const isInProgress = message.status === 'in_progress';
    const isFailed = message.status === 'failed';
    const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
    const showTextBubble = Boolean(message.content);
    const readableTime = messageStamp(message.created_at);
    const hasReplyTo = Boolean(replyTo && (replyTo.content || replyTo.attachments));

    const toggleReply = () => emitter.emit(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, message);

    const onTouchEnd = () => {
        if (dragDistance <= -DRAG_THRESHOLD) toggleReply();
        setDragDistance(0);
        setDragStartX(null);
    };

    return (
        <div className="user-message-wrap group" id={`cwmsg-${message.id}`}>
            <div className="flex gap-1 user-message">
                <div
                    className={`message-wrap ${isInProgress ? 'in-progress' : ''} ${isFailed ? 'is-failed' : ''}`.trim()}
                >
                    {hasReplyTo ? (
                        <div className="flex justify-end mt-2 mb-1 text-xs">
                            <ReplyToChip replyTo={replyTo as WidgetMessage} />
                        </div>
                    ) : null}
                    <div className="flex justify-end gap-1">
                        <div className="flex flex-col justify-end">
                            {!isInProgress && !isFailed ? (
                                <MessageReplyButton
                                    className="transition-opacity delay-75 opacity-0 group-hover:opacity-100 sm:opacity-0"
                                    onClick={toggleReply}
                                />
                            ) : null}
                        </div>
                        <div
                            className="will-change-transform"
                            style={{ transform: `translateX(${dragDistance}px)` }}
                            onTouchStart={event => setDragStartX(event.touches[0].clientX)}
                            onTouchMove={event => {
                                if (dragStartX === null) return;
                                setDragDistance(Math.max(-DRAG_THRESHOLD, event.touches[0].clientX - dragStartX));
                            }}
                            onTouchEnd={onTouchEnd}
                        >
                            {showTextBubble ? (
                                <UserMessageBubble message={message.content ?? ''} widgetColor={widgetColor} />
                            ) : null}
                            {hasAttachments ? (
                                <div className="chat-bubble has-attachment user" style={{ backgroundColor: widgetColor }}>
                                    {message.attachments?.map(attachment => (
                                        <div key={attachment.id ?? attachment.data_url}>
                                            {attachment.file_type === 'image' && !hasImageError ? (
                                                <ImageBubble
                                                    url={attachment.data_url ?? ''}
                                                    thumb={attachment.data_url ?? ''}
                                                    readableTime={readableTime}
                                                    onError={() => setImageError(true)}
                                                />
                                            ) : attachment.file_type === 'video' && !hasVideoError ? (
                                                <VideoBubble
                                                    url={attachment.data_url ?? ''}
                                                    readableTime={readableTime}
                                                    onError={() => setVideoError(true)}
                                                />
                                            ) : (
                                                <FileBubble
                                                    url={attachment.data_url ?? ''}
                                                    isInProgress={isInProgress}
                                                    widgetColor={widgetColor}
                                                    isUserBubble
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {isFailed ? (
                        <div className="flex justify-end px-4 py-2 text-n-ruby-9 align-middle">
                            {!hasAttachments ? (
                                <button
                                    type="button"
                                    title={t('COMPONENTS.MESSAGE_BUBBLE.RETRY')}
                                    className="inline-flex items-center justify-center ltr:ml-2 rtl:mr-2"
                                    onClick={() => widgetStore.sendMessageWithData(message)}
                                >
                                    <FluentIcon icon="arrow-clockwise" size="14" />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
