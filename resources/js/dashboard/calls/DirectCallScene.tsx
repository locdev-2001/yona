import type { ReactNode } from 'react';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import CallOrb from './CallOrb';
import DevicePicker from './DevicePicker';
import type { CallDevice, CallDeviceKind, CallMediaKind, CallPeerView } from './types';
import { PHONE_TOUCH_SIZE, TOUCH_HEIGHT } from './touchTarget';
import { answerOptionsFor, answerTone, RINGING_ICON_CLASS } from './answerOptions';

export type DirectCallPhase = 'incoming' | 'outgoing' | 'connected';

interface DirectCallSceneProps {
    peer: CallPeerView;
    media: CallMediaKind;
    phase: DirectCallPhase;
    // Lúc bắt đầu đổ chuông, hoặc lúc nối máy khi đã kết nối.
    since: string;
    speaker: 'self' | 'peer' | null;
    // Mức âm 0..1 của mình và của người kia, đọc mỗi khung hình khi đã kết nối.
    readSelfLevel: () => number;
    readPeerLevel: () => number;
    micOn: boolean;
    camOn: boolean;
    deafened: boolean;
    // Hình camera đang phát (lớp media vẽ); null khi người đó tắt camera.
    peerVideo: ReactNode | null;
    selfVideo: ReactNode | null;
    onAccept: (media: CallMediaKind) => void;
    onDecline: () => void;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleDeafen: () => void;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    onSelectDevice: (kind: CallDeviceKind, deviceId: string) => void;
    onMinimize: () => void;
}

type ActionTone = 'neutral' | 'off' | 'end';

const TONE_PROPS: Record<ActionTone, Record<string, boolean>> = {
    neutral: { slate: true, faded: true },
    off: { ruby: true, faded: true },
    end: { ruby: true, solid: true },
};

// Nút lớn của màn gọi: ô 64px bo 16, chữ ngắn ở dưới. Trên nền hình video thì nút thường thành
// kính mờ sáng, chữ trắng, để không lẫn vào hình.
function CallAction({
    icon,
    label,
    tone,
    toneProps,
    isOnVideo = false,
    className = '',
    onClick,
}: {
    icon: string;
    label: string;
    tone?: ActionTone;
    toneProps?: Record<string, boolean>;
    isOnVideo?: boolean;
    className?: string;
    onClick: () => void;
}) {
    const videoClass = isOnVideo && tone === 'neutral' ? '!bg-white/15 !text-white hover:enabled:!bg-white/25 backdrop-blur-md' : '';

    return (
        <div className="flex flex-col items-center gap-2">
            <Button lg {...(toneProps ?? TONE_PROPS[tone ?? 'neutral'])} icon={icon} title={label} className={`!size-16 !rounded-2xl [&>span]:!size-6 ${videoClass} ${className}`} onClick={onClick} />
            <span className={`text-xs ${isOnVideo ? 'text-white/90' : 'text-n-slate-11'}`}>{label}</span>
        </div>
    );
}

function PeerAvatar({ peer, size }: { peer: CallPeerView; size: number }) {
    return <Avatar name={peer.name} src={peer.avatarUrl ?? undefined} seed={avatarSeed('user', peer.userId)} size={size} roundedFull />;
}

function SceneOrb({ phase, readSelfLevel, readPeerLevel, className }: DirectCallSceneProps & { className: string }) {
    return <CallOrb mode={phase === 'connected' ? 'live' : 'waiting'} readSelfLevel={readSelfLevel} readPeerLevel={readPeerLevel} className={className} />;
}

// Màn gọi 1-1 mở rộng. Gọi đến: quả cầu ôm ảnh người gọi ở trên; bảng dưới có nhãn, tên, hai nút
// phụ nhỏ và cặp Nghe/Từ chối (cúp máy bên phải). Đang gọi và đã nối: Thu gọn bên phải, tên và số đếm kèm sóng âm ở
// giữa, quả cầu ôm ảnh người kia, lưới 3×2 nút lớn có chữ với Kết thúc ở giữa hàng dưới.
export default function DirectCallScene(props: DirectCallSceneProps) {
    return (
        <section
            role="dialog"
            aria-label={props.peer.name}
            data-testid="direct-call-scene"
            className="fixed inset-0 z-50 isolate flex flex-col bg-n-surface-canvas pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-in-up"
        >
            {props.phase === 'incoming' ? <IncomingLayout {...props} /> : <InCallLayout {...props} />}
        </section>
    );
}

