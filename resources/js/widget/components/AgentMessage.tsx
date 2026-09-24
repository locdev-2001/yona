import DOMPurify from 'dompurify';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { MESSAGE_TYPE } from '../helpers/constants';
import { isASubmittedFormMessage, isDeletedMessage } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import CardsCarousel from './message/CardsCarousel';
import MessageRow from './message/MessageRow';
import { messageElementId } from './message/QuotedReply';
import CustomerSatisfaction from './template/CustomerSatisfaction';
import EmailInput from './template/EmailInput';
import UserMessage from './UserMessage';
import type { WidgetMessage } from '../types';

// Tin của agent/bot. Tin thường (chữ, ảnh, tệp, sticker, thẻ) đi chung khung với
// tin của khách; tin mẫu có khung riêng (khảo sát, xin email, biểu mẫu) giữ bong bóng cũ.
const TEMPLATE_CONTENT_TYPES = ['input_csat', 'input_email', 'input_select', 'form', 'article', 'integrations'];

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
    // Bong bóng CSAT thay hẳn bong bóng chữ (bản gốc loại `input_csat` khỏi
    // nhánh `v-if` của chat-bubble) — tiêu đề đã nằm trong chính component.
    if (contentType === 'input_csat') {
        return (
            <div className="chat-bubble-wrap">
                <CustomerSatisfaction
                    messageId={messageId}
                    submittedValues={messageContentAttributes.submitted_values}
                    displayType={messageContentAttributes.display_type as string | undefined}
                    message={content}
                />
            </div>
        );
    }

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

    const botImage = useInboxAvatarForBot ? channelConfig?.avatarUrl : BOT_AVATAR;
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
                <div className="agent-message">
                    <div className="avatar-wrap">
                        <div className="user-thumbnail-box">
                            {showAvatar || hasRecordedResponse ? (
                                <Avatar src={agent.avatarUrl} size={24} name={agent.name} roundedFull />
                            ) : null}
                        </div>
                    </div>
                    <div className="message-wrap">
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

    if (!isDeletedMessage(message) && (TEMPLATE_CONTENT_TYPES.includes(contentType) || isASubmittedFormMessage(message))) {
        return <TemplateMessage message={message} showAvatar={showAvatar} />;
    }

    const cardItems = contentType === 'cards' && !isDeletedMessage(message) ? (message.content_attributes?.items ?? []) : [];
    const avatar = showAvatar ? <Avatar src={agent.avatarUrl} size={26} name={agent.name} roundedFull /> : null;

    return (
        <>
            {message.content || message.attachments?.length || isDeletedMessage(message) || contentType === 'sticker' ? (
                <MessageRow message={message} replyTo={replyTo} isOwn={false} position={position} avatar={avatar} />
            ) : null}
            {cardItems.length ? <CardsCarousel items={cardItems} /> : null}
        </>
    );
}
