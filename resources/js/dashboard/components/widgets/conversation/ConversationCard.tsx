import { useState } from 'react';
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

// Người được giao ở góc phải dưới thẻ, ngang hàng dòng nhãn; tên dài cắt "…".
function CardAssignee({ assignee, isAgentBot }: { assignee: Partial<AgentMeta>; isAgentBot: boolean }) {
    const name = assignee.available_name || assignee.name || '';

    return (
        <span
            data-testid="card-assignee"
            title={name}
            className="flex items-center gap-1 min-w-0 max-w-[45%] ltr:ml-auto rtl:mr-auto text-xs font-medium leading-4 text-n-slate-11"
        >
            <Avatar
                seed={avatarSeed(isAgentBot ? 'agent_bot' : 'user', assignee.id)}
                name={name}
                src={assignee.thumbnail || assignee.avatar_url}
                size={16}
                roundedFull
                className="flex-shrink-0"
            />
            <span className="truncate">{name}</span>
        </span>
    );
}

// Port từ dashboard/components/widgets/conversation/ConversationCard.vue.
// Khác biệt cố ý: VoiceCallStatus + SLACardLabel (EE) — `showLabelsSection` vì thế
// chỉ còn nhánh `chat.labels`.
// Checkbox chọn hàng loạt phủ lên avatar chỉ khi đang ở chế độ chọn nhiều (bật từ
// thanh tab), không hiện khi rê chuột — xem docs/ux-decisions.md.
// Bố cục: dòng trên = logo nền tảng + tên hộp thư; góc phải trên = thời gian tin
// mới nhất; góc phải dưới = người được giao (chưa giao thì để trống).
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
    // Nút "…" mở cùng menu với chuột phải, neo tại toạ độ cho sẵn.
    onOpenActions?: (position: { x: number; y: number }) => void;
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
    onOpenActions,
    onSelectConversation,
    onDeSelectConversation,
}: ConversationCardProps) {
    // Avatar hình khối chỉ chuyển động khi đang trỏ vào thẻ, danh sách dài vẫn là ảnh tĩnh.
    const [isPointerInside, setPointerInside] = useState(false);
    const unreadCount = chat.unread_count;
    const contactAvailabilityStatus = useContactAvailabilityStatus(
        currentContact.id,
        currentContact.availability_status as AvailabilityStatus | undefined,
    );
    const hasUnread = unreadCount > 0;
    const lastMessageInChat = getLastMessage(chat);

    const isPinned = Boolean(chat.pinned);
    const showMetaSection = showInboxName || chat.priority || showStatus || isPinned || Boolean(onOpenActions);
    const showLabelsSection = (chat.labels?.length ?? 0) > 0;
    const showAssigneeSection = showAssignee && Boolean(assignee.name);
    const isAgentBotAssignee = chat.meta?.assignee_type === 'AgentBot';

    const openActionsFromButton = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const anchor = event.currentTarget.getBoundingClientRect();
        onOpenActions?.({ x: anchor.left, y: anchor.bottom });
    };

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
                'relative flex items-start flex-grow-0 flex-shrink-0 w-full min-w-0 py-0 cursor-pointer conversation rounded-lg group',
                isActiveChat ? 'active animate-card-select' : '',
                selected ? 'selected' : '',
                isActiveChat || selected ? 'bg-n-surface-selected' : 'hover:bg-n-surface-hover',
                compact ? 'px-0' : 'px-3',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setPointerInside(true)}
            onMouseLeave={() => setPointerInside(false)}
        >
            <div className="relative">
                {!hideThumbnail ? (
                    <Avatar
                        seed={avatarSeed('contact', currentContact.id)}
                        animated={isPointerInside}
                        name={currentContact.name ?? ''}
                        src={currentContact.thumbnail}
                        size={40}
                        status={contactAvailabilityStatus}
                        className={showMetaSection ? 'mt-8' : 'mt-4'}
                        hideOfflineStatus
                        overlay={({ size }) =>
                            isSelecting || selected ? (
                                <label
                                    className="flex items-center justify-center rounded-full cursor-pointer absolute inset-0 z-10 backdrop-blur-[2px]"
                                    style={{ width: size, height: size }}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <Checkbox className="rounded bg-n-surface-list" checked={selected} onChange={() => onSelectChange(!selected)} />
                                </label>
                            ) : null
                        }
                    />
                ) : null}
            </div>
            <div className="px-0 py-3 flex-1 min-w-0">
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
                        <div className="flex items-center gap-1 flex-shrink-0 ltr:ml-auto rtl:mr-auto">
                            {isPinned ? (
                                <span
                                    data-testid="card-pinned"
                                    title={t('CONVERSATION.CARD_CONTEXT_MENU.PINNED')}
                                    className="inline-flex"
                                >
                                    <Icon icon={ICONS.pin} className="size-3.5 text-n-slate-11" />
                                </span>
                            ) : null}
                            <CardPriorityIcon priority={chat.priority} className="flex-shrink-0 !size-3.5" />
                            {onOpenActions ? (
                                <button
                                    type="button"
                                    aria-label={t('CONVERSATION.CARD_CONTEXT_MENU.MORE_ACTIONS')}
                                    aria-haspopup="menu"
                                    className="grid place-content-center size-5 -my-1 rounded text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                                    onClick={openActionsFromButton}
                                >
                                    <Icon icon={ICONS.moreActions} className="size-4" />
                                </button>
                            ) : null}
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
                        showCreatedAt={false}
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
                {showLabelsSection || showAssigneeSection ? (
                    <div className="flex items-center gap-2 min-w-0 mt-0.5 mx-2">
                        {showLabelsSection ? (
                            <CardLabels conversationLabels={chat.labels ?? []} className="flex-1 min-w-0 my-0" />
                        ) : null}
                        {showAssigneeSection ? <CardAssignee assignee={assignee} isAgentBot={isAgentBotAssignee} /> : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
