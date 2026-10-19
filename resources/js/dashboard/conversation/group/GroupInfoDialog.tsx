import { forwardRef, useEffect, useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import NextButton from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../../i18n';
import {
    addGroupMembers,
    changeGroupRole,
    dissolveGroup,
    fetchInviteLink,
    removeChat,
    removeGroupMember,
    revokeInviteLink,
    rotateInviteLink,
    updateGroup,
} from '../api';
import { useConversation } from '../ConversationContext';
import type { GroupMemberPerson, GroupRole } from '../types';
import PeoplePicker from './PeoplePicker';
import type { PickedPerson } from './PeoplePicker';

const ROLE_LABEL_KEYS: Record<GroupRole, string> = {
    owner: 'CHAT.GROUP.ROLES.OWNER',
    admin: 'CHAT.GROUP.ROLES.ADMIN',
    member: 'CHAT.GROUP.ROLES.MEMBER',
};

// Thông tin nhóm: ảnh + tên, thêm thành viên, link mời, danh sách thành viên kèm
// thao tác theo quyền (máy chủ trả `abilities`), rời nhóm và giải tán.
const GroupInfoDialog = forwardRef<DialogHandle>(function GroupInfoDialog(_props, ref) {
    const { selectedConversation: chat, groupMembers, currentUserId, refreshConversation, openDirectChat } = useConversation();
    const [title, setTitle] = useState('');
    const [isAdding, setAdding] = useState(false);
    const [picked, setPicked] = useState<PickedPerson[]>([]);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [openMenuFor, setOpenMenuFor] = useState<number | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const leaveDialogRef = useRef<DialogHandle>(null);
    const dissolveDialogRef = useRef<DialogHandle>(null);

    const chatId = chat?.id ?? 0;
    const abilities = chat?.abilities ?? null;

    useEffect(() => {
        setTitle(chat?.title ?? '');
    }, [chat?.title]);

    useEffect(() => {
        if (!chatId || chat?.kind !== 'group') return;
        fetchInviteLink(chatId).then(response => setInviteUrl(response.url), () => setInviteUrl(null));
    }, [chatId, chat?.kind]);

    if (!chat || chat.kind !== 'group') return null;

    const run = async (action: () => Promise<unknown>, success?: string) => {
        try {
            await action();
            await refreshConversation(chatId);
            if (success) useAlert(success);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONVERSATION.MESSAGE_ERROR'));
        }
    };

    const saveTitle = () => {
        const nextTitle = title.trim();
        if (!nextTitle || nextTitle === chat.title) return;
        void run(() => updateGroup(chatId, { title: nextTitle }));
    };

    const addPicked = () =>
        run(async () => {
            const response = await addGroupMembers(chatId, picked.map(person => person.id));
            if (response.skipped_count > 0) useAlert(t('CHAT.GROUP.SKIPPED', { count: response.skipped_count }));
            setPicked([]);
            setAdding(false);
        });

    const copyInvite = async () => {
        if (!inviteUrl) return;
        await navigator.clipboard.writeText(inviteUrl);
        useAlert(t('CHAT.GROUP.COPIED'));
    };

    const memberMenu = (member: GroupMemberPerson) => {
        const items = [{ icon: 'i-lucide-message-circle', label: t('CHAT.GROUP.MESSAGE'), action: 'message', value: 'message' }];
        if (abilities?.change_roles && member.role !== 'owner') {
            items.push(
                member.role === 'admin'
                    ? { icon: 'i-lucide-shield-off', label: t('CHAT.GROUP.REMOVE_ADMIN'), action: 'member', value: 'member' }
                    : { icon: 'i-lucide-shield', label: t('CHAT.GROUP.MAKE_ADMIN'), action: 'admin', value: 'admin' },
                { icon: 'i-lucide-crown', label: t('CHAT.GROUP.TRANSFER'), action: 'owner', value: 'owner' },
            );
        }
        const canRemove = member.role !== 'owner' && (chat.my_role === 'owner' || (chat.my_role === 'admin' && member.role === 'member'));
        if (canRemove) items.push({ icon: 'i-lucide-user-minus', label: t('CHAT.GROUP.REMOVE'), action: 'remove', value: 'remove' });
        return items;
    };

    const handleMemberAction = (member: GroupMemberPerson, action: string) => {
        setOpenMenuFor(null);
        if (action === 'message') void openDirectChat(member.id);
        if (action === 'remove') void run(() => removeGroupMember(chatId, member.id));
        if (action === 'admin' || action === 'member' || action === 'owner') void run(() => changeGroupRole(chatId, member.id, action));
    };

    return (
        <>
            <Dialog ref={ref} title={t('CHAT.GROUP.INFO')} showConfirmButton={false} width="md" overflowYAuto>
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={!abilities?.edit_info}
                            title={abilities?.edit_info ? t('CHAT.GROUP.CHANGE_AVATAR') : undefined}
                            className="shrink-0 rounded-full active:scale-[0.97] disabled:active:scale-100"
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <Avatar name={chat.title ?? ''} seed={avatarSeed('chat', chat.id)} src={chat.meta.sender.thumbnail} size={56} />
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={event => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void run(() => updateGroup(chatId, { avatar: file }));
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            {abilities?.edit_info ? (
                                <input
                                    type="text"
                                    value={title}
                                    maxLength={100}
                                    aria-label={t('CHAT.GROUP.NAME')}
                                    className="w-full h-11 px-2 rounded-lg bg-transparent hover:bg-n-alpha-2 focus:field-surface text-base font-medium text-n-slate-12 outline-none"
                                    onChange={event => setTitle(event.target.value)}
                                    onBlur={saveTitle}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            saveTitle();
                                        }
                                    }}
                                />
                            ) : (
                                <p className="m-0 px-2 truncate text-base font-medium text-n-slate-12">{chat.title}</p>
                            )}
                            <p className="m-0 px-2 text-sm text-n-slate-11">{t('CHAT.GROUP.MEMBERS', { count: chat.member_count })}</p>
                        </div>
                    </div>

                    {abilities?.add_members ? (
                        isAdding ? (
                            <div className="flex flex-col gap-2">
                                <PeoplePicker selected={picked} onChange={setPicked} excludeIds={groupMembers.map(member => member.id)} />
                                <div className="flex gap-2 justify-end">
                                    <NextButton type="button" ghost slate label={t('CONVERSATION.CANCEL')} onClick={() => setAdding(false)} />
                                    <NextButton
                                        type="button"
                                        label={t('CHAT.GROUP.ADD')}
                                        disabled={picked.length === 0}
                                        onClick={() => void addPicked()}
                                    />
                                </div>
                            </div>
                        ) : (
                            <NextButton
                                type="button"
                                ghost
                                slate
                                icon="i-lucide-user-plus"
                                label={t('CHAT.GROUP.ADD_MEMBERS')}
                                className="w-full justify-start min-h-11"
                                onClick={() => setAdding(true)}
                            />
                        )
                    ) : null}

                    <section className="flex flex-col gap-2">
                        <h4 className="m-0 text-sm font-medium text-n-slate-12">{t('CHAT.GROUP.INVITE_LINK')}</h4>
                        {inviteUrl ? (
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={inviteUrl}
                                    aria-label={t('CHAT.GROUP.INVITE_LINK')}
                                    className="field-surface flex-1 min-w-0 h-11 px-2.5 rounded-lg text-sm text-n-slate-12 outline-none"
                                    onFocus={event => event.target.select()}
                                />
                                <NextButton type="button" slate faded icon="i-lucide-copy" label={t('CHAT.GROUP.COPY')} onClick={() => void copyInvite()} />
                            </div>
                        ) : (
                            <p className="m-0 text-sm text-n-slate-11">{t('CHAT.GROUP.INVITE_EMPTY')}</p>
                        )}
                        {abilities?.manage_invite_link ? (
                            <div className="flex flex-wrap gap-2">
                                <NextButton
                                    type="button"
                                    sm
                                    slate
                                    faded
                                    icon="i-lucide-link"
                                    label={inviteUrl ? t('CHAT.GROUP.INVITE_RESET') : t('CHAT.GROUP.INVITE_CREATE')}
                                    onClick={() => void run(async () => setInviteUrl((await rotateInviteLink(chatId)).url))}
                                />
                                {inviteUrl ? (
                                    <NextButton
                                        type="button"
                                        sm
                                        slate
                                        ghost
                                        label={t('CHAT.GROUP.INVITE_REVOKE')}
                                        onClick={() =>
                                            void run(async () => {
                                                await revokeInviteLink(chatId);
                                                setInviteUrl(null);
                                            })
                                        }
                                    />
                                ) : null}
                            </div>
                        ) : null}
                    </section>

                    <section className="flex flex-col gap-1">
                        <h4 className="m-0 text-sm font-medium text-n-slate-12">{t('CHAT.GROUP.MEMBERS', { count: chat.member_count })}</h4>
                        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none">
                            {groupMembers.map(member => {
                                const isMe = member.id === currentUserId;
                                return (
                                    <li key={member.id} className="relative flex items-center gap-3 min-h-14 px-1">
                                        <Avatar seed={avatarSeed('user', member.id)} src={member.thumbnail} name={member.name} size={36} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-n-slate-12">
                                                {member.name}
                                                {isMe ? <span className="text-n-slate-11 font-normal"> ({t('CHAT.GROUP.YOU')})</span> : null}
                                            </span>
                                            <span className="block truncate text-xs text-n-slate-11">
                                                {member.username ? `@${member.username} · ` : ''}
                                                {t(ROLE_LABEL_KEYS[member.role])}
                                            </span>
                                        </span>
                                        {isMe ? null : (
                                            <NextButton
                                                type="button"
                                                sm
                                                ghost
                                                slate
                                                icon="i-lucide-ellipsis"
                                                title={t('CONVERSATION.HEADER.MORE_ACTIONS')}
                                                className="max-md:!size-11"
                                                onClick={() => setOpenMenuFor(current => (current === member.id ? null : member.id))}
                                            />
                                        )}
                                        {openMenuFor === member.id ? (
                                            <DropdownMenu
                                                menuItems={memberMenu(member)}
                                                className="top-full mt-1 ltr:right-0 rtl:left-0 z-20"
                                                onAction={({ action }) => handleMemberAction(member, action)}
                                            />
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <div className="flex flex-col gap-1 pt-2 border-t border-n-weak">
                        <NextButton
                            type="button"
                            ghost
                            ruby
                            icon="i-lucide-log-out"
                            label={t('CHAT.GROUP.LEAVE')}
                            className="w-full justify-start min-h-11"
                            onClick={() => leaveDialogRef.current?.open()}
                        />
                        {abilities?.dissolve ? (
                            <NextButton
                                type="button"
                                ghost
                                ruby
                                icon="i-lucide-trash-2"
                                label={t('CHAT.GROUP.DISSOLVE')}
                                className="w-full justify-start min-h-11"
                                onClick={() => dissolveDialogRef.current?.open()}
                            />
                        ) : null}
                    </div>
                </div>
            </Dialog>
            <Dialog
                ref={leaveDialogRef}
                type="alert"
                title={t('CHAT.GROUP.LEAVE_TITLE')}
                description={t('CHAT.GROUP.LEAVE_BODY')}
                confirmButtonLabel={t('CHAT.GROUP.LEAVE')}
                onConfirm={() => void removeChat(chatId).then(() => refreshConversation(chatId))}
            />
            <Dialog
                ref={dissolveDialogRef}
                type="alert"
                title={t('CHAT.GROUP.DISSOLVE_TITLE')}
                description={t('CHAT.GROUP.DISSOLVE_BODY')}
                confirmButtonLabel={t('CHAT.GROUP.DISSOLVE')}
                onConfirm={() => void dissolveGroup(chatId).then(() => refreshConversation(chatId))}
            />
        </>
    );
});

export default GroupInfoDialog;
