import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { MESSAGE_TYPE } from '../helpers/constants';
import { isASubmittedFormMessage, isDeletedMessage } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import { bubbleRadius } from './message/bubbleShape';
import MessageRow from './message/MessageRow';
import { messageElementId } from './message/QuotedReply';
import ConversationEndCard from './ConversationEndCard';
import EmailInput from './template/EmailInput';
import UserMessage from './UserMessage';
import WidgetAvatar from './WidgetAvatar';
import type { WidgetMessage } from '../types';
import { BOT_AVATAR_URL } from '../../shared/constants/avatars';
import { resolveStructured, StructuredMessageView } from 'shared/messaging';

// Tin của agent/bot. Tin thường (chữ, ảnh, tệp, sticker, thẻ) đi chung khung với
// tin của khách; tin mẫu có khung riêng (khảo sát, xin email, biểu mẫu) giữ bong bóng cũ.
// Loại tin cũ chưa đi qua message kit (shared/messaging). Tin có cấu trúc
// (trả lời nhanh, thẻ, form, bài viết…) do registry của kit vẽ.
const TEMPLATE_CONTENT_TYPES = ['input_email', 'integrations'];

// Ảnh mặc định của agent bot — chưa có trong public/ (agent_bot chưa port);
// avatar tự rơi về chữ tắt khi ảnh lỗi.

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
    // Tin mẫu (xin email, lựa chọn, biểu mẫu…) dùng cùng bong bóng agent của khung chat.
    return (
        <div className="chat-bubble-wrap">
            <div
                className="yona-template-bubble inline-block max-w-full border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] px-[13px] py-[10px] text-[13.5px] leading-[1.5] text-[var(--yona-chat-ink)]"
                style={bubbleRadius(false, 'single')}
            >
                <div
                    className="message-content break-words [&_a]:underline"
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
    position?: MessageGroupPosition;
    showAvatar?: boolean;
}

function useAgentIdentity(message: WidgetMessage) {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const useInboxAvatarForBot = Boolean(channelConfig?.enabledFeatures.includes('use_inbox_avatar_for_bot'));

    const name = message.sender
        ? message.sender.available_name || message.sender.name
        : message.additional_attributes?.sender_name
          ? message.additional_attributes.sender_name
          : useInboxAvatarForBot
            ? channelConfig?.websiteName
            : t('UNREAD_VIEW.BOT');

    const botImage = useInboxAvatarForBot ? channelConfig?.avatarUrl : BOT_AVATAR_URL;
    const avatarUrl =
        message.message_type === MESSAGE_TYPE.TEMPLATE
            ? botImage
            : message.sender
              ? message.sender.avatar_url
              : message.additional_attributes?.sender_avatar_url || botImage;

    return { name: name ?? '', avatarUrl };
}

function TemplateMessage({ message, showAvatar }: { message: WidgetMessage; showAvatar: boolean }) {
    const agent = useAgentIdentity(message);
    const contentAttributes = message.content_attributes ?? {};
    const contentType = message.content_type ?? '';

    const shouldDisplayAgentMessage =
        contentType === 'input_select' && contentAttributes.submitted_values && !message.content
            ? false
            : Boolean(message.content);

    const hasRecordedResponse = Boolean(
        contentAttributes.submitted_email ||
            (contentAttributes.submitted_values && !['form', 'input_csat'].includes(contentType)),
    );

    const isASubmittedForm = isASubmittedFormMessage(message);

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

    return (
        <div
            className={`agent-message-wrap group ${hasRecordedResponse || isASubmittedForm ? 'has-response' : ''}`.trim()}
            id={messageElementId(message.id)}
        >
            {!isASubmittedForm ? (
                // Cùng hàng với tin agent thường: cột avatar 26px, bong bóng rộng tối đa 74%.
                <div className="flex items-end gap-2">
                    <div className="w-[26px] flex-none self-end">
                        {showAvatar || hasRecordedResponse ? (
                            <WidgetAvatar src={agent.avatarUrl} size={26} name={agent.name} tone="agent" />
                        ) : null}
                    </div>
                    <div className="flex min-w-0 max-w-[74%] flex-col items-start">
                        {shouldDisplayAgentMessage ? (
                            <AgentMessageBubble
                                content={message.content ?? ''}
                                contentType={contentType}
                                messageId={message.id}
                                messageContentAttributes={contentAttributes}
                            />
                        ) : null}
                    </div>
                </div>
            ) : null}

            {hasRecordedResponse ? (
                <UserMessage
                    message={{
                        ...responseMessage,
                        id: `${message.id}-response`,
                        message_type: MESSAGE_TYPE.INCOMING,
                        created_at: message.created_at,
                    }}
                />
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

export default function AgentMessage({
    message,
    replyTo = null,
    position = 'single',
    showAvatar = true,
}: AgentMessageProps) {
    const agent = useAgentIdentity(message);
    const contentType = message.content_type ?? '';

    if (contentType === 'input_csat' && !isDeletedMessage(message)) {
        return <ConversationEndCard message={message} />;
    }

    const avatar = showAvatar ? <WidgetAvatar src={agent.avatarUrl} size={26} name={agent.name} tone="agent" /> : null;
    const structured = isDeletedMessage(message) ? null : resolveStructured(message);

    if (structured) {
        const view = <StructuredMessageView resolved={structured} message={message} />;

        return (
            <>
                {structured.definition.content === 'host' && message.content ? (
                    <MessageRow message={message} replyTo={replyTo} isOwn={false} position={position} avatar={avatar} />
                ) : null}
                <div className="yona-structured flex items-end gap-2" id={messageElementId(message.id)}>
                    <div className="w-[26px] flex-none self-end">
                        {structured.definition.content === 'view' || !message.content ? avatar : null}
                    </div>
                    <div className="min-w-0 max-w-full">{view}</div>
                </div>
            </>
        );
    }

    if (!isDeletedMessage(message) && (TEMPLATE_CONTENT_TYPES.includes(contentType) || isASubmittedFormMessage(message))) {
        return <TemplateMessage message={message} showAvatar={showAvatar} />;
    }

    return message.content || message.attachments?.length || isDeletedMessage(message) || contentType === 'sticker' ? (
        <MessageRow message={message} replyTo={replyTo} isOwn={false} position={position} avatar={avatar} />
    ) : null;
}
