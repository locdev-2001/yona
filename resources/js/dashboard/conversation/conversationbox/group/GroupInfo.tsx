import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { openProfile } from 'dashboard/contacts/profile/profileOverlay';
import { ensureYonaContact } from 'dashboard/friends/api';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { conversationAvatarSeed } from 'shared/avatar/avatarSeed';
import PickPeopleDialog from 'shared/people/PickPeopleDialog';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { addGroupMembers, fetchGroup, removeGroupMember, renameGroup, setGroupMemberRole } from '../../groupsApi';
import type { GroupDetails, GroupMember, GroupSummary } from '../../groupsApi';
import GroupInviteLinks from './GroupInviteLinks';
import GroupMemberRow from './GroupMemberRow';
import type { MemberAction } from './GroupMemberRow';

const NAME_MAX_LENGTH = 100;

type PendingConfirm = { kind: 'remove'; member: GroupMember } | { kind: 'leave' } | null;

// Panel phải của dòng nhóm: thay khối hồ sơ người. Đọc chi tiết nhóm mỗi khi mở, mọi thay
// đổi xong thì đọc lại từ máy chủ.
export default function GroupInfo({ group }: { group: GroupSummary }) {
    const { currentAccount, auth } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const myUserId = auth?.user?.id ?? null;
    const [details, setDetails] = useState<GroupDetails | null>(null);
    const [draftName, setDraftName] = useState('');
    const [confirm, setConfirm] = useState<PendingConfirm>(null);
    const [hasLeft, setHasLeft] = useState(false);
    const addRef = useRef<DialogHandle>(null);
    const renameRef = useRef<DialogHandle>(null);
    const confirmRef = useRef<DialogHandle>(null);

    const isMember = group.my_role !== null && !hasLeft;
    const isAdmin = group.my_role === 'admin';

    const reload = useCallback(() => {
        if (!isMember) return;
        fetchGroup(accountId, group.id)
            .then(setDetails)
            .catch(() => setDetails(null));
    }, [accountId, group.id, isMember]);

    useEffect(reload, [reload]);
    useEffect(() => setHasLeft(false), [group.id]);

    const fail = (error: unknown) => useAlert(parseApiErrorMessage(error) || t('CHAT.GROUP.ERROR'));
    const run = async (work: () => Promise<unknown>) => {
        try {
            await work();
            reload();
            return true;
        } catch (error) {
            fail(error);
            return false;
        }
    };

    const onMemberAction = (action: MemberAction, member: GroupMember) => {
        if (action === 'profile') {
            void ensureYonaContact(accountId, member.user_id).then(contactId => openProfile(contactId), fail);
        } else if (action === 'make_admin' || action === 'remove_admin') {
            void run(() => setGroupMemberRole(accountId, group.id, member.user_id, action === 'make_admin' ? 'admin' : 'member'));
        } else {
            setConfirm({ kind: 'remove', member });
            confirmRef.current?.open();
        }
    };

    const confirmPending = async () => {
        if (confirm === null || myUserId === null) return;
        const userId = confirm.kind === 'remove' ? confirm.member.user_id : myUserId;
        if (!(await run(() => removeGroupMember(accountId, group.id, userId)))) return;
        if (confirm.kind === 'leave') setHasLeft(true);
        confirmRef.current?.close();
    };

    const name = details?.name ?? group.name;
    const memberCount = details?.member_count ?? group.member_count;
    const members = details?.members ?? [];

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center gap-1.5 px-4 pt-5 pb-4 text-center border-b border-n-weak">
                <Avatar seed={conversationAvatarSeed(group, null)} name={name} size={72} roundedFull />
                <div className="flex items-center gap-1 max-w-full">
                    <h2 className="m-0 text-lg font-medium text-n-slate-12 truncate">{name}</h2>
                    {isAdmin ? (
                        <Button
                            ghost
                            slate
                            xs
                            icon="i-lucide-pencil"
                            aria-label={t('CHAT.GROUP.RENAME')}
                            onClick={() => {
                                setDraftName(name);
                                renameRef.current?.open();
                            }}
                        />
                    ) : null}
                </div>
                <p className="m-0 text-sm text-n-slate-11">
                    {isMember
                        ? [t('CHAT.GROUP.MEMBERS', { count: memberCount }), t(`CHAT.GROUP.ROLES.${isAdmin ? 'ADMIN' : 'MEMBER'}`)].join(' · ')
                        : t('CHAT.GROUP.LEFT_NOTICE')}
                </p>
                {isMember ? (
                    <Button faded slate sm icon="i-lucide-user-plus" label={t('CHAT.GROUP.ADD_MEMBERS')} className="mt-2" onClick={() => addRef.current?.open()} />
                ) : null}
            </div>

            {isAdmin ? <GroupInviteLinks accountId={accountId} groupId={group.id} /> : null}

            {isMember ? (
                <section className="flex flex-col gap-1 px-2 py-4 border-b border-n-weak" aria-labelledby="group-members-title">
                    <h3 id="group-members-title" className="m-0 px-2 pb-1 text-sm font-medium text-n-slate-12">
                        {t('CHAT.GROUP.MEMBERS_TITLE', { count: memberCount })}
                    </h3>
                    <ul className="flex flex-col m-0 p-0 list-none">
                        {members.map(member => (
                            <GroupMemberRow
                                key={member.user_id}
                                member={member}
                                isMe={member.user_id === myUserId}
                                canManage={isAdmin}
                                onAction={onMemberAction}
                            />
                        ))}
                    </ul>
                </section>
            ) : null}

            {isMember ? (
                <div className="px-4 py-4">
                    <Button
                        outline
                        ruby
                        icon="i-lucide-log-out"
                        label={t('CHAT.GROUP.LEAVE')}
                        className="w-full"
                        onClick={() => {
                            setConfirm({ kind: 'leave' });
                            confirmRef.current?.open();
                        }}
                    />
                </div>
            ) : null}

            <PickPeopleDialog
                ref={addRef}
                title={t('CHAT.GROUP.ADD_MEMBERS')}
                description={t('CHAT.GROUP.ADD_MEMBERS_DESCRIPTION')}
                confirmLabel={t('CHAT.GROUP.ADD')}
                friendsOnly
                excludeIds={members.map(member => member.user_id)}
                onConfirm={async people => {
                    const added = await run(() => addGroupMembers(accountId, group.id, people.map(person => person.id)));
                    if (added) useAlert(t('CHAT.GROUP.ADDED', { count: people.length }));
                    return added;
                }}
            />

            <Dialog
                ref={renameRef}
                type="edit"
                title={t('CHAT.GROUP.RENAME')}
                confirmButtonLabel={t('CHAT.GROUP.SAVE')}
                disableConfirmButton={draftName.trim() === ''}
                width="sm"
                onConfirm={() => {
                    void run(() => renameGroup(accountId, group.id, draftName.trim())).then(done => done && renameRef.current?.close());
                }}
            >
                <Input
                    label={t('CHAT.GROUP.NAME')}
                    value={draftName}
                    maxLength={NAME_MAX_LENGTH}
                    autoFocus
                    onChange={event => setDraftName(event.target.value)}
                />
            </Dialog>

            <Dialog
                ref={confirmRef}
                type="alert"
                width="sm"
                title={
                    confirm?.kind === 'remove' ? t('CHAT.GROUP.REMOVE_TITLE', { name: confirm.member.name }) : t('CHAT.GROUP.LEAVE_TITLE')
                }
                description={confirm?.kind === 'remove' ? t('CHAT.GROUP.REMOVE_BODY') : t('CHAT.GROUP.LEAVE_BODY')}
                confirmButtonLabel={confirm?.kind === 'remove' ? t('CHAT.GROUP.REMOVE') : t('CHAT.GROUP.LEAVE')}
                onConfirm={() => void confirmPending()}
                onClose={() => setConfirm(null)}
            />
        </div>
    );
}