function IncomingLayout(props: DirectCallSceneProps) {
    const { peer, media, onAccept, onDecline, onMinimize } = props;
    const title = t(media === 'video' ? 'CALLS.DIRECT.INCOMING_VIDEO' : 'CALLS.DIRECT.INCOMING_VOICE');
    const options = answerOptionsFor(media);

    return (
        <>
            <div className="flex justify-end px-3 h-12">
                <Button sm slate link label={t('CALLS.DIRECT.HIDE')} className={`${TOUCH_HEIGHT} px-2`} onClick={onMinimize} />
            </div>
            <div className="relative flex flex-1 items-center justify-center min-h-0">
                <SceneOrb {...props} className="aspect-square w-[min(80vw,40vh,22rem)]" />
                <span className="absolute">
                    <PeerAvatar peer={peer} size={88} />
                </span>
            </div>
            <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto px-8 pt-6">
                <div className="flex flex-col items-center gap-1 max-w-full text-center">
                    <span className="text-xs text-n-slate-11">{title}</span>
                    <span className="max-w-full text-3xl font-semibold truncate text-n-slate-12">{peer.name}</span>
                </div>
                {/* Bắt máy bên trái (Nghe, Video nếu là gọi video), cúp máy ở mép phải. */}
                <div className={`grid place-items-center w-full ${options.length > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {options.map(option => (
                        <CallAction
                            key={option.media}
                            icon={option.icon}
                            label={t(option.labelKey)}
                            toneProps={answerTone(option)}
                            className={option.isPrimary ? RINGING_ICON_CLASS : ''}
                            onClick={() => onAccept(option.media)}
                        />
                    ))}
                    <CallAction icon="i-lucide-phone-off" label={t('CALLS.DIRECT.DECLINE')} tone="end" onClick={onDecline} />
                </div>
            </div>
        </>
    );
}

function InCallLayout(props: DirectCallSceneProps) {
    const { peer, phase, since, speaker, micOn, camOn, deafened, peerVideo, selfVideo, onDecline, onToggleMic, onToggleCamera, onToggleDeafen, listDevices, onSelectDevice, onMinimize } = props;
    const isOnVideo = peerVideo !== null;

    return (
        <>
            {isOnVideo ? (
                <div className="absolute inset-0 -z-10 bg-black" aria-hidden="true">
                    {peerVideo}
                    {/* Lớp tối mờ trên và dưới để chữ, nút đọc được trên mọi hình. */}
                    <span className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
            ) : null}
            <div className="flex items-center justify-between px-3 h-12">
                <DevicePicker kind="audioinput" listDevices={listDevices} onSelect={onSelectDevice} opensBelow>
                    {toggle => (
                        <Button
                            sm
                            slate
                            ghost
                            icon="i-lucide-settings-2"
                            title={t('CALLS.DIRECT.DEVICES')}
                            className={`${PHONE_TOUCH_SIZE} ${isOnVideo ? '!text-white hover:enabled:!bg-white/15' : ''}`}
                            onClick={toggle}
                        />
                    )}
                </DevicePicker>
                <Button sm slate link label={t('CALLS.DIRECT.HIDE')} className={`${TOUCH_HEIGHT} px-2 ${isOnVideo ? '!text-white' : ''}`} onClick={onMinimize} />
            </div>
            <div className="flex flex-col items-center gap-1 w-full max-w-sm mx-auto px-6 text-center">
                <span className={`max-w-full text-2xl font-semibold truncate ${isOnVideo ? 'text-white' : 'text-n-slate-12'}`}>{peer.name}</span>
                {phase === 'connected' ? (
                    <span className={`flex items-center gap-1.5 text-sm ${isOnVideo ? 'text-white/80' : 'text-n-slate-11'}`}>
                        <CallDuration startedAt={since} />
                        {/* Có người đang nói thì sóng âm sáng màu teal ngay cạnh số đếm. */}
                        <span className={`i-lucide-audio-lines size-4 ${speaker ? 'text-n-teal-9' : isOnVideo ? 'text-white/40' : 'text-n-slate-8'}`} aria-hidden="true" />
                    </span>
                ) : (
                    <span className="text-sm text-n-slate-11">{t('CALLS.DIRECT.RINGING')}</span>
                )}
            </div>
            <div className="relative flex flex-1 items-center justify-center min-h-0">
                {isOnVideo ? null : (
                    <>
                        <SceneOrb {...props} className="aspect-square w-[min(84vw,40vh,22rem)]" />
                        <span className="absolute">
                            <PeerAvatar peer={peer} size={88} />
                        </span>
                    </>
                )}
                {selfVideo ? (
                    <div className="absolute bottom-4 end-4 w-28 sm:w-40 aspect-[3/4] sm:aspect-video overflow-hidden rounded-xl bg-black">{selfVideo}</div>
                ) : null}
            </div>
            {/* Ba nút điều khiển một hàng, Kết thúc đứng riêng ở giữa hàng dưới. */}
            <div className="grid grid-cols-3 place-items-center gap-y-6 w-full max-w-xs mx-auto px-4">
                <CallAction icon={micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'} label={t('CALLS.DIRECT.MUTE')} tone={micOn ? 'neutral' : 'off'} isOnVideo={isOnVideo} onClick={onToggleMic} />
                <CallAction icon={camOn ? 'i-lucide-video' : 'i-lucide-video-off'} label={t('CALLS.DIRECT.CAMERA')} tone="neutral" isOnVideo={isOnVideo} onClick={onToggleCamera} />
                <CallAction icon={deafened ? 'i-lucide-volume-x' : 'i-lucide-volume-2'} label={t('CALLS.DIRECT.SOUND')} tone={deafened ? 'off' : 'neutral'} isOnVideo={isOnVideo} onClick={onToggleDeafen} />
                <div className="col-start-2">
                    <CallAction
                        icon="i-lucide-phone-off"
                        label={phase === 'connected' ? t('CALLS.DIRECT.END') : t('CALLS.DIRECT.CANCEL')}
                        tone="end"
                        isOnVideo={isOnVideo}
                        onClick={onDecline}
                    />
                </div>
            </div>
        </>
    );
}
