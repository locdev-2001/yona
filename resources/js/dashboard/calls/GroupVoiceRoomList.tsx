import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { useClickAway } from 'dashboard/composables/useClickAway';
import type { GroupSummary } from 'dashboard/conversation/groupsApi';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../i18n';
import { createVoiceRoom, deleteVoiceRoom, renameVoiceRoom } from './api';
import { useCallSession } from './callSession';
import { useJoinGroupRoom } from './GroupRoomButton';
import OpenRoomPeople from './OpenRoomPeople';
import type { VoiceRoomSummary } from './types';
import { useVoiceRooms, voiceRoomName } from './voiceRooms';

const NAME_MAX_LENGTH = 60;

type RoomEditor = { kind: 'create' } | { kind: 'rename'; room: VoiceRoomSummary } | null;

// Mục "Phòng thoại" ở panel phải của nhóm: mỗi phòng một dòng (loa + tên, ai đang ngồi), bấm để
// vào; quản trị nhóm có nút + tạo phòng và menu ⋯ đổi tên, xoá. Danh sách đổi qua realtime
// `voice_room.updated` nên không tự đọc lại sau khi sửa.
export default function GroupVoiceRoomList({ accountId, group }: { accountId: number; group: GroupSummary }) {
    const rooms = useVoiceRooms(group);
    const join = useJoinGroupRoom(accountId, group);
    const call = useCallSession();
    const isAdmin = group.my_role === 'admin';
    const [editor, setEditor] = useState<RoomEditor>(null);
    const [draftName, setDraftName] = useState('');
    const [pendingDelete, setPendingDelete] = useState<VoiceRoomSummary | null>(null);
    const editorRef = useRef<DialogHandle>(null);
    const deleteRef = useRef<DialogHandle>(null);

    const fail = (error: unknown) => useAlert(parseApiErrorMessage(error) || t('CHAT.GROUP.ERROR'));

    const openEditor = (next: Exclude<RoomEditor, null>) => {
        setEditor(next);
        setDraftName(next.kind === 'rename' ? (next.room.name ?? voiceRoomName(next.room)) : '');
        editorRef.current?.open();
    };

    const saveEditor = async () => {
        const name = draftName.trim();
        if (!editor || name === '') return;
        try {
            if (editor.kind === 'create') await createVoiceRoom(accountId, group.id, name);
            else await renameVoiceRoom(accountId, group.id, editor.room.id, name);
            editorRef.current?.close();
        } catch (error) {
            fail(error);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteVoiceRoom(accountId, group.id, pendingDelete.id);
            deleteRef.current?.close();
        } catch (error) {
            fail(error);
        }
    };

    if (group.my_role === null || rooms.length === 0) return null;

    return (
        <section className="flex flex-col gap-1 px-2 py-4 border-b border-n-weak" aria-labelledby="group-voice-rooms-title">
            <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <h3 id="group-voice-rooms-title" className="m-0 text-sm font-medium text-n-slate-12">
                    {t('CALLS.ROOM.TITLE')}
                </h3>
                {isAdmin ? (
                    <Button
                        ghost
                        slate
                        xs
                        icon="i-lucide-plus"
                        aria-label={t('CALLS.ROOM.CREATE')}
                        title={t('CALLS.ROOM.CREATE')}
                        onClick={() => openEditor({ kind: 'create' })}
                    />
                ) : null}
            </div>
            <ul className="flex flex-col m-0 p-0 list-none">
                {rooms.map(room => (
                    <VoiceRoomRow
                        key={room.id}
                        room={room}
                        isInRoom={call.activeKind === 'group_room' && call.activeCallId !== null && call.activeCallId === room.live?.call_id}
                        canManage={isAdmin}
                        onJoin={join ? () => join(room) : null}
                        onRename={() => openEditor({ kind: 'rename', room })}
                        onDelete={() => {
                            setPendingDelete(room);
                            deleteRef.current?.open();
                        }}
                    />
                ))}
            </ul>

            <Dialog
                ref={editorRef}
                type="edit"
                width="sm"
                title={t(editor?.kind === 'rename' ? 'CALLS.ROOM.RENAME' : 'CALLS.ROOM.CREATE')}
                confirmButtonLabel={t(editor?.kind === 'rename' ? 'CHAT.GROUP.SAVE' : 'CALLS.ROOM.CREATE_CONFIRM')}
                disableConfirmButton={draftName.trim() === ''}
                onConfirm={() => void saveEditor()}
                onClose={() => setEditor(null)}
            >
                <Input
                    label={t('CALLS.ROOM.NAME')}
                    placeholder={t('CALLS.ROOM.NAME_PLACEHOLDER')}
                    value={draftName}
                    maxLength={NAME_MAX_LENGTH}
                    autoFocus
                    onChange={event => setDraftName(event.target.value)}
                />
            </Dialog>

            <Dialog
                ref={deleteRef}
                type="alert"
                width="sm"
                title={t('CALLS.ROOM.DELETE_TITLE', { name: pendingDelete ? voiceRoomName(pendingDelete) : '' })}
                description={t('CALLS.ROOM.DELETE_BODY')}
                confirmButtonLabel={t('CALLS.ROOM.DELETE')}
                onConfirm={() => void confirmDelete()}
                onClose={() => setPendingDelete(null)}
            />
        </section>
    );
}

