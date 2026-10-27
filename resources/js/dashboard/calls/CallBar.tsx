import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import type { CallActions, CallLocalState, CallRoomView } from './types';

// Điện thoại không có thanh bên cố định: khối "Đã kết nối" thu thành một dải ngay trên thanh
// tab (hay trên ô nhập khi đang mở hội thoại), cùng nội dung với VoicePanel. Bấm vùng tên để mở
// lại màn phòng. Nằm sát đáy màn hình thì chừa khoảng an toàn của iOS.
export default function CallBar({
    room,
    local,
    actions,
    atScreenBottom = false,
}: {
    room: CallRoomView;
    local: CallLocalState;
    actions: CallActions;
    atScreenBottom?: boolean;
}) {
    return (
        <div
            data-testid="call-bar"
            className={`flex flex-none items-center gap-2 w-full min-w-0 px-3 bg-n-surface-panel ${atScreenBottom ? 'h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]' : 'h-14'}`}
        >
            <button type="button" className="flex flex-col flex-1 min-w-0 text-start" title={t('CALLS.ROOM.EXPAND')} onClick={actions.expand}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-n-teal-11">
                    <Icon icon="i-lucide-signal" className="size-4 flex-shrink-0" />
                    <span className="truncate">{t('CALLS.ROOM.CONNECTED')}</span>
                </span>
                <span className="flex items-center gap-1 text-xs whitespace-nowrap text-n-slate-11">
                    <span className="truncate">{room.title}</span>
                    <span aria-hidden="true">·</span>
                    <CallDuration startedAt={room.startedAt} />
                </span>
            </button>
            <Button
                md
                {...(local.micOn ? { slate: true, faded: true } : { ruby: true, faded: true })}
                icon={local.micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'}
                title={local.micOn ? t('CALLS.ROOM.MIC_ON') : t('CALLS.ROOM.MIC_OFF')}
                className="!size-10 !px-0"
                onClick={actions.toggleMic}
            />
            <Button md ruby solid icon="i-lucide-phone-off" title={t('CALLS.ROOM.LEAVE')} className="!size-10 !px-0" onClick={actions.leave} />
        </div>
    );
}
