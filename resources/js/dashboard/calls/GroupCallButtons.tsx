import { useState } from 'react';
import BottomSheet from 'dashboard/components-next/BottomSheet';
import Button from 'dashboard/components-next/button/Button';
import type { GroupSummary } from 'dashboard/conversation/groupsApi';
import { t } from '../../i18n';
import { useCallSession } from './callSession';
import { useJoinGroupRoom } from './GroupRoomButton';
import { useGroupCall } from './groupCalls';
import { useVoiceRooms, voiceRoomName } from './voiceRooms';
import type { CallMediaKind } from './types';
import { useCallsEnabled } from './useCallsEnabled';

// Gọi nhóm có đổ chuông (hoặc vào cuộc gọi nhóm đang diễn ra) bằng thoại hay video; null khi máy
// chủ cuộc gọi chưa cấu hình hoặc người xem đã rời nhóm.
export function useJoinGroupCall(accountId: number, group: GroupSummary | null): ((media: CallMediaKind) => void) | null {
    const callsEnabled = useCallsEnabled();
    const call = useCallSession();

    if (!callsEnabled || !group || group.my_role === null) return null;

    return media => {
        if (call.isJoining) return;
        call.joinGroupCall({
            accountId,
            groupId: group.id,
            title: group.name,
            conversationUrl: window.location.pathname,
            canModerate: group.my_role === 'admin',
            media,
        });
    };
}

// Hai nút gọi thoại và gọi video ở mũ khung chat nhóm (máy tính), cạnh nút phòng thoại. Cuộc gọi
// nhóm đang diễn ra thì hai nút nổi màu và bấm là vào cuộc đó.
export function GroupCallButtons({ accountId, group, className = '' }: { accountId: number; group: GroupSummary; className?: string }) {
    const join = useJoinGroupCall(accountId, group);
    const liveCall = useGroupCall(group);

    if (!join) return null;

    const tone = liveCall ? { teal: true, faded: true } : { slate: true, ghost: true };

    return (
        <>
            <Button sm {...tone} icon="i-lucide-phone" title={t(liveCall ? 'CALLS.GROUP.JOIN_VOICE' : 'CALLS.GROUP.CALL_VOICE')} className={className} onClick={() => join('audio')} />
            <Button sm {...tone} icon="i-lucide-video" title={t(liveCall ? 'CALLS.GROUP.JOIN_VIDEO' : 'CALLS.GROUP.CALL_VIDEO')} className={className} onClick={() => join('video')} />
        </>
    );
}

function SheetOption({ icon, label, hint, onClick }: { icon: string; label: string; hint: string; onClick: () => void }) {
    return (
        <button type="button" className="flex items-center gap-3 w-full min-h-[44px] px-4 py-2 text-start rounded-xl hover:bg-n-alpha-2" onClick={onClick}>
            <span className="flex flex-shrink-0 items-center justify-center size-9 rounded-full bg-n-alpha-2 text-n-slate-12">
                <span className={`${icon} size-[1.125rem]`} aria-hidden="true" />
            </span>
            <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-n-slate-12">{label}</span>
                <span className="text-xs text-n-slate-11">{hint}</span>
            </span>
        </button>
    );
}

// Điện thoại: một nút Gọi mở sheet (gọi thoại cả nhóm, gọi video cả nhóm, rồi từng phòng thoại
// có tên của nhóm), để mũ hẹp còn chỗ cho tên nhóm. Đang có phòng hay cuộc gọi thì nút nổi màu.
export function GroupCallMenu({ accountId, group, className = '' }: { accountId: number; group: GroupSummary; className?: string }) {
    const [isOpen, setOpen] = useState(false);
    const joinCall = useJoinGroupCall(accountId, group);
    const joinRoom = useJoinGroupRoom(accountId, group);
    const liveCall = useGroupCall(group);
    const rooms = useVoiceRooms(group);
    const choose = (action: () => void) => {
        setOpen(false);
        action();
    };

    if (!joinCall || !joinRoom) return null;

    return (
        <>
            <Button
                sm
                {...(liveCall ? { teal: true, faded: true } : { slate: true, ghost: true })}
                icon="i-lucide-phone"
                title={t('CALLS.GROUP.MENU')}
                className={className}
                onClick={() => setOpen(true)}
            />
            <BottomSheet isOpen={isOpen} title={group.name} onClose={() => setOpen(false)}>
                <div className="flex flex-col gap-1 px-2 pt-1 pb-4">
                    <SheetOption
                        icon="i-lucide-phone"
                        label={t(liveCall ? 'CALLS.GROUP.JOIN_VOICE' : 'CALLS.GROUP.CALL_VOICE')}
                        hint={t('CALLS.GROUP.CALL_HINT')}
                        onClick={() => choose(() => joinCall('audio'))}
                    />
                    <SheetOption
                        icon="i-lucide-video"
                        label={t(liveCall ? 'CALLS.GROUP.JOIN_VIDEO' : 'CALLS.GROUP.CALL_VIDEO')}
                        hint={t('CALLS.GROUP.VIDEO_HINT')}
                        onClick={() => choose(() => joinCall('video'))}
                    />
                    {rooms.map(room => (
                        <SheetOption
                            key={room.id}
                            icon="i-lucide-headphones"
                            label={voiceRoomName(room)}
                            hint={room.live ? t('CALLS.ROOM.PEOPLE', { count: room.live.total }) : t('CALLS.GROUP.ROOM_HINT')}
                            onClick={() => choose(() => joinRoom(room))}
                        />
                    ))}
                </div>
            </BottomSheet>
        </>
    );
}
