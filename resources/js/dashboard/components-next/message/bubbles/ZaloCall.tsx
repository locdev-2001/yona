import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Mở rộng của Yona (xem ZaloBusinessCard). Cuộc gọi là MỘT DÒNG như trên Zalo,
// không phải thẻ: loại (thoại/video) · kết cục (nhỡ/bận/huỷ) hoặc thời lượng.

export interface ZaloCall {
    media?: 'voice' | 'video' | null;
    direction?: 'inbound' | 'outbound' | null;
    outcome?: 'completed' | 'missed' | 'busy' | 'canceled' | null;
    duration_seconds?: number | null;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);

    return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export default function ZaloCallBubble() {
    const { contentAttributes } = useMessageContext();
    const call = (contentAttributes.call ?? {}) as ZaloCall;

    const isVideo = call.media === 'video';
    const seconds = call.duration_seconds ?? 0;
    const outcome = call.outcome ?? (seconds > 0 ? 'completed' : 'missed');
    const kind = t(isVideo ? 'CONVERSATION.ZALO.CALL.VIDEO' : 'CONVERSATION.ZALO.CALL.VOICE');

    const detail =
        outcome === 'completed'
            ? formatDuration(seconds)
            : t(`CONVERSATION.ZALO.CALL.${outcome.toUpperCase()}`);

    const icon =
        outcome === 'completed' ? (isVideo ? 'i-lucide-video' : 'i-lucide-phone') : 'i-lucide-phone-missed';

    return (
        <BaseBubble className="px-4 py-3" dataBubbleName="zalo-call">
            <div className="flex items-center gap-2">
                <Icon icon={icon} className="size-4" />
                <span>{`${kind} · ${detail}`}</span>
            </div>
        </BaseBubble>
    );
}
