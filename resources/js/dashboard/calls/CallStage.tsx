import { useRef } from 'react';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../i18n';
import CallControls from './CallControls';
import CallDuration from './CallDuration';
import CallTile from './CallTile';
import type { CallActions, CallLocalState, CallRoomView, RenderCallMedia } from './types';

// Số cột theo số người: 1 → 1, 2–4 → 2, 5–9 → 3, nhiều hơn → 4 (điện thoại tối đa 2).
function gridColumns(count: number, isPhone: boolean): string {
    if (count <= 1) return 'grid-cols-1';
    if (isPhone || count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
}

// Màn phòng phủ vùng nội dung, thanh bên vẫn còn; theo giao diện sáng/tối của người dùng. Có người chia sẻ
// màn hình thì màn hình chiếm phần lớn, người trong phòng xếp một hàng bên dưới.
export default function CallStage({
    room,
    local,
    actions,
    renderMedia,
    isPhone,
}: {
    room: CallRoomView;
    local: CallLocalState;
    actions: CallActions;
    renderMedia?: RenderCallMedia;
    isPhone: boolean;
}) {
    const stageRef = useRef<HTMLElement>(null);
    const sharer = room.participants.find(participant => participant.isSharingScreen) ?? null;
    const tileProps = {
        renderMedia,
        canModerate: local.canModerate,
        onMute: actions.muteParticipant,
        onRemove: actions.removeParticipant,
    };
    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void stageRef.current?.requestFullscreen();
    };

    return (
        <section ref={stageRef} data-testid="call-stage" className="absolute inset-0 z-20 flex flex-col bg-n-surface-canvas text-n-slate-12">
            <header className="flex flex-none items-center gap-2 px-4 h-12 min-w-0">
                <Icon icon="i-lucide-volume-2" className="size-4 flex-shrink-0 text-n-slate-11" />
                <span className="text-sm font-semibold truncate">{room.title}</span>
                {sharer && !isPhone ? (
                    <>
                        <span aria-hidden="true" className="text-n-slate-10">•</span>
                        <span className="text-sm truncate text-n-slate-11">{t('CALLS.ROOM.SCREEN_OF', { name: sharer.name })}</span>
                    </>
                ) : null}
                <span className="flex-shrink-0 text-xs text-n-slate-10 tabular-nums">
                    <CallDuration startedAt={room.startedAt} />
                </span>
                <span className="flex-1" />
                {sharer ? (
                    <span className="flex-shrink-0 px-1.5 rounded-md text-[0.6875rem] font-bold leading-5 uppercase bg-n-ruby-9 text-white">
                        {t('CALLS.ROOM.LIVE')}
                    </span>
                ) : null}
                <Button sm slate ghost icon="i-lucide-message-circle" title={t('CALLS.ROOM.CHAT')} className=" max-md:!size-10" onClick={actions.openChat} />
                <Button sm slate ghost icon="i-lucide-minimize-2" title={t('CALLS.ROOM.MINIMIZE')} className=" max-md:!size-10" onClick={actions.minimize} />
            </header>

            <div className="flex-1 min-h-0 px-4 pb-2">
                {sharer ? (
                    <div className="flex flex-col h-full gap-3">
                        <CallTile participant={sharer} source="screen" {...tileProps} className="flex-1 min-h-0" />
                        <div className="flex flex-none [justify-content:safe_center] gap-3 h-28 overflow-x-auto">
                            {room.participants.map(participant => (
                                <CallTile key={participant.identity} participant={participant} source="camera" {...tileProps} className="flex-none aspect-video h-full" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid h-full gap-3 auto-rows-fr ${gridColumns(room.participants.length, isPhone)}`}>
                        {room.participants.map(participant => (
                            <CallTile key={participant.identity} participant={participant} source="camera" {...tileProps} className="min-h-0" />
                        ))}
                    </div>
                )}
            </div>

            <footer className="relative flex flex-none items-center justify-center px-4 py-3">
                <div className="flex items-center p-1.5 rounded-xl bg-n-surface-panel">
                    <CallControls local={local} actions={actions} isPhone={isPhone} />
                </div>
                {isPhone ? null : (
                    <Button
                        sm
                        slate
                        ghost
                        icon="i-lucide-maximize"
                        title={t('CALLS.ROOM.FULLSCREEN')}
                        className=" absolute end-4"
                        onClick={toggleFullscreen}
                    />
                )}
            </footer>
        </section>
    );
}
