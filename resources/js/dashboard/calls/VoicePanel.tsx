import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import type { CallActions, CallLocalState, CallRoomView } from './types';

// Khối "Đã kết nối" ở đáy thanh bên: trạng thái + thời lượng, tên phòng (bấm để mở lại màn
// phòng), rồi một hàng nút nhỏ mic / âm thanh phòng / camera / màn hình / rời phòng.
export default function VoicePanel({
    room,
    local,
    actions,
    isCollapsed,
}: {
    room: CallRoomView;
    local: CallLocalState;
    actions: CallActions;
    isCollapsed: boolean;
}) {
    if (isCollapsed) {
        return (
            <div data-testid="voice-panel" className="flex flex-col items-center gap-1 w-full px-1 py-2">
                <Button sm teal faded icon="i-lucide-headphones" title={room.title} onClick={actions.expand} />
                <Button sm ruby ghost icon="i-lucide-phone-off" title={t('CALLS.ROOM.LEAVE')} onClick={actions.leave} />
            </div>
        );
    }

    const control = (icon: string, title: string, onClick: () => void, isOff = false, isActive = false) => (
        <Button
            xs
            {...(isOff ? { ruby: true, ghost: true } : isActive ? { teal: true, faded: true } : { slate: true, ghost: true })}
            icon={icon}
            title={title}
            className="!size-7 !px-0 [&>span]:!size-3.5"
            onClick={onClick}
        />
    );

    return (
        <div data-testid="voice-panel" className="flex flex-col gap-1 w-full px-3 pt-2 pb-1">
            <button type="button" className="flex flex-col gap-0.5 min-w-0 text-start group/voice" title={t('CALLS.ROOM.EXPAND')} onClick={actions.expand}>
                <span className="flex items-center gap-1.5 text-xs font-medium text-n-teal-11">
                    <span className="relative flex size-2 flex-shrink-0">
                        <span className="absolute inset-0 rounded-full bg-n-teal-9 opacity-60 animate-ping" />
                        <span className="relative size-2 rounded-full bg-n-teal-9" />
                    </span>
                    {t('CALLS.ROOM.CONNECTED')}
                    <CallDuration startedAt={room.startedAt} className="ms-auto font-normal text-n-slate-10" />
                </span>
                <span className="text-sm font-medium truncate text-n-slate-12 group-hover/voice:underline">{room.title}</span>
            </button>
            {local.sharingScreen ? (
                <span className="flex items-center gap-1 text-xs text-n-slate-11">
                    <span className="i-lucide-screen-share size-3.5 text-n-teal-11" />
                    <span className="truncate">{t('CALLS.ROOM.YOU_ARE_SHARING')}</span>
                </span>
            ) : null}
            <div className="flex items-center gap-0.5 -mx-1">
                {control(local.micOn ? 'i-lucide-mic' : 'i-lucide-mic-off', local.micOn ? t('CALLS.ROOM.MIC_ON') : t('CALLS.ROOM.MIC_OFF'), actions.toggleMic, !local.micOn)}
                {control(
                    local.deafened ? 'i-lucide-volume-x' : 'i-lucide-volume-2',
                    local.deafened ? t('CALLS.ROOM.UNDEAFEN') : t('CALLS.ROOM.DEAFEN'),
                    actions.toggleDeafen,
                    local.deafened,
                )}
                {control(local.camOn ? 'i-lucide-video' : 'i-lucide-video-off', local.camOn ? t('CALLS.ROOM.CAMERA_ON') : t('CALLS.ROOM.CAMERA_OFF'), actions.toggleCamera)}
                {local.canShareScreen
                    ? control(
                          'i-lucide-screen-share',
                          local.sharingScreen ? t('CALLS.ROOM.SCREEN_STOP') : t('CALLS.ROOM.SCREEN_START'),
                          actions.toggleScreen,
                          false,
                          local.sharingScreen,
                      )
                    : null}
                <span className="flex-1" />
                <Button xs ruby faded icon="i-lucide-phone-off" title={t('CALLS.ROOM.LEAVE')} className="!size-7 !px-0 [&>span]:!size-3.5" onClick={actions.leave} />
            </div>
        </div>
    );
}
