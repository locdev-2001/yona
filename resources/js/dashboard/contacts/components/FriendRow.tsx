import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { fetchContactConversations } from 'dashboard/conversation/panelApi';
import { composeConversationUrl, conversationUrl } from 'dashboard/helper/URLHelper';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../types';

const ROUND_ACTION_CLASS =
    'grid place-content-center size-9 rounded-full bg-n-alpha-2 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-3 transition-colors';

interface FriendRowProps {
    contact: Contact;
    onRemoved: () => void;
}

// Một dòng trong danh sách Bạn bè: ảnh có chấm trạng thái, tên kèm logo kênh,
// dòng trạng thái; bên phải là Nhắn tin và menu ⋮.
export default function FriendRow({ contact, onRemoved }: FriendRowProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const canRemove = currentAccountUser.role === 'administrator';
    const isOnline = contact.availabilityStatus === 'online';
    const channels = uniqueChannels(contact);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const removeDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const closeOnClickAway = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', closeOnClickAway);
        return () => document.removeEventListener('mousedown', closeOnClickAway);
    }, [isMenuOpen]);

    const viewProfile = () => router.visit(`/app/accounts/${accountId}/contacts/${contact.id}`);

    const openChat = async () => {
        const conversations = await fetchContactConversations(accountId, contact.id).catch(() => []);
        const latest = conversations[0];
        router.visit(
            latest
                ? conversationUrl({ accountId, id: latest.id })
                : composeConversationUrl({ accountId, contactId: contact.id }),
        );
    };

    const menuItems = [
        { label: t('CONTACTS_LAYOUT.FRIENDS.VIEW_PROFILE'), action: 'profile', value: 'profile', icon: 'i-lucide-user-round' },
        ...(canRemove
            ? [{ label: t('CONTACTS_LAYOUT.FRIENDS.REMOVE'), action: 'remove', value: 'remove', icon: 'i-lucide-trash-2' }]
            : []),
    ];

    return (
        <li className="group flex items-center gap-3 px-2.5 py-2.5 -mx-2.5 rounded-lg border-t border-n-weak first:border-t-transparent hover:bg-n-alpha-1 hover:border-transparent [&:hover+li]:border-transparent">
            <button type="button" className="flex flex-1 items-center gap-3 min-w-0 text-start" onClick={viewProfile}>
                <Avatar
                    seed={avatarSeed('contact', contact.id)}
                    name={contact.name}
                    src={contact.thumbnail}
                    size={32}
                    status={isOnline ? 'online' : null}
                />
                <span className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold truncate text-n-slate-12">{contact.name}</span>
                        {channels.map(channel => (
                            <ChannelIcon
                                key={channel.channel_type}
                                inbox={channel}
                                className="size-3.5 shrink-0 text-n-slate-10"
                            />
                        ))}
                    </span>
                    <span className="text-xs truncate text-n-slate-11">
                        {isOnline ? t('CONTACTS_LAYOUT.FRIENDS.STATUS_ONLINE') : t('CONTACTS_LAYOUT.FRIENDS.STATUS_OFFLINE')}
                    </span>
                </span>
            </button>
            <div className="flex items-center gap-2.5 shrink-0">
                <button
                    type="button"
                    className={ROUND_ACTION_CLASS}
                    title={t('CONTACTS_LAYOUT.FRIENDS.MESSAGE')}
                    aria-label={t('CONTACTS_LAYOUT.FRIENDS.MESSAGE')}
                    onClick={() => void openChat()}
                >
                    <span className="i-lucide-message-circle size-[18px]" />
                </button>
                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        className={ROUND_ACTION_CLASS}
                        title={t('CONTACTS_LAYOUT.FRIENDS.MORE')}
                        aria-label={t('CONTACTS_LAYOUT.FRIENDS.MORE')}
                        aria-expanded={isMenuOpen}
                        onClick={() => setMenuOpen(open => !open)}
                    >
                        <span className="i-lucide-ellipsis-vertical size-[18px]" />
                    </button>
                    {isMenuOpen ? (
                        <DropdownMenu
                            menuItems={menuItems}
                            className="ltr:right-0 rtl:left-0 mt-1 w-48 top-full z-30"
                            onAction={item => {
                                setMenuOpen(false);
                                if (item.action === 'profile') viewProfile();
                                else if (item.action === 'remove') removeDialogRef.current?.open();
                            }}
                        />
                    ) : null}
                </div>
            </div>
            {canRemove ? (
                <ConfirmContactDeleteDialog
                    ref={removeDialogRef}
                    accountId={accountId}
                    contactId={contact.id}
                    onDeleted={onRemoved}
                />
            ) : null}
        </li>
    );
}

function uniqueChannels(contact: Contact) {
    const byType = new Map<string, { channel_type: string; name: string }>();
    (contact.contactInboxes ?? []).forEach(({ inbox }) => {
        if (!byType.has(inbox.channelType)) byType.set(inbox.channelType, { channel_type: inbox.channelType, name: inbox.name });
    });
    return [...byType.values()];
}
