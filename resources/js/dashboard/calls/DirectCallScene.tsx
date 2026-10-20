import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import CallOrb from './CallOrb';
import DevicePicker from './DevicePicker';
import type { CallDevice, CallDeviceKind, CallMediaKind, CallPeerView } from './types';

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
    onAccept: (media: CallMediaKind) => void;
    onDecline: () => void;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleDeafen: () => void;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    onSelectDevice: (kind: CallDeviceKind, deviceId: string) => void;
    onMinimize: () => void;
    onOpenChat: () => void;
}

type ActionTone = 'neutral' | 'off' | 'end' | 'accept';

const TONE_PROPS: Record<ActionTone, Record<string, boolean>> = {
    neutral: { slate: true, faded: true },
    off: { ruby: true, faded: true },
    end: { ruby: true, solid: true },
    accept: { teal: true, solid: true },
};

// Nút lớn của màn gọi: ô 64px bo 16, chữ ngắn ở dưới.
function CallAction({ icon, label, tone, className = '', onClick }: { icon: string; label: string; tone: ActionTone; className?: string; onClick: () => void }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <Button lg {...TONE_PROPS[tone]} icon={icon} title={label} className={`!size-16 !rounded-2xl [&>span]:!size-6 ${className}`} onClick={onClick} />
            <span className="text-xs text-n-slate-11">{label}</span>
        </div>
    );
}

// Nút phụ của màn gọi đến: biểu tượng và chữ nhỏ, không nền.
function SmallAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button type="button" className="flex flex-col items-center gap-1 min-h-11 px-2 text-n-slate-12 hover:text-n-slate-11" onClick={onClick}>
            <span className={`${icon} size-5`} aria-hidden="true" />
            <span className="text-xs">{label}</span>
        </button>
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
            className="fixed inset-0 z-50 flex flex-col bg-n-surface-canvas pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-in-up"
        >
            {props.phase === 'incoming' ? <IncomingLayout {...props} /> : <InCallLayout {...props} />}
        </section>
    );
}

function IncomingLayout(props: DirectCallSceneProps) {
    const { peer, media, onAccept, onDecline, onMinimize, onOpenChat } = props;
    const title = t(media === 'video' ? 'CALLS.DIRECT.INCOMING_VIDEO' : 'CALLS.DIRECT.INCOMING_VOICE');

    return (
        <>
            <div className="flex justify-end px-3 h-12">
                <Button sm slate link label={t('CALLS.DIRECT.HIDE')} className="!h-11 px-2" onClick={onMinimize} />
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
                <div className="grid grid-cols-2 w-full">
                    {media === 'video' ? (
                        <SmallAction icon="i-lucide-video-off" label={t('CALLS.DIRECT.ACCEPT_AUDIO_ONLY')} onClick={() => onAccept('audio')} />
                    ) : (
                        <span />
                    )}
                    <SmallAction icon="i-lucide-message-circle" label={t('CALLS.DIRECT.OPEN_CHAT')} onClick={onOpenChat} />
                </div>
                <div className="grid grid-cols-2 w-full">
                    <CallAction
                        icon={media === 'video' ? 'i-lucide-video' : 'i-lucide-phone'}
                        label={t('CALLS.DIRECT.ACCEPT')}
                        tone="accept"
                        className="[&>span]:animate-call-ring motion-reduce:[&>span]:animate-none"
                        onClick={() => onAccept(media)}
                    />
                    <CallAction icon="i-lucide-phone-off" label={t('CALLS.DIRECT.DECLINE')} tone="end" onClick={onDecline} />
                </div>
            </div>
        </>
    );
}

function InCallLayout(props: DirectCallSceneProps) {
    const { peer, phase, since, speaker, micOn, camOn, deafened, onDecline, onToggleMic, onToggleCamera, onToggleDeafen, listDevices, onSelectDevice, onMinimize, onOpenChat } = props;

    return (
        <>
            <div className="flex justify-end px-3 h-12">
                <Button sm slate link label={t('CALLS.DIRECT.HIDE')} className="!h-11 px-2" onClick={onMinimize} />
            </div>
            <div className="flex flex-col items-center gap-1 w-full max-w-sm mx-auto px-6 text-center">
                <span className="max-w-full text-2xl font-semibold truncate text-n-slate-12">{peer.name}</span>
                {phase === 'connected' ? (
                    <span className="flex items-center gap-1.5 text-sm text-n-slate-11">
                        <CallDuration startedAt={since} />
                        {/* Có người đang nói thì sóng âm sáng màu teal ngay cạnh số đếm. */}
                        <span className={`i-lucide-audio-lines size-4 ${speaker ? 'text-n-teal-11' : 'text-n-slate-8'}`} aria-hidden="true" />
                    </span>
                ) : (
                    <span className="text-sm text-n-teal-11">{t('CALLS.DIRECT.RINGING')}</span>
                )}
            </div>
            <div className="relative flex flex-1 items-center justify-center min-h-0">
                <SceneOrb {...props} className="aspect-square w-[min(84vw,40vh,22rem)]" />
                <span className="absolute">
                    <PeerAvatar peer={peer} size={88} />
                </span>
            </div>
            <div className="grid grid-cols-3 gap-y-6 w-full max-w-xs mx-auto px-4">
                <CallAction icon={micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'} label={t('CALLS.DIRECT.MUTE')} tone={micOn ? 'neutral' : 'off'} onClick={onToggleMic} />
                <CallAction icon={camOn ? 'i-lucide-video' : 'i-lucide-video-off'} label={t('CALLS.DIRECT.CAMERA')} tone="neutral" onClick={onToggleCamera} />
                <CallAction icon={deafened ? 'i-lucide-volume-x' : 'i-lucide-volume-2'} label={t('CALLS.DIRECT.SPEAKER')} tone={deafened ? 'off' : 'neutral'} onClick={onToggleDeafen} />
                <CallAction icon="i-lucide-message-circle" label={t('CALLS.DIRECT.OPEN_CHAT')} tone="neutral" onClick={onOpenChat} />
                <CallAction icon="i-lucide-phone-off" label={phase === 'connected' ? t('CALLS.DIRECT.END') : t('CALLS.DIRECT.CANCEL')} tone="end" onClick={onDecline} />
                <DevicePicker kind="audioinput" listDevices={listDevices} onSelect={onSelectDevice}>
                    {toggle => <CallAction icon="i-lucide-settings-2" label={t('CALLS.DIRECT.DEVICES')} tone="neutral" onClick={toggle} />}
                </DevicePicker>
            </div>
        </>
    );
}
