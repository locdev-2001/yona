import { useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../../../i18n';
import type { GroupMember } from '../../groupsApi';

export type MemberAction = 'profile' | 'make_admin' | 'remove_admin' | 'remove';

const JOINED_VIA_KEYS: Record<GroupMember['joined_via'], string> = {
    creator: 'CHAT.GROUP.JOINED_VIA.CREATOR',
    added: 'CHAT.GROUP.JOINED_VIA.ADDED',
    invite_link: 'CHAT.GROUP.JOINED_VIA.INVITE_LINK',
};

interface GroupMemberRowProps {
    member: GroupMember;
    isMe: boolean;
    // Người xem là quản trị: có thêm đặt/gỡ quản trị và mời ra.
    canManage: boolean;
    onAction: (action: MemberAction, member: GroupMember) => void;
}

// Một thành viên trong panel nhóm: ảnh, tên, @username · cách vào nhóm, nhãn Quản trị, menu ⋯.
export default function GroupMemberRow({ member, isMe, canManage, onAction }: GroupMemberRowProps) {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useClickAway(menuRef, () => setMenuOpen(false), isMenuOpen);

    const isAdmin = member.role === 'admin';
    const menuItems: DropdownMenuItem[] = [
        { label: t('CHAT.GROUP.VIEW_PROFILE'), value: 'profile', action: 'profile', icon: 'i-lucide-user-round' },
        ...(canManage && !isMe
            ? [
                  isAdmin
                      ? { label: t('CHAT.GROUP.REMOVE_ADMIN'), value: 'remove_admin', action: 'remove_admin', icon: 'i-lucide-shield-off' }
                      : { label: t('CHAT.GROUP.MAKE_ADMIN'), value: 'make_admin', action: 'make_admin', icon: 'i-lucide-shield-check' },
                  { label: t('CHAT.GROUP.REMOVE'), value: 'remove', action: 'remove', icon: 'i-lucide-user-minus' },
              ]
            : []),
    ];
    const subtitle = [member.username ? `@${member.username}` : null, t(JOINED_VIA_KEYS[member.joined_via])].filter(Boolean).join(' · ');

    return (
        <li className="flex items-center gap-3 min-h-14 px-2 py-1.5 rounded-lg hover:bg-n-surface-hover">
            <Avatar seed={avatarSeed('user', member.user_id)} src={member.avatar_url ?? ''} name={member.name} size={36} roundedFull />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-n-slate-12">
                    {isMe ? t('CHAT.GROUP.YOU', { name: member.name }) : member.name}
                </span>
                <span className="block truncate text-xs text-n-slate-11">{subtitle}</span>
            </span>
            {isAdmin ? (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-n-alpha-2 text-xs text-n-blue-11">{t('CHAT.GROUP.ROLES.ADMIN')}</span>
            ) : null}
            {isMe ? null : (
                <div ref={menuRef} className="relative shrink-0">
                    <Button
                        ghost
                        slate
                        sm
                        icon="i-lucide-ellipsis"
                        aria-label={t('CHAT.GROUP.MEMBER_ACTIONS', { name: member.name })}
                        aria-expanded={isMenuOpen}
                        onClick={() => setMenuOpen(current => !current)}
                    />
                    {isMenuOpen ? (
                        <DropdownMenu
                            menuItems={menuItems}
                            className="w-52 mt-1 top-full ltr:right-0 rtl:left-0"
                            onAction={item => {
                                setMenuOpen(false);
                                onAction(item.action as MemberAction, member);
                            }}
                        />
                    ) : null}
                </div>
            )}
        </li>
    );
}
