import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../Dashboard';
import Loader from 'shared/components/loader/Loader';
import ContactDetails from 'dashboard/components-next/Contacts/Pages/ContactDetails';
import ContactCustomAttributes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes';
import ContactHistory from 'dashboard/components-next/Contacts/ContactsSidebar/ContactHistory';
import ContactNotes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactNotes';
import ContactMedia from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMedia';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { fetchContact, updateContact } from 'dashboard/contacts/api';
import { mergeContactUpdate, useContactUpdates } from 'dashboard/contacts/contactUpdates';
import { openContactChat } from 'dashboard/contacts/openContactChat';
import type { Contact } from 'dashboard/contacts/types';
import { acceptFriendRequest, fetchFriendshipProfile, removeFriendship, sendFriendRequest } from 'dashboard/friends/api';
import type { FriendshipProfile } from 'dashboard/friends/api';
import { useFriendshipChanges } from 'dashboard/friends/useFriendshipChanges';
import ProfileCard from './profile/ProfileCard';
import type { ProfileMenuItem } from './profile/ProfileCard';
import ProfileWindow from './profile/ProfileWindow';
import type { DashboardPageProps } from '../types';

const YONA_CHANNEL_TYPE = 'Channel::Yona';
const YONA_SOURCE_PREFIX = 'yona:';

const PROFILE_TABS = [
    { key: 'ACTIVITY', value: 'history' },
    { key: 'NOTES', value: 'notes' },
    { key: 'MEDIA', value: 'media' },
    { key: 'INFO', value: 'info' },
    { key: 'ATTRIBUTES', value: 'attributes' },
] as const;
type ProfileTab = (typeof PROFILE_TABS)[number]['value'];

interface ContactShowPageProps extends DashboardPageProps {
    contactId: number;
}

// Người dùng Yona trong hộp thư mang địa chỉ "yona:{user_id}" ở kênh Yona.
function yonaUserIdOf(contact: Contact | null): number | null {
    const sourceId = contact?.contactInboxes?.find(({ inbox }) => inbox.channelType === YONA_CHANNEL_TYPE)?.sourceId;
    return sourceId?.startsWith(YONA_SOURCE_PREFIX) ? Number(sourceId.slice(YONA_SOURCE_PREFIX.length)) : null;
}

// Hồ sơ một người: thẻ trái (ảnh, tên, kết bạn, giới thiệu, kết nối) và các tab bên phải
// (hoạt động, ghi chú, tệp, thông tin). Mở từ Bạn bè, hộp thư hay tìm kiếm.
export default function ContactShow() {
    const { currentAccount, currentAccountUser, contactId } = usePage<ContactShowPageProps>().props;
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

    const close = () => {
        if (window.history.length > 1) window.history.back();
        else router.visit(`/app/accounts/${accountId}/contacts`);
    };

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

    const visibleTabs = PROFILE_TABS.filter(tab => tab.value !== 'attributes' || isProductFeatureVisible('customAttributes'));

    const tabs = (
        <nav className="flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-n-weak" role="tablist">
            {visibleTabs.map(tab => {
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
        <Dashboard>
            {isFetching || !contact || friendship === undefined ? (
                <div className="flex items-center justify-center flex-1 py-10 text-n-slate-11">{isFetching || contact ? <Loader /> : null}</div>
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
                            onMessage={() => void openContactChat(accountId, contact.id)}
                            onFriendAction={onFriendAction}
                            onMenuAction={onMenuAction}
                        />
                    }
                >
                    {activeTab === 'history' ? (
                        <ContactHistory contactId={contactId} selectedContact={contact} />
                    ) : activeTab === 'notes' ? (
                        <ContactNotes contactId={contactId} />
                    ) : activeTab === 'media' ? (
                        <ContactMedia contactId={contactId} />
                    ) : activeTab === 'info' ? (
                        <ContactDetails selectedContact={contact} onContactUpdated={setContact} onGoToContactsList={close} showHeader={false} />
                    ) : (
                        <ContactCustomAttributes selectedContact={contact} onContactUpdated={setContact} />
                    )}
                </ProfileWindow>
            )}
            {contact && isAdministrator ? (
                <ConfirmContactDeleteDialog ref={deleteDialogRef} accountId={accountId} contactId={contact.id} onDeleted={close} />
            ) : null}
        </Dashboard>
    );
}
