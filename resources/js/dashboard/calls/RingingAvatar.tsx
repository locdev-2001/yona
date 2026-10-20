import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { CallPeerView } from './types';

const WAVE_DELAYS_MS = [0, 800];

// Ảnh người ở đầu bên kia. Đang đổ chuông thì hai lớp sóng mờ cùng hình ảnh lần lượt toả ra như
// tiếng chuông (nền mờ, không phải viền).
export default function RingingAvatar({ peer, size, isRinging }: { peer: CallPeerView; size: number; isRinging: boolean }) {
    return (
        <span className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
            {isRinging
                ? WAVE_DELAYS_MS.map(delay => (
                      <span
                          key={delay}
                          className={`absolute inset-0 ${size > 32 ? 'rounded-xl' : 'rounded-lg'} bg-n-brand/30 animate-call-wave motion-reduce:hidden`}
                          style={{ animationDelay: `${delay}ms` }}
                          aria-hidden="true"
                      />
                  ))
                : null}
            <span className="relative">
                <Avatar name={peer.name} src={peer.avatarUrl ?? undefined} seed={peer.avatarSeed} size={size} />
            </span>
        </span>
    );
}
