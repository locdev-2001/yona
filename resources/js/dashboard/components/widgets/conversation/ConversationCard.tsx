import type { MouseEvent } from 'react';

import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import Icon from 'dashboard/components-next/icon/Icon';
import type { ChannelIconInbox } from 'dashboard/components-next/icon/ChannelIcon';
import CardPriorityIcon from 'dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon';
import UnreadBadge from 'dashboard/components-next/Conversation/ConversationCard/UnreadBadge';
import { getLastMessage } from '../../../helper/conversationHelper';
import type { AgentMeta, ContactMeta, Conversation } from '../../../conversation/types';
import InboxName from '../InboxName';
import TimeAgo from '../../ui/TimeAgo';
import MessagePreview from './MessagePreview';
import CardLabels from './conversationCardComponents/CardLabels';
import HighlightedText from 'dashboard/search/components/HighlightedText';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import { ICONS } from 'dashboard/icons';

const STATUS_DOT_COLOR: Record<string, string> = {
    open: 'bg-n-teal-10',
    pending: 'bg-n-amber-10',
    snoozed: 'bg-n-slate-9',
    resolved: 'bg-n-slate-9',
};

function ConversationStatusChip({ status }: { status: string }) {
    if (!status) return null;

    return (
        <span className="inline-flex items-center gap-1 flex-shrink-0 text-xs font-medium leading-3 text-n-slate-11">
            <span className={`size-1.5 rounded-full ${STATUS_DOT_COLOR[status] ?? 'bg-n-slate-9'}`} aria-hidden="true" />
            <span className="truncate">{t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${status}.TEXT`)}</span>
        </span>
    );
}

// Port từ dashboard/components/widgets/conversation/ConversationCard.vue.
// Khác biệt cố ý: VoiceCallStatus + SLACardLabel (EE) — `showLabelsSection` vì thế
// chỉ còn nhánh `chat.labels`.
// Checkbox chọn hàng loạt phủ lên avatar chỉ khi đang ở chế độ chọn nhiều (bật từ
// thanh tab), không hiện khi rê chuột — xem docs/ux-decisions.md.
interface ConversationCardProps {
    chat: Conversation;
    currentContact: ContactMeta;
    assignee?: Partial<AgentMeta>;
    inbox?: ChannelIconInbox & { name: string; reauthorization_required?: boolean };
    selected?: boolean;
    isSelecting?: boolean;
    isActiveChat?: boolean;
    showAssignee?: boolean;
    showInboxName?: boolean;
    // Dùng ở "Hội thoại trước" của panel phải: người trực cần biết hội thoại cũ
    // đã đóng hay còn mở trước khi bấm sang.
    showStatus?: boolean;
    hideThumbnail?: boolean;
    compact?: boolean;
    // Từ khoá ô tìm của danh sách: tô đoạn khớp trên tên khách và tin cuối.
    highlightQuery?: string;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
    onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
    onSelectConversation?: (conversationId: number, inboxId: number) => void;
    onDeSelectConversation?: (conversationId: number, inboxId: number) => void;
}

export default function ConversationCard({
    chat,
    currentContact,
    assignee = {},
    inbox = { name: '', channel_type: '' },
    selected = false,
    isSelecting = false,
    isActiveChat = false,
    showAssignee = false,
    showInboxName = false,
    showStatus = false,
    hideThumbnail = false,
    compact = false,
    highlightQuery = '',
    onClick,
    onContextMenu,
    onSelectConversation,
    onDeSelectConversation,
}: ConversationCardProps) {
    const unreadCount = chat.unread_count;
    const contactAvailabilityStatus = useContactAvailabilityStatus(
        currentContact.id,
        currentContact.availability_status as AvailabilityStatus | undefined,
    );
    const hasUnread = unreadCount > 0;
    const lastMessageInChat = getLastMessage(chat);

    const showMetaSection = showInboxName || (showAssignee && assignee.name) || chat.priority || showStatus;
    const showLabelsSection = (chat.labels?.length ?? 0) > 0;
    const isAgentBotAssignee = chat.meta?.assignee_type === 'AgentBot';

    const onSelectChange = (checked: boolean) => {
        if (checked) {
            onSelectConversation?.(chat.id, chat.inbox_id);
        } else {
            onDeSelectConversation?.(chat.id, chat.inbox_id);
        }
    };

    const messagePreviewClass = [
        hasUnread ? 'font-medium text-n-slate-12' : 'text-n-slate-11',
        !compact && hasUnread ? 'ltr:pr-4 rtl:pl-4' : '',
        compact && hasUnread ? 'ltr:pr-6 rtl:pl-6' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={[
                "relative flex items-start flex-grow-0 flex-shrink-0 w-full min-w-0 py-0 cursor-pointer conversation border-b border-n-slate-3 hover:border-n-surface-1 hover:bg-n-alpha-1 group hover:z-[1] before:content-[none] before:absolute before:-top-px before:inset-x-0 before:h-px before:bg-n-surface-1 before:pointer-events-none hover:before:content-['']",
                isActiveChat ? 'active animate-card-select bg-n-background !border-n-surface-1' : '',
                selected ? 'selected bg-n-slate-2 !border-n-surface-1' : '',
                compact ? 'px-0' : 'px-3',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            <div className="relative">
                {!hideThumbnail ? (
                    <Avatar
                        seed={avatarSeed('contact', currentContact.id)}
                        name={currentContact.name ?? ''}
                        src={currentContact.thumbnail}
                        size={40}
                        status={contactAvailabilityStatus}
                        className={!showInboxName ? 'mt-4' : 'mt-8'}
                        hideOfflineStatus
                        overlay={({ size }) =>
                            isSelecting || selected ? (
                                <label
                                    className="flex items-center justify-center rounded-full cursor-pointer absolute inset-0 z-10 backdrop-blur-[2px]"
                                    style={{ width: size, height: size }}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <Checkbox className="rounded bg-n-surface-1" checked={selected} onChange={() => onSelectChange(!selected)} />
                                </label>
                            ) : null
                        }
                    />
                ) : null}
            </div>
            <div className="px-0 py-3 flex-1 min-w-0 border-line">
                {showMetaSection ? (
                    <div
                        className={[
                            'flex items-center min-w-0 gap-1',
                            !compact ? 'ltr:ml-2 rtl:mr-2' : 'mx-2',
                        ].join(' ')}
                    >
                        {showInboxName ? <InboxName inbox={inbox} className="flex-1 min-w-0" /> : null}
                        {showInboxName && inbox.reauthorization_required ? (
                            <span
                                title={t('SIDEBAR.REAUTHORIZE')}
                                className="grid place-content-center size-4 rounded-full bg-n-ruby-5/60 flex-shrink-0"
                            >
                                <Icon icon="i-lucide-triangle-alert" className="size-2.5 text-n-ruby-9" />
                            </span>
                        ) : null}
                        {showStatus ? <ConversationStatusChip status={chat.status} /> : null}
                        <div
                            className={[
                                'flex items-baseline gap-2 flex-shrink-0',
                                !showInboxName ? 'flex-1 justify-between' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {showAssignee && assignee.name ? (
                                <span className="text-n-slate-11 text-xs font-medium leading-3 py-0.5 px-0 inline-flex items-center gap-px truncate">
                                    <Icon
                                        icon={isAgentBotAssignee ? 'i-lucide-bot' : 'i-lucide-user-round'}
                                        className="size-3 text-n-slate-11 flex-shrink-0"
                                    />
                                    <span className="truncate">{assignee.name}</span>
                                </span>
                            ) : null}
                            <CardPriorityIcon priority={chat.priority} className="flex-shrink-0 !size-3.5" />
                        </div>
                    </div>
                ) : null}
                {/* Thời gian cùng hàng với tên: tên nhường đúng bề rộng chữ thời gian của từng ngôn ngữ. */}
                <div
                    className={['flex items-center gap-2 min-w-0 pt-0.5 ltr:ml-2 rtl:mr-2', compact ? 'ltr:mr-3 rtl:ml-3' : '']
                        .filter(Boolean)
                        .join(' ')}
                >
                    <h4
                        className={[
                            'conversation--user text-sm my-0 text-ellipsis overflow-hidden whitespace-nowrap flex-1 min-w-0 text-n-slate-12',
                            hasUnread ? 'font-semibold' : 'font-medium',
                        ].join(' ')}
                    >
                        {highlightQuery ? (
                            <HighlightedText text={currentContact.name ?? ''} query={highlightQuery} />
                        ) : (
                            currentContact.name
                        )}
                    </h4>
                    <TimeAgo
                        lastActivityTimestamp={chat.timestamp}
                        createdAtTimestamp={chat.created_at}
                        conversationId={chat.id}
                        className="flex-shrink-0 whitespace-nowrap font-normal"
                    />
                </div>
                {lastMessageInChat ? (
                    <MessagePreview
                        key="message-preview"
                        message={lastMessageInChat}
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
                {hasUnread ? (
                    <UnreadBadge
                        count={unreadCount}
                        className={['absolute ltr:right-3 rtl:left-3', showMetaSection ? 'top-[3.25rem]' : 'top-9'].join(' ')}
                    />
                ) : null}
                {showLabelsSection ? (
                    <CardLabels conversationLabels={chat.labels ?? []} className="mt-0.5 mx-2 mb-0" />
                ) : null}
            </div>
        </div>
    );
}
