import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { messageStamp } from 'shared/helpers/timeHelper';
import { emitter } from 'shared/helpers/emitter';

import { MESSAGE_TYPE, WIDGET_BUS_EVENTS } from '../helpers/constants';
import { isASubmittedFormMessage } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import { FileBubble, ImageBubble, VideoBubble } from './bubbles';
import EmailInput from './template/EmailInput';
import MessageReplyButton from './MessageReplyButton';
import ReplyToChip from './ReplyToChip';
import UserMessage from './UserMessage';
import type { WidgetMessage } from '../types';

// Port từ widget/components/AgentMessage.vue + AgentMessageBubble.vue.
// C3 thêm nhánh `input_email` (bong bóng bot xin email). Các content_type còn
// lại của bot (cards/form/input_select/input_csat/article/integrations) chưa
// port — chúng đi cùng C5 (CSAT) và nhóm D (help center).

// Ảnh mặc định của agent bot — chưa có trong public/ (agent_bot chưa port);
// Avatar tự rơi về chữ cái đầu khi ảnh lỗi.
const BOT_AVATAR = '/assets/images/chatwoot_bot.png';

function AgentMessageBubble({
    content,
    contentType,
    messageId,
    messageContentAttributes,
}: {
    content: string;
    contentType: string;
    messageId: number | string;
    messageContentAttributes: Record<string, unknown>;
}) {
    return (
        <div className="chat-bubble-wrap">
            <div className="chat-bubble agent bg-n-background dark:bg-n-solid-3 text-n-slate-12">
                <div
                    className="message-content text-n-slate-12"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(new MessageFormatter(content, false).formattedMessage),
                    }}
                />
                {contentType === 'input_email' ? (
                    <EmailInput messageId={messageId} messageContentAttributes={messageContentAttributes} />
                ) : null}
            </div>
        </div>
    );
}

interface AgentMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
}

export default function AgentMessage({ message, replyTo = null }: AgentMessageProps) {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const [hasImageError, setImageError] = useState(false);
    const [hasVideoError, setVideoError] = useState(false);

    useEffect(() => {
        setImageError(false);
        setVideoError(false);
    }, [message]);

    const contentAttributes = message.content_attributes ?? {};
    const contentType = message.content_type ?? '';
    const useInboxAvatarForBot = Boolean(channelConfig?.enabledFeatures.includes('use_inbox_avatar_for_bot'));

    const shouldDisplayAgentMessage =
        contentType === 'input_select' && contentAttributes.submitted_values && !message.content
            ? false
            : Boolean(message.content);

    const hasRecordedResponse = Boolean(
        contentAttributes.submitted_email ||
            (contentAttributes.submitted_values && !['form', 'input_csat'].includes(contentType)),
    );

    const isASubmittedForm = isASubmittedFormMessage(message);
    const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
    const readableTime = messageStamp(message.created_at, 'LLL d yyyy, h:mm a');
    const hasReplyTo = Boolean(replyTo && (replyTo.content || replyTo.attachments));

    const agentName = message.sender
        ? message.sender.available_name || message.sender.name
        : message.additional_attributes?.sender_name
          ? message.additional_attributes.sender_name
          : useInboxAvatarForBot
            ? channelConfig?.websiteName
            : t('UNREAD_VIEW.BOT');

    const displayImage = useInboxAvatarForBot ? channelConfig?.avatarUrl : BOT_AVATAR;
    const avatarUrl =
        message.message_type === MESSAGE_TYPE.TEMPLATE
            ? displayImage
            : message.sender
              ? message.sender.avatar_url
              : message.additional_attributes?.sender_avatar_url || displayImage;

    const responseMessage = contentAttributes.submitted_email
        ? { content: String(contentAttributes.submitted_email) }
        : contentType === 'input_select' && Array.isArray(contentAttributes.submitted_values)
          ? {
                content: String(
                    (contentAttributes.submitted_values[0] as { title?: string; value?: string })?.title ??
                        (contentAttributes.submitted_values[0] as { value?: string })?.value ??
                        '',
                ),
            }
          : { content: '' };

    const submittedFormValues = Array.isArray(contentAttributes.submitted_values)
        ? (contentAttributes.submitted_values as { name: string; value: string }[]).map(submittedValue => ({
              id: submittedValue.name,
              content: submittedValue.value,
          }))
        : [];

    const toggleReply = () => emitter.emit(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, message);

    return (
        <div
            className={`agent-message-wrap group ${hasRecordedResponse || isASubmittedForm ? 'has-response' : ''}`.trim()}
            id={`cwmsg-${message.id}`}
        >
            {!isASubmittedForm ? (
                <div className="agent-message">
                    <div className="avatar-wrap">
                        <div className="user-thumbnail-box">
                            {message.showAvatar || hasRecordedResponse ? (
                                <Avatar src={avatarUrl} size={24} name={agentName ?? ''} roundedFull />
                            ) : null}
                        </div>
                    </div>
                    <div className="message-wrap">
                        {hasReplyTo ? (
                            <div className="flex mt-2 mb-1 text-xs">
                                <ReplyToChip replyTo={replyTo as WidgetMessage} />
                            </div>
                        ) : null}
                        <div className="flex w-full gap-1">
                            <div className="space-y-2">
                                {shouldDisplayAgentMessage ? (
                                    <AgentMessageBubble
                                        content={message.content ?? ''}
                                        contentType={contentType}
                                        messageId={message.id}
                                        messageContentAttributes={contentAttributes}
                                    />
                                ) : null}
                                {hasAttachments ? (
                                    <div
                                        className={`space-y-2 chat-bubble has-attachment agent bg-n-background dark:bg-n-solid-3 ${
                                            shouldDisplayAgentMessage ? 'has-text' : ''
                                        }`.trim()}
                                    >
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
                                                ) : attachment.file_type === 'audio' ? (
                                                    <audio controls className="h-10 dark:invert">
                                                        <source src={attachment.data_url} />
                                                    </audio>
                                                ) : (
                                                    <FileBubble url={attachment.data_url ?? ''} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex flex-col justify-end">
                                <MessageReplyButton
                                    className="transition-opacity delay-75 opacity-0 group-hover:opacity-100 sm:opacity-0"
                                    onClick={toggleReply}
                                />
                            </div>
                        </div>
                        {message.showAvatar || hasRecordedResponse ? (
                            <p className="agent-name text-n-slate-11">{agentName}</p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {hasRecordedResponse ? (
                <UserMessage message={{ ...responseMessage, id: `${message.id}-response`, message_type: MESSAGE_TYPE.INCOMING, created_at: message.created_at }} />
            ) : null}
            {isASubmittedForm
                ? submittedFormValues.map(submittedValue => (
                      <UserMessage
                          key={submittedValue.id}
                          message={{
                              id: `${message.id}-${submittedValue.id}`,
                              content: submittedValue.content,
                              message_type: MESSAGE_TYPE.INCOMING,
                              created_at: message.created_at,
                          }}
                      />
                  ))
                : null}
        </div>
    );
}
