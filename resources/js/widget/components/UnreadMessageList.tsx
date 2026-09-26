import DOMPurify from 'dompurify';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { emitter } from 'shared/helpers/emitter';

import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import type { MessageAttachment, MessageSender } from '../types';
import { BOT_AVATAR_URL } from '../../shared/constants/avatars';

// Port từ widget/components/UnreadMessageList.vue + UnreadMessage.vue — khung
// bong bóng nổi ngoài widget, dùng chung cho tin chưa đọc và cho campaign
// (khác nhau đúng ở `campaignId` và nút đóng).


export interface UnreadListMessage {
    id?: number | string;
    content?: string | null;
    attachments?: MessageAttachment[];
    sender?: MessageSender;
    campaignId?: number;
}

function messageContent(message: UnreadListMessage): string {
    if (message.content) return message.content;
    if (message.attachments?.length) return '📑';
    return '';
}

function UnreadMessage({
    message,
    showSender,
    websiteName,
    useInboxAvatarForBot,
    inboxAvatarUrl,
}: {
    message: UnreadListMessage;
    showSender: boolean;
    websiteName: string;
    useInboxAvatarForBot: boolean;
    inboxAvatarUrl: string;
}) {
    const sender = message.sender;
    const hasSender = Boolean(sender && Object.keys(sender).length);
    const displayImage = useInboxAvatarForBot ? inboxAvatarUrl : BOT_AVATAR_URL;
    const avatarUrl = hasSender ? (sender?.avatar_url ?? '') : displayImage;
    const agentName = hasSender
        ? sender?.available_name || sender?.name || ''
        : useInboxAvatarForBot
          ? websiteName
          : t('UNREAD_VIEW.BOT');

    const onClick = () =>
        message.campaignId
            ? emitter.emit(WIDGET_BUS_EVENTS.ON_CAMPAIGN_MESSAGE_CLICK, message.campaignId)
            : emitter.emit(WIDGET_BUS_EVENTS.ON_UNREAD_MESSAGE_CLICK);

    return (
        <div className="chat-bubble-wrap">
            <button
                type="button"
                className="chat-bubble agent bg-white"
                onClick={onClick}
            >
                {showSender ? (
                    <div className="row--agent-block items-center flex text-left pb-2 text-xs">
                        <Avatar
                            src={avatarUrl}
                            size={20}
                            name={agentName}
                            status={(sender?.availability_status as 'online' | 'offline' | undefined) ?? null}
                            roundedFull
                        />
                        <span className="agent--name font-medium ml-1">{agentName}</span>
                        <span className="company--name text-n-slate-11 dark:text-n-slate-10 ml-1">
                            {`${t('UNREAD_VIEW.COMPANY_FROM')} ${websiteName}`}
                        </span>
                    </div>
                ) : null}
                <div
                    className="message-content"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                            new MessageFormatter(messageContent(message), false).formattedMessage,
                        ),
                    }}
                />
            </button>
        </div>
    );
}

export default function UnreadMessageList({
    messages,
    unreadMessageCount,
    quickReplies = [],
    onQuickReply,
    onClose,
}: {
    messages: UnreadListMessage[];
    unreadMessageCount: number;
    quickReplies?: string[];
    onQuickReply?: (reply: string) => void;
    onClose: () => void;
}) {
    const channelConfig = useWidgetState(state => state.channelConfig);

    return (
        <div className="unread-wrap" dir="ltr">
            <div className="close-unread-wrap">
                <button type="button" className="button small close-unread-button" onClick={onClose}>
                    <span className="flex items-center">
                        <FluentIcon className="mr-1" icon="dismiss" size="12" />
                        {t('UNREAD_VIEW.CLOSE_MESSAGES_BUTTON')}
                    </span>
                </button>
            </div>
            <div className="unread-messages">
                {messages.map((message, index) => (
                    <UnreadMessage
                        key={message.id ?? `campaign-${message.campaignId}`}
                        message={message}
                        showSender={!index}
                        websiteName={channelConfig?.websiteName ?? ''}
                        useInboxAvatarForBot={Boolean(
                            channelConfig?.enabledFeatures.includes('use_inbox_avatar_for_bot'),
                        )}
                        inboxAvatarUrl={channelConfig?.avatarUrl ?? ''}
                    />
                ))}
                {quickReplies.length && onQuickReply ? (
                    // Nằm trong .unread-messages để SDK tính đủ chiều cao khung khi mở lời mời.
                    <div className="yona-invite-replies mt-2 flex flex-wrap gap-1.5 ltr:justify-end rtl:justify-start">
                        {quickReplies.map(reply => (
                            <button
                                key={reply}
                                type="button"
                                className="min-h-10 rounded-full border border-[var(--yona-chat-line-field)] bg-[var(--yona-chat-panel)] px-3.5 py-2 text-[14px] font-medium leading-none text-[var(--yona-chat-ink)] shadow-[var(--yona-chat-shadow-chip)] active:scale-95"
                                onClick={() => onQuickReply(reply)}
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="open-read-view-wrap">
                {unreadMessageCount ? (
                    <button
                        type="button"
                        className="button clear-button"
                        onClick={() => emitter.emit(WIDGET_BUS_EVENTS.ON_UNREAD_MESSAGE_CLICK)}
                    >
                        <span className="flex items-center text-[var(--yona-chat-accent-ink)]">
                            <FluentIcon className="mr-2" size="16" icon="arrow-right" />
                            {t('UNREAD_VIEW.VIEW_MESSAGES_BUTTON')}
                        </span>
                    </button>
                ) : null}
            </div>
        </div>
    );
}
