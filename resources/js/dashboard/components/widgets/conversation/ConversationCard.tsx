import { useState } from 'react';
import type { MouseEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Icon from 'dashboard/components-next/icon/Icon';
import UnreadBadge from 'dashboard/components-next/Conversation/ConversationCard/UnreadBadge';
import { getLastMessage } from '../../../helper/conversationHelper';
import { previewSenderLabel } from 'dashboard/components-next/message/helpers/senderIdentity';
import type { DashboardPageProps } from '../../../types';
import type { ContactMeta, Conversation, ConversationMessage } from '../../../conversation/types';
import TimeAgo from '../../ui/TimeAgo';
import MessagePreview from './MessagePreview';
import HighlightedText from 'dashboard/search/components/HighlightedText';
import { ICONS } from 'dashboard/icons';

// Thẻ một cuộc trò chuyện trong danh sách: avatar, giờ tin mới nhất ở góc phải
// trên, tên người bên kia, dòng xem trước và số tin chưa đọc.
interface ConversationCardProps {
    chat: Conversation;
    currentContact: ContactMeta;
    isActiveChat?: boolean;
    // Từ khoá ô tìm của danh sách: tô đoạn khớp trên tên và tin cuối.
    highlightQuery?: string;
    previewMessage?: ConversationMessage;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

export default function ConversationCard({
    chat,
    currentContact,
    isActiveChat = false,
    highlightQuery = '',
    previewMessage,
    onClick,
}: ConversationCardProps) {
    // Avatar hình khối chỉ chuyển động khi đang trỏ vào thẻ, danh sách dài vẫn là ảnh tĩnh.
    const [isPointerInside, setPointerInside] = useState(false);
    const unreadCount = chat.unread_count;
    const hasUnread = unreadCount > 0;
    const lastMessageInChat = previewMessage ?? getLastMessage(chat);
    const currentUserId = usePage<DashboardPageProps>().props.auth?.user?.id ?? null;
    const lastMessageSender = lastMessageInChat ? previewSenderLabel(lastMessageInChat, { currentUserId, channelAccountName: '' }) : null;
    const isPinned = Boolean(chat.pinned);

    const messagePreviewClass = [hasUnread ? 'font-medium text-n-slate-12 ltr:pr-4 rtl:pl-4' : 'text-n-slate-11'].join(' ');

    return (
        <div
            className={[
                'relative flex items-center flex-grow-0 flex-shrink-0 w-full min-w-0 py-0 cursor-pointer conversation rounded-lg group ps-5 pe-3',
                isActiveChat ? 'active animate-card-select bg-n-surface-selected' : 'hover:bg-n-surface-hover',
            ].join(' ')}
            onClick={onClick}
            onMouseEnter={() => setPointerInside(true)}
            onMouseLeave={() => setPointerInside(false)}
        >
            <div className="relative">
                <Avatar
                    seed={chat.kind === 'group' ? avatarSeed('chat', chat.id) : avatarSeed('user', currentContact.id)}
                    animated={isPointerInside}
                    name={currentContact.name ?? ''}
                    src={currentContact.thumbnail}
                    size={40}
                />
            </div>
            <div className="px-0 py-3 flex-1 min-w-0">
                <div className="flex items-center min-w-0 gap-1 ltr:ml-2 rtl:mr-2">
                    <div className="flex items-center gap-1 flex-shrink-0 ltr:ml-auto rtl:mr-auto">
                        {isPinned ? (
                            <span title={t('CONVERSATION.CARD_CONTEXT_MENU.PINNED')} className="inline-flex">
                                <Icon icon={ICONS.pinned} className="size-3.5 text-n-brand" />
                            </span>
                        ) : null}
                        <TimeAgo
                            lastActivityTimestamp={chat.timestamp}
                            createdAtTimestamp={chat.created_at}
                            conversationId={chat.id}
                            showCreatedAt={false}
                            className="flex-shrink-0 whitespace-nowrap font-normal"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 min-w-0 pt-0.5 ltr:ml-2 rtl:mr-2">
                    <h4
                        className={[
                            'conversation--user text-sm my-0 text-ellipsis overflow-hidden whitespace-nowrap flex-1 min-w-0 text-n-slate-12',
                            hasUnread ? 'font-semibold' : 'font-medium',
                        ].join(' ')}
                    >
                        {highlightQuery ? <HighlightedText text={currentContact.name ?? ''} query={highlightQuery} /> : currentContact.name}
                    </h4>
                </div>
                {lastMessageInChat ? (
                    <MessagePreview
                        key="message-preview"
                        message={lastMessageInChat}
                        senderLabel={lastMessageSender}
                        highlightQuery={highlightQuery}
                        className={`my-0 mx-2 leading-6 h-6 flex-1 min-w-0 text-sm ${messagePreviewClass}`.trim()}
                    />
                ) : (
                    <p
                        key="no-messages"
                        className={`text-n-slate-11 text-sm my-0 mx-2 leading-6 h-6 flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${messagePreviewClass}`.trim()}
                    >
                        <span className={`${ICONS.info} size-4 -mt-0.5 align-middle inline-block text-n-slate-10`} aria-hidden="true" />
                        <span className="mx-0.5">{t('CHAT_LIST.NO_MESSAGES')}</span>
                    </p>
                )}
                {hasUnread ? <UnreadBadge count={unreadCount} className="absolute ltr:right-3 rtl:left-3 top-[3.25rem]" /> : null}
            </div>
        </div>
    );
}
