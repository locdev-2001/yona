import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import ContactLabels from 'dashboard/components-next/Contacts/ContactLabels/ContactLabels';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { BRAND_ICONS } from 'dashboard/icons';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { formatInLocale } from 'shared/helpers/timeHelper';
import type { Contact, ContactSocialProfiles } from 'dashboard/contacts/types';
import { uniqueChannels } from 'dashboard/contacts/contactChannels';
import type { FriendshipProfile } from 'dashboard/friends/api';

const DATE_PATTERN = 'd MMM, yyyy';
const ICON_BUTTON_CLASS =
    'grid place-content-center size-9 rounded-lg bg-n-alpha-2 text-n-slate-12 hover:bg-n-alpha-3 transition-colors disabled:opacity-60';

const SOCIAL_LINKS: { key: keyof ContactSocialProfiles; icon: string; url: (handle: string) => string }[] = [
    { key: 'facebook', icon: BRAND_ICONS.facebook, url: handle => `https://facebook.com/${handle}` },
    { key: 'instagram', icon: BRAND_ICONS.instagram, url: handle => `https://instagram.com/${handle}` },
    { key: 'telegram', icon: BRAND_ICONS.telegram, url: handle => `https://t.me/${handle}` },
    { key: 'tiktok', icon: BRAND_ICONS.tiktok, url: handle => `https://tiktok.com/@${handle}` },
    { key: 'twitter', icon: BRAND_ICONS.x, url: handle => `https://x.com/${handle}` },
    { key: 'linkedin', icon: BRAND_ICONS.linkedin, url: handle => `https://linkedin.com/in/${handle}` },
    { key: 'github', icon: BRAND_ICONS.github, url: handle => `https://github.com/${handle}` },
];

export interface ProfileMenuItem {
    action: string;
    label: string;
    icon: string;
}

interface ProfileCardProps {
    contact: Contact;
    friendship: FriendshipProfile | null;
    isBusy: boolean;
    menuItems: ProfileMenuItem[];
    showLabels: boolean;
    onMessage: () => void;
    onFriendAction: () => void;
    onMenuAction: (action: string) => void;
}

// Thẻ trái của hồ sơ: ảnh bìa, ảnh đại diện có chấm trạng thái, tên, @username kèm
// logo kênh, nút Nhắn tin / kết bạn / ⋯, giới thiệu, mốc thời gian và kết nối.
export default function ProfileCard({
    contact,
    friendship,
    isBusy,
    menuItems,
    showLabels,
    onMessage,
    onFriendAction,
    onMenuAction,
}: ProfileCardProps) {
    const person = friendship?.person ?? null;
    const isFriend = friendship?.state === 'friends';
    const bio = person?.bio || contact.additionalAttributes?.description || '';
    const channels = uniqueChannels(contact);

    return (
        <div className="flex flex-col">
            <div className="h-28 rounded-t-xl bg-gradient-to-br from-n-brand to-n-iris-10 opacity-90" />
            <div className="px-5 pb-6">
                <div className="flex items-end gap-3 -mt-14">
                    <span className="rounded-full ring-[6px] ring-n-surface-2 bg-n-surface-2">
                        <Avatar
                            seed={avatarSeed('contact', contact.id)}
                            name={contact.name}
                            src={contact.thumbnail}
                            size={104}
                            roundedFull
                            previewable
                            status={contact.availabilityStatus === 'online' ? 'online' : null}
                        />
                    </span>
                    <span
                        className={`mb-2 h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-xs font-medium ${
                            isFriend ? 'bg-n-teal-3 text-n-teal-11' : 'bg-n-alpha-3 text-n-slate-11'
                        }`}
                    >
                        <span className={`${isFriend ? 'i-lucide-user-round-check' : 'i-lucide-user-round'} size-3.5`} />
                        {isFriend ? t('FRIENDS.PROFILE.FRIEND') : t('FRIENDS.PROFILE.STRANGER')}
                    </span>
                </div>

                <h2 className="mt-3 mb-0 text-2xl font-bold break-words text-n-slate-12">{contact.name}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-n-slate-11">
                    {person ? <span>@{person.username}</span> : null}
                    {person && channels.length > 0 ? <span className="size-1 rounded-full bg-n-slate-8" /> : null}
                    {channels.map(channel => (
                        <span key={channel.channel_type} title={channel.name} className="inline-flex">
                            <ChannelIcon inbox={channel} className="size-4 text-n-slate-10" />
                        </span>
                    ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <button
                        type="button"
                        className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold bg-n-brand text-white hover:brightness-110 transition"
                        onClick={onMessage}
                    >
                        <span className="i-lucide-message-circle size-4" />
                        {t('FRIENDS.PROFILE.MESSAGE')}
                    </button>
                    {friendship ? <FriendButton friendship={friendship} isBusy={isBusy} onClick={onFriendAction} /> : null}
                    {menuItems.length > 0 ? <ProfileMenu items={menuItems} onAction={onMenuAction} /> : null}
                </div>

                {bio ? (
                    <ProfileSection title={t('FRIENDS.PROFILE.ABOUT')}>
                        <p className="m-0 text-sm whitespace-pre-line text-n-slate-12">{bio}</p>
                    </ProfileSection>
                ) : null}

                {person?.joined_at ? (
                    <ProfileSection title={t('FRIENDS.PROFILE.JOINED')}>
                        <p className="m-0 text-sm text-n-slate-12">{formatInLocale(new Date(person.joined_at), DATE_PATTERN)}</p>
                    </ProfileSection>
                ) : contact.createdAt ? (
                    <ProfileSection title={t('FRIENDS.PROFILE.FIRST_SEEN')}>
                        <p className="m-0 text-sm text-n-slate-12">{formatInLocale(contact.createdAt, DATE_PATTERN)}</p>
                    </ProfileSection>
                ) : null}

                {friendship?.friends_since ? (
                    <ProfileSection title={t('FRIENDS.PROFILE.FRIENDS_SINCE')}>
                        <p className="m-0 text-sm text-n-slate-12">{formatInLocale(new Date(friendship.friends_since), DATE_PATTERN)}</p>
                    </ProfileSection>
                ) : null}

                {showLabels ? (
                    <ProfileSection title={t('FRIENDS.PROFILE.LABELS')}>
                        <ContactLabels contactId={contact.id} />
                    </ProfileSection>
                ) : null}

                <ProfileSection title={t('FRIENDS.PROFILE.CONNECTIONS')}>
                    <Connections contact={contact} />
                </ProfileSection>
            </div>
        </div>
    );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mt-5">
            <h3 className="mb-1.5 text-xs font-medium text-n-slate-11">{title}</h3>
            {children}
        </section>
    );
}

// Nút cạnh Nhắn tin: chưa là bạn thì Kết bạn, người kia mời mình thì Chấp nhận; đã gửi
// lời mời hay đã là bạn thì chỉ hiện biểu tượng trạng thái (huỷ nằm trong menu ⋯).
function FriendButton({ friendship, isBusy, onClick }: { friendship: FriendshipProfile; isBusy: boolean; onClick: () => void }) {
    if (friendship.state === 'none' || friendship.state === 'incoming') {
        const isIncoming = friendship.state === 'incoming';
        return (
            <button
                type="button"
                disabled={isBusy}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold bg-n-alpha-2 text-n-slate-12 hover:bg-n-alpha-3 transition-colors disabled:opacity-60"
                onClick={onClick}
            >
                <span className={`${isIncoming ? 'i-lucide-user-round-check' : 'i-lucide-user-round-plus'} size-4`} />
                {isIncoming ? t('FRIENDS.PROFILE.ACCEPT') : t('FRIENDS.PROFILE.ADD_FRIEND')}
            </button>
        );
    }

    const label = friendship.state === 'friends' ? t('FRIENDS.PROFILE.FRIEND') : t('FRIENDS.PROFILE.REQUEST_SENT');
    return (
        <span className={`${ICON_BUTTON_CLASS} cursor-default`} title={label} aria-label={label} role="img">
            <span className={`${friendship.state === 'friends' ? 'i-lucide-user-round-check' : 'i-lucide-hourglass'} size-[18px]`} />
        </span>
    );
}

function ProfileMenu({ items, onAction }: { items: ProfileMenuItem[]; onAction: (action: string) => void }) {
    const [isOpen, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const closeOnClickAway = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnClickAway);
        return () => document.removeEventListener('mousedown', closeOnClickAway);
    }, [isOpen]);

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                className={ICON_BUTTON_CLASS}
                title={t('FRIENDS.PROFILE.MORE')}
                aria-label={t('FRIENDS.PROFILE.MORE')}
                aria-expanded={isOpen}
                onClick={() => setOpen(open => !open)}
            >
                <span className="i-lucide-ellipsis size-[18px]" />
            </button>
            {isOpen ? (
                <DropdownMenu
                    menuItems={items.map(item => ({ ...item, value: item.action }))}
                    className="ltr:right-0 rtl:left-0 mt-1 w-52 top-full z-30"
                    onAction={item => {
                        setOpen(false);
                        onAction(String(item.action));
                    }}
                />
            ) : null}
        </div>
    );
}