function VoiceRoomRow({
    room,
    isInRoom,
    canManage,
    onJoin,
    onRename,
    onDelete,
}: {
    room: VoiceRoomSummary;
    isInRoom: boolean;
    canManage: boolean;
    onJoin: (() => void) | null;
    onRename: () => void;
    onDelete: () => void;
}) {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useClickAway(menuRef, () => setMenuOpen(false), isMenuOpen);
    const name = voiceRoomName(room);
    const menuItems: DropdownMenuItem[] = [
        { label: t('CALLS.ROOM.RENAME'), value: 'rename', action: 'rename', icon: 'i-lucide-pencil' },
        { label: t('CALLS.ROOM.DELETE'), value: 'delete', action: 'delete', icon: 'i-lucide-trash-2' },
    ];
    const status = room.live ? t('CALLS.ROOM.PEOPLE', { count: room.live.total }) : null;

    return (
        <li
            data-testid="voice-room-row"
            aria-current={isInRoom ? 'true' : undefined}
            className={`flex flex-col rounded-lg ${isInRoom ? 'bg-n-alpha-2' : 'hover:bg-n-surface-hover'}`}
        >
            <div className="flex items-center gap-2 min-h-11 px-2">
                <button
                    type="button"
                    className="flex items-center flex-1 min-w-0 gap-2 min-h-11 text-start disabled:cursor-default"
                    title={isInRoom ? t('CALLS.ROOM.EXPAND') : t('CALLS.ROOM.JOIN_NAMED', { name })}
                    disabled={!onJoin}
                    onClick={() => onJoin?.()}
                >
                    <span
                        className={`i-lucide-volume-2 size-4 flex-shrink-0 ${room.live ? 'text-n-teal-11' : 'text-n-slate-11'}`}
                        aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0 text-sm text-n-slate-12 truncate">{name}</span>
                    {status ? <span className="flex-shrink-0 text-xs font-medium text-n-teal-11">{status}</span> : null}
                </button>
                {canManage ? (
                    <div ref={menuRef} className="relative shrink-0">
                        <Button
                            ghost
                            slate
                            sm
                            icon="i-lucide-ellipsis"
                            aria-label={t('CALLS.ROOM.ACTIONS', { name })}
                            aria-expanded={isMenuOpen}
                            onClick={() => setMenuOpen(current => !current)}
                        />
                        {isMenuOpen ? (
                            <DropdownMenu
                                menuItems={menuItems}
                                className="w-44 mt-1 top-full ltr:right-0 rtl:left-0"
                                onAction={item => {
                                    setMenuOpen(false);
                                    if (item.action === 'rename') onRename();
                                    else onDelete();
                                }}
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
            {room.live ? (
                <div className="ps-6 pb-1.5">
                    <OpenRoomPeople room={room.live} />
                </div>
            ) : null}
        </li>
    );
}
