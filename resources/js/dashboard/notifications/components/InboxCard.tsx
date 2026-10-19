import { useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import CardPriorityIcon from 'dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { snoozedReopenTimeToTimestamp } from 'dashboard/helper/snoozeHelpers';
import { shortTimestamp } from 'shared/helpers/timeHelper';
import { t } from '../../../i18n';
import { NOTIFICATION_TYPES_MAPPING } from '../helpers';
import type { NotificationRecord } from '../types';
import InboxContextMenu from './InboxContextMenu';
import type { InboxMenuItem } from './InboxContextMenu';
import { ICONS } from 'dashboard/icons';

// Port từ components-next/Inbox/InboxCard.vue. SLACardLabel là EE nên bỏ.

const MESSAGE_CLASSES = {
    emphasis: 'text-sm font-medium text-n-slate-11',
    emphasisUnread: 'text-sm font-medium text-n-slate-12',
    normal: 'text-sm font-normal text-n-slate-11',
    normalUnread: 'text-sm text-n-slate-12',
};

interface StateInbox {
    name: string;
    channel_type: string;
}

interface InboxCardProps {
    inboxItem: NotificationRecord;
    stateInbox?: StateInbox;
    className?: string;
    onClick: () => void;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
    onDelete: () => void;
    onContextMenuOpen: () => void;
    onContextMenuClose: () => void;
}

// formatPushMessage gốc: bỏ tiền tố ": " khi không có người gửi, còn lại in đậm tên.
export function formatPushMessage(message: string, emphasisClass: string): string {
    if (message.startsWith(': ')) return message.slice(2);

    return message.replace(/^([^:]+):/g, (_match, name: string) => `<span class="${emphasisClass}">${name}:</span>`);
}

export default function InboxCard({
    inboxItem,
    stateInbox,
    className = '',
    onClick,
    onMarkAsRead,
    onMarkAsUnread,
    onDelete,
    onContextMenuOpen,
    onContextMenuClose,
}: InboxCardProps) {
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

    const primaryActor = inboxItem.primary_actor;
    const assigneeMeta = primaryActor?.meta?.sender;
    const isUnread = !inboxItem.read_at;
    const inboxIcon = stateInbox ? getInboxIconByType(stateInbox.channel_type, 'fill') : '';

    const messageClasses = {
        emphasis: isUnread ? MESSAGE_CLASSES.emphasisUnread : MESSAGE_CLASSES.emphasis,
        normal: isUnread ? MESSAGE_CLASSES.normalUnread : MESSAGE_CLASSES.normal,
    };

    const lastActivityAt = inboxItem.last_activity_at
        ? shortTimestamp(inboxItem.last_activity_at)
        : '';

    const menuItems: InboxMenuItem[] = [
        {
            key: isUnread ? 'mark_as_read' : 'mark_as_unread',
            icon: isUnread ? ICONS.markRead : ICONS.markUnread,
            label: t(`INBOX.MENU_ITEM.MARK_AS_${isUnread ? 'READ' : 'UNREAD'}`),
        },
        { key: 'delete', icon: ICONS.delete, label: t('INBOX.MENU_ITEM.DELETE') },
    ];

    const messageContent = `<span class="${messageClasses.normal}">${formatPushMessage(
        inboxItem.push_message_body || '',
        messageClasses.emphasis,
    )}</span>`;
    const formattedMessage = isUnread
        ? `<span class="inline-flex flex-shrink-0 w-2 h-2 mb-px rounded-full bg-n-iris-10 ltr:mr-1 rtl:ml-1"></span> ${messageContent}`
        : messageContent;

    const notificationType = inboxItem.notification_type?.toUpperCase() ?? '';
    const [typeIcon = '', typeColor = 'text-n-blue-11'] = NOTIFICATION_TYPES_MAPPING[notificationType] ?? [];
    const typeText = notificationType ? t(`INBOX.TYPES_NEXT.${notificationType}`) : '';

    const snoozedUntilTimestamp = snoozedReopenTimeToTimestamp(inboxItem.snoozed_until);
    const snoozedUntilTime = snoozedUntilTimestamp ? shortTimestamp(snoozedUntilTimestamp) : null;
    const hasLastSnoozed = Boolean(inboxItem.meta?.last_snoozed_at);
    const snoozedText = !hasLastSnoozed
        ? t('INBOX.TYPES_NEXT.SNOOZED_UNTIL', { time: snoozedUntilTime ?? '' })
        : t('INBOX.TYPES_NEXT.SNOOZED_ENDS');

    const closeContextMenu = () => {
        setContextMenuPosition(null);
        onContextMenuClose();
    };

    const handleAction = (key: string) => {
        const actions: Record<string, () => void> = {
            mark_as_read: onMarkAsRead,
            mark_as_unread: onMarkAsUnread,
            delete: onDelete,
        };
        actions[key]?.();
    };

    return (
        <div
            role="button"
            className={`flex flex-col w-full gap-1 p-3 transition-all duration-300 ease-in-out cursor-pointer ${className}`}
            onContextMenu={event => {
                event.preventDefault();
                setContextMenuPosition({ x: event.pageX || event.clientX, y: event.pageY || event.clientY });
                onContextMenuOpen();
            }}
            onClick={onClick}
        >
            <div className="flex items-start gap-2">
                <Avatar
                    seed={avatarSeed('contact', assigneeMeta?.id)}
                    name={assigneeMeta?.name ?? ''}
                    src={assigneeMeta?.thumbnail}
                    size={20}
                    roundedFull
                    className="mt-1"
                />
                <p className="mb-0 line-clamp-2" dangerouslySetInnerHTML={{ __html: formattedMessage }} />
            </div>
            <div className="flex items-center justify-between h-6 gap-2">
                <div className="flex items-center flex-1 min-w-0 gap-1">
                    {snoozedUntilTime || hasLastSnoozed ? (
                        <div className="flex items-center w-full min-w-0 gap-2 ltr:pl-1 rtl:pr-1">
                            <Icon
                                icon={!hasLastSnoozed ? 'i-lucide-alarm-clock-plus' : 'i-lucide-alarm-clock-off'}
                                className={`flex-shrink-0 size-4 ${!isUnread ? 'text-n-slate-11' : 'text-n-blue-11'}`}
                            />
                            <span
                                className={`text-xs font-medium truncate ${!isUnread ? 'text-n-slate-11' : 'text-n-blue-11'}`}
                            >
                                {snoozedText}
                            </span>
                        </div>
                    ) : typeText ? (
                        <div className="flex items-center w-full min-w-0 gap-2 ltr:pl-1 rtl:pr-1">
                            <Icon
                                icon={typeIcon}
                                className={`flex-shrink-0 size-4 ${isUnread ? typeColor : 'text-n-slate-11'}`}
                            />
                            <span
                                className={`text-xs font-medium truncate ${isUnread ? typeColor : 'text-n-slate-11'}`}
                            >
                                {typeText}
                            </span>
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center flex-shrink-0 gap-2">
                    {primaryActor?.priority ? (
                        <CardPriorityIcon priority={primaryActor.priority} className="[&>svg]:size-4" />
                    ) : null}
                    {inboxIcon ? (
                        <div
                            title={stateInbox?.name}
                            className="flex items-center justify-center flex-shrink-0 rounded-full bg-n-alpha-2 size-4"
                        >
                            <Icon icon={inboxIcon} className="flex-shrink-0 text-n-slate-11 size-2.5" />
                        </div>
                    ) : null}
                    <span className="text-xs text-n-slate-10">{lastActivityAt}</span>
                </div>
            </div>
            {contextMenuPosition ? (
                <InboxContextMenu
                    x={contextMenuPosition.x}
                    y={contextMenuPosition.y}
                    menuItems={menuItems}
                    onClose={closeContextMenu}
                    onSelectAction={handleAction}
                />
            ) : null}
        </div>
    );
}
