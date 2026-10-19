import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Loader from 'shared/components/loader/Loader';
import ContactHistory from 'dashboard/components-next/Contacts/ContactsSidebar/ContactHistory';
import ContactNotes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactNotes';
import ContactMedia from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMedia';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { fetchContact, updateContact } from 'dashboard/contacts/api';
import { mergeContactUpdate, useContactUpdates } from 'dashboard/contacts/contactUpdates';
import { openContactChat } from 'dashboard/contacts/openContactChat';
import { yonaUserIdOf } from 'dashboard/contacts/contactChannels';
import type { Contact } from 'dashboard/contacts/types';
import { acceptFriendRequest, fetchFriendshipProfile, removeFriendship, sendFriendRequest } from 'dashboard/friends/api';
import type { FriendshipProfile } from 'dashboard/friends/api';
import { useFriendshipChanges } from 'dashboard/friends/useFriendshipChanges';
import ProfileCard from './ProfileCard';
import type { ProfileMenuItem } from './ProfileCard';
import ProfileWindow from './ProfileWindow';
import type { DashboardPageProps } from '../../types';

// Không có tab sửa thông tin: hồ sơ của ai thì chỉ người đó sửa.
const PROFILE_TABS = [
    { key: 'ACTIVITY', value: 'history' },
    { key: 'NOTES', value: 'notes' },
    { key: 'MEDIA', value: 'media' },
] as const;
type ProfileTab = (typeof PROFILE_TABS)[number]['value'];

interface ContactProfileProps {
    contactId: number;
    onClose: () => void;
}

