import { useState } from 'react';
import type { MouseEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { conversationAvatarSeed, conversationAvatarStack } from 'shared/avatar/avatarSeed';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import Icon from 'dashboard/components-next/icon/Icon';
import type { ChannelIconInbox } from 'dashboard/components-next/icon/ChannelIcon';
import CardPriorityIcon from 'dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon';
import UnreadBadge from 'dashboard/components-next/Conversation/ConversationCard/UnreadBadge';
import { getLastMessage } from '../../../helper/conversationHelper';
import { previewSenderLabel } from 'dashboard/components-next/message/helpers/senderIdentity';
import type { DashboardPageProps } from '../../../types';
import type { AgentMeta, ContactMeta, Conversation, ConversationMessage } from '../../../conversation/types';
import InboxName from '../InboxName';
import { StrangerBadge, useIsStranger } from 'dashboard/friends/yonaRelationships';
import TimeAgo from '../../ui/TimeAgo';
import MessagePreview from './MessagePreview';
import CardLabels from './conversationCardComponents/CardLabels';
import HighlightedText from 'dashboard/components-next/highlighted-text/HighlightedText';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import { ICONS } from 'dashboard/icons';
import { statusDotColor } from '../../../conversation/statusAppearance';
import { AssigneePill, assigneeKind } from '../../../conversation/AssigneeIdentity';

function ConversationStatusChip({ status }: { status: string }) {
    if (!status) return null;

    return (
        <span className="inline-flex items-center gap-1 flex-shrink-0 text-xs font-medium leading-3 text-n-slate-11">
            <span className={`size-1.5 rounded-full ${statusDotColor(status)}`} aria-hidden="true" />
            <span className="truncate">{t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${status}.TEXT`)}</span>
        </span>
    );
}

// Người phụ trách ở góc phải dưới thẻ, ngang hàng dòng nhãn; tên dài cắt "…".
function CardAssignee({
    assignee,
    isAgentBot,
    currentUserId,
    sharesRowWithLabels,
}: {
    assignee: Partial<AgentMeta>;
    isAgentBot: boolean;
    currentUserId: number | null;
    sharesRowWithLabels: boolean;
}) {
    return (
        <AssigneePill
            assignee={assignee}
            isAgentBot={isAgentBot}
            kind={assigneeKind(assignee, isAgentBot, currentUserId)}
            className={`${sharesRowWithLabels ? 'max-w-[55%]' : 'max-w-full'} ltr:ml-auto rtl:mr-auto`}
        />
    );
}

// Port từ dashboard/components/widgets/conversation/ConversationCard.vue.
// Khác biệt cố ý: VoiceCallStatus + SLACardLabel (EE) — `showLabelsSection` vì thế
// chỉ còn nhánh `chat.labels`.
// Checkbox chọn hàng loạt phủ lên avatar chỉ khi đang ở chế độ chọn nhiều (bật từ
// thanh tab), không hiện khi rê chuột — xem docs/ux-decisions.md.
// Bố cục: dòng trên = logo nền tảng + tên hộp thư; góc phải trên = thời gian tin
// mới nhất; góc phải dưới = người phụ trách ("Phụ trách: Bạn/<tên>", chưa giao thì cảnh báo).
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
    // Tin hiện ở dòng xem trước thay cho tin cuối (vd đoạn tin khớp khi tìm).
    previewMessage?: ConversationMessage;
    // Từ khoá chỉ tô ở dòng xem trước; mặc định theo highlightQuery.
    previewHighlightQuery?: string;
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
    previewMessage,
    previewHighlightQuery,
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
    const isStranger = useIsStranger(chat.meta?.sender?.id);
    const lastMessageInChat = previewMessage ?? getLastMessage(chat);
    const currentUserId = usePage<DashboardPageProps>().props.auth?.user?.id ?? null;
    const lastMessageSender = lastMessageInChat
        ? previewSenderLabel(lastMessageInChat, { currentUserId, channelAccountName: inbox.name })
        : null;

    const isPinned = Boolean(chat.pinned);
    // Hàng trên cùng luôn có thời gian tương tác cuối nên luôn hiện.
    const showMetaSection = true;
    const showLabelsSection = (chat.labels?.length ?? 0) > 0;
    const showAssigneeSection = showAssignee;
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

    // Lề cuối dòng xem trước chừa chỗ cho số chưa đọc và nút thêm bạn nằm cùng hàng.
    const previewEndPadding = isStranger
        ? hasUnread
            ? 'ltr:pr-16 rtl:pl-16 max-md:ltr:pr-[4.5rem] max-md:rtl:pl-[4.5rem]'
            : 'ltr:pr-8 rtl:pl-8 max-md:ltr:pr-10 max-md:rtl:pl-10'
        : hasUnread
          ? compact
              ? 'ltr:pr-6 rtl:pl-6'
              : 'ltr:pr-4 rtl:pl-4'
          : '';
    const messagePreviewClass = [hasUnread ? 'font-medium text-n-slate-12' : 'text-n-slate-11', previewEndPadding]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={[
                'relative flex items-center flex-grow-0 flex-shrink-0 w-full min-w-0 py-0 cursor-pointer conversation rounded-lg group',
                isActiveChat ? 'active animate-card-select' : '',
                selected ? 'selected' : '',
                isActiveChat || selected ? 'bg-n-surface-selected' : 'hover:bg-n-surface-hover',
                compact ? 'px-0' : 'ps-5 pe-3',
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
                        seed={conversationAvatarSeed(chat.group, currentContact.id)}
                        stack={conversationAvatarStack(chat.group)}
                        animated={isPointerInside}
                        name={currentContact.name ?? ''}
                        src={currentContact.thumbnail}
                        size={40}
                        status={contactAvailabilityStatus}
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
                        {chat.group ? (
                            <span className="flex items-center gap-1 flex-shrink-0 text-xs text-n-slate-11">
                                <Icon icon="i-lucide-users-round" className="size-3" />
                                {t('CHAT.GROUP.MEMBERS', { count: chat.group.member_count })}
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
                                    <Icon icon={ICONS.pinned} className="size-3.5 text-n-brand" />
                                </span>
                            ) : null}
                            <CardPriorityIcon priority={chat.priority} className="flex-shrink-0 !size-3.5" />
                            {showInboxName && inbox.reauthorization_required ? (
                                <span
                                    title={t('SIDEBAR.REAUTHORIZE')}
                                    className="grid place-content-center size-3.5 rounded-full bg-n-ruby-5/60 flex-shrink-0"
                                >
                                    <Icon icon="i-lucide-triangle-alert" className="size-2 text-n-ruby-9" />
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
                ) : null}
                {/* Nút … nằm cuối hàng tên, giữa chiều cao thẻ; thời gian và cảnh báo ở hàng trên cùng. */}
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
                    {onOpenActions ? (
                        <button
                            type="button"
                            aria-label={t('CONVERSATION.CARD_CONTEXT_MENU.MORE_ACTIONS')}
                            aria-haspopup="menu"
                            className="grid place-content-center flex-shrink-0 size-6 -my-1 -me-1 rounded text-n-slate-11 hover:bg-n-surface-hover hover:text-n-slate-12"
                            onClick={openActionsFromButton}
                        >
                            <Icon icon={ICONS.moreActions} className="size-4" />
                        </button>
                    ) : null}
                </div>
                {lastMessageInChat ? (
                    <MessagePreview
                        key="message-preview"
                        message={lastMessageInChat}
                        senderLabel={lastMessageSender}
                        highlightQuery={previewHighlightQuery ?? highlightQuery}
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
                <StrangerBadge
                    contactId={chat.meta?.sender?.id}
                    className={[
                        'absolute',
                        showMetaSection ? 'top-[3.125rem] max-md:top-[2.875rem]' : 'top-8 max-md:top-7',
                        hasUnread ? 'ltr:right-11 rtl:left-11' : 'ltr:right-3 rtl:left-3',
                    ].join(' ')}
                />
                {showLabelsSection || showAssigneeSection ? (
                    <div className="flex items-center gap-2 min-w-0 mt-0.5 mx-2">
                        {showLabelsSection ? (
                            <CardLabels conversationLabels={chat.labels ?? []} className="flex-1 min-w-0 my-0" />
                        ) : null}
                        {showAssigneeSection ? <CardAssignee
                                assignee={assignee}
                                isAgentBot={isAgentBotAssignee}
                                currentUserId={currentUserId}
                                sharesRowWithLabels={showLabelsSection}
                            /> : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