function Connections({ contact }: { contact: Contact }) {
    const socialProfiles = contact.additionalAttributes?.socialProfiles ?? {};
    const rows: { key: string; icon: ReactNode; label: string; href?: string }[] = [
        ...(contact.contactInboxes ?? [])
            .filter(({ inbox }) => inbox.channelType !== 'Channel::Yona')
            .map(({ inbox, sourceId }) => ({
                key: `inbox-${inbox.id}-${sourceId}`,
                icon: <ChannelIcon inbox={{ channel_type: inbox.channelType, name: inbox.name }} className="size-4" />,
                label: inbox.name,
            })),
        ...(contact.email ? [{ key: 'email', icon: <span className="i-lucide-mail size-4" />, label: contact.email, href: `mailto:${contact.email}` }] : []),
        ...(contact.phoneNumber
            ? [{ key: 'phone', icon: <span className="i-lucide-phone size-4" />, label: contact.phoneNumber, href: `tel:${contact.phoneNumber}` }]
            : []),
        ...SOCIAL_LINKS.filter(link => Boolean(socialProfiles[link.key])).map(link => ({
            key: link.key,
            icon: <span className={`${link.icon} size-4`} />,
            label: socialProfiles[link.key] as string,
            href: link.url(socialProfiles[link.key] as string),
        })),
    ];

    if (rows.length === 0) return <p className="m-0 text-sm text-n-slate-11">{t('FRIENDS.PROFILE.NO_CONNECTIONS')}</p>;

    return (
        <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
            {rows.map(row => (
                <li key={row.key} className="flex items-center gap-2.5 min-w-0 text-sm text-n-slate-12">
                    <span className="grid place-content-center size-7 shrink-0 rounded-md bg-n-alpha-2 text-n-slate-12">{row.icon}</span>
                    {row.href ? (
                        <a
                            href={row.href}
                            target={row.href.startsWith('http') ? '_blank' : undefined}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 min-w-0 text-n-slate-12 hover:underline"
                        >
                            <span className="truncate">{row.label}</span>
                            {row.href.startsWith('http') ? <span className="i-lucide-arrow-up-right size-3.5 shrink-0" /> : null}
                        </a>
                    ) : (
                        <span className="truncate">{row.label}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
