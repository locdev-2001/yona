import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import RingingAvatar from './RingingAvatar';
import type { CallMediaKind, CallPeerView, RenderCallMedia } from './types';

// Đang gọi đi (1-1): một thẻ gọn, khung chat vẫn đọc và gõ được. Máy tính đặt ngay dưới mũ khung
// chat (gần nút gọi vừa bấm); điện thoại đặt ở đáy, trong tầm ngón cái. Số giây đổ chuông đậm
// nhất thẻ. Người kia nghe máy thì chuyển sang khối "Đã kết nối" như phòng nhóm.
const PLACEMENT_CLASS = {
    top: 'mx-3 mt-2 bg-n-solid-2',
    bottom: 'mx-3 my-2 bg-n-solid-2',
    floating: 'overlay-surface',
};

export default function OutgoingCallBar({
    peer,
    media,
    placement,
    since,
    isRinging,
    micOn,
    selfIdentity,
    renderMedia,
    onToggleMic,
    onCancel,
    onExpand,
}: {
    peer: CallPeerView;
    media: CallMediaKind;
    // Dưới mũ khung chat (máy tính), đáy màn (điện thoại), hoặc nổi ở góc khi đang xem trang khác.
    placement: 'top' | 'bottom' | 'floating';
    since: string;
    // Máy người kia đã nhận tín hiệu và đang đổ chuông.
    isRinging: boolean;
    micOn: boolean;
    selfIdentity: string | null;
    renderMedia?: RenderCallMedia;
    onToggleMic: () => void;
    onCancel: () => void;
    onExpand: () => void;
}) {
    const preview = media === 'video' && selfIdentity && renderMedia ? renderMedia(selfIdentity, 'camera') : null;

    // Bo ngoài 16 = bo nút 8 + lề trong 8, nên góc thẻ và góc nút song song.
    const bar = (
        <div data-testid="outgoing-call" className={`relative overflow-hidden flex flex-none items-center gap-3 p-2 rounded-2xl ${PLACEMENT_CLASS[placement]}`}>
            {/* Vệt sáng lướt qua thẻ trong lúc chờ người kia nghe máy. */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-n-teal-9/10 to-transparent animate-call-sweep motion-reduce:hidden pointer-events-none" aria-hidden="true" />
            <button type="button" title={t('CALLS.DIRECT.EXPAND')} className="relative flex flex-1 items-center gap-3 min-w-0 text-start" onClick={onExpand}>
                <RingingAvatar peer={peer} size={32} isRinging />
                <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-5 truncate text-n-slate-12">{peer.name}</span>
                    <span className="flex items-center gap-1 text-xs leading-4 text-n-teal-11">
                        <span className={`${media === 'video' ? 'i-lucide-video' : 'i-lucide-phone'} size-3 flex-shrink-0`} />
                        <span className="truncate">{isRinging ? t('CALLS.DIRECT.RINGING') : t('CALLS.DIRECT.CALLING')}</span>
                    </span>
                </span>
            </button>
            {preview ? <div className="hidden xl:block flex-shrink-0 h-8 aspect-video overflow-hidden rounded-lg">{preview}</div> : null}
            <CallDuration startedAt={since} className="flex-shrink-0 text-base font-semibold text-n-slate-12" />
            <div className="flex flex-shrink-0 items-center gap-1">
                <Button
                    sm
                    {...(micOn ? { slate: true, faded: true } : { ruby: true, faded: true })}
                    icon={micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'}
                    title={micOn ? t('CALLS.ROOM.MIC_ON') : t('CALLS.ROOM.MIC_OFF')}
                    className="max-md:!size-11"
                    onClick={onToggleMic}
                />
                <Button sm ruby solid icon="i-lucide-phone-off" title={t('CALLS.DIRECT.CANCEL')} className="max-md:!size-11" onClick={onCancel} />
            </div>
        </div>
    );

    // Ở đáy khung app trên điện thoại: nền của chính dải, không lộ nền trang phía sau.
    return placement === 'bottom' ? <div className="flex-none bg-n-surface-canvas">{bar}</div> : bar;
}