// Hồ sơ một người: thẻ trái (ảnh, tên, kết bạn, giới thiệu, kết nối) và các tab bên phải
// (hoạt động, ghi chú, tệp, thông tin). Dùng chung cho lớp nổi mở ngay trên trang đang
// xem (openProfile) và trang /contacts/{id} khi mở thẳng đường dẫn.
export default function ContactProfile({ contactId, onClose }: ContactProfileProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdministrator = currentAccountUser.role === 'administrator';

    const [contact, setContact] = useState<Contact | null>(null);
    const [isFetching, setFetching] = useState(true);
    // undefined = người dùng Yona nhưng chưa tải xong quan hệ; null = không phải người dùng Yona.
    const [friendship, setFriendship] = useState<FriendshipProfile | null | undefined>(undefined);
    const [isBusy, setBusy] = useState(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>('history');
    const deleteDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);
    const yonaUserId = yonaUserIdOf(contact);

    useEffect(() => {
        let active = true;
        fetchContact(accountId, contactId)
            .then(loaded => {
                if (active) setContact(loaded);
            })
            .finally(() => {
                if (active) setFetching(false);
            });
        return () => {
            active = false;
        };
    }, [accountId, contactId]);

    const loadFriendship = useCallback(() => {
        if (yonaUserId === null) {
            setFriendship(null);
            return;
        }
        fetchFriendshipProfile(yonaUserId).then(setFriendship, () => setFriendship(null));
    }, [yonaUserId]);

    useEffect(loadFriendship, [loadFriendship]);
    useFriendshipChanges(loadFriendship);
    useContactUpdates(update => setContact(current => current && mergeContactUpdate(current, update)));

    const close = onClose;

    const runFriendAction = async (action: () => Promise<FriendshipProfile | unknown>, doneMessage?: string) => {
        setBusy(true);
        try {
            const result = await action();
            if (result && typeof result === 'object' && 'state' in result) setFriendship(result as FriendshipProfile);
            else loadFriendship();
            if (doneMessage) useAlert(doneMessage);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FRIENDS.REQUESTS.ERROR'));
        } finally {
            setBusy(false);
        }
    };

    const toggleBlock = async () => {
        if (!contact) return;
        const isBlocked = Boolean(contact.blocked);
        try {
            setContact(await updateContact(accountId, contact.id, { blocked: !isBlocked }));
            useAlert(t(`CONTACTS_LAYOUT.HEADER.ACTIONS.${isBlocked ? 'UNBLOCK' : 'BLOCK'}_SUCCESS_MESSAGE`));
        } catch {
            useAlert(t(`CONTACTS_LAYOUT.HEADER.ACTIONS.${isBlocked ? 'UNBLOCK' : 'BLOCK'}_ERROR_MESSAGE`));
        }
    };

    const name = contact?.name ?? '';
    const friendshipId = friendship?.friendship_id ?? null;
    const removeLabelKey = { incoming: 'DECLINE', outgoing: 'CANCEL_REQUEST', friends: 'UNFRIEND', none: null }[friendship?.state ?? 'none'];

    const menuItems: ProfileMenuItem[] = [
        ...(removeLabelKey && friendshipId
            ? [{ action: 'remove_friendship', label: t(`FRIENDS.PROFILE.${removeLabelKey}`), icon: 'i-lucide-user-round-x' }]
            : []),
        {
            action: 'toggle_block',
            label: contact?.blocked ? t('CONTACTS_LAYOUT.HEADER.UNBLOCK_CONTACT') : t('CONTACTS_LAYOUT.HEADER.BLOCK_CONTACT'),
            icon: 'i-lucide-ban',
        },
        ...(isAdministrator ? [{ action: 'delete', label: t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT'), icon: 'i-lucide-trash-2' }] : []),
    ];

    const onMenuAction = (action: string) => {
        if (action === 'toggle_block') void toggleBlock();
        else if (action === 'delete') deleteDialogRef.current?.open();
        else if (action === 'remove_friendship' && friendshipId) {
            const doneMessage = friendship?.state === 'friends' ? t('FRIENDS.PROFILE.UNFRIENDED', { name }) : undefined;
            void runFriendAction(() => removeFriendship(friendshipId), doneMessage);
        }
    };

    const onFriendAction = () => {
        if (!friendship || yonaUserId === null) return;
        if (friendship.state === 'none') void runFriendAction(() => sendFriendRequest(yonaUserId), t('FRIENDS.ADD.SENT', { name }));
        else if (friendship.state === 'incoming' && friendshipId)
            void runFriendAction(() => acceptFriendRequest(friendshipId), t('FRIENDS.REQUESTS.ACCEPTED', { name }));
    };

    // Người dùng Yona chưa kết bạn: không xem hoạt động, ghi chú, tệp của người đó.
    const isLockedStranger = friendship !== null && friendship !== undefined && friendship.state !== 'friends';

    const tabs = isLockedStranger ? null : (
        <nav className="flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-n-weak" role="tablist">
            {PROFILE_TABS.map(tab => {
                const isActive = tab.value === activeTab;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`h-10 -mb-px shrink-0 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                            isActive ? 'border-n-slate-12 text-n-slate-12' : 'border-transparent text-n-slate-11 hover:text-n-slate-12'
                        }`}
                        onClick={() => setActiveTab(tab.value)}
                    >
                        {t(`FRIENDS.PROFILE.TABS.${tab.key}`)}
                    </button>
                );
            })}
        </nav>
    );

    return (
        <>
            {isFetching || !contact || friendship === undefined ? (
                <div className="fixed inset-0 z-40 grid place-content-center md:bg-n-alpha-black1 max-md:bg-n-surface-1 text-n-slate-11">
                    {isFetching || contact ? <Loader /> : null}
                </div>
            ) : (
                <ProfileWindow
                    label={name}
                    onClose={close}
                    tabs={tabs}
                    card={
                        <ProfileCard
                            contact={contact}
                            friendship={friendship}
                            isBusy={isBusy}
                            menuItems={menuItems}
                            showLabels={!isLockedStranger}
                            onMessage={() => void openContactChat(accountId, contact.id)}
                            onFriendAction={onFriendAction}
                            onMenuAction={onMenuAction}
                        />
                    }
                >
                    {isLockedStranger ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
                            <span className="i-lucide-lock size-6 text-n-slate-10" />
                            <p className="m-0 max-w-72 text-sm text-n-slate-11">{t('FRIENDS.PROFILE.LOCKED', { name })}</p>
                        </div>
                    ) : activeTab === 'history' ? (
                        <ContactHistory contactId={contactId} selectedContact={contact} />
                    ) : activeTab === 'notes' ? (
                        <ContactNotes contactId={contactId} />
                    ) : (
                        <ContactMedia contactId={contactId} />
                    )}
                </ProfileWindow>
            )}
            {contact && isAdministrator ? (
                <ConfirmContactDeleteDialog ref={deleteDialogRef} accountId={accountId} contactId={contact.id} onDeleted={close} />
            ) : null}
        </>
    );
}
