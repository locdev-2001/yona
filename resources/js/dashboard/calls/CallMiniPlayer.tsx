import { t } from '../../i18n';
import type { CallParticipantView, RenderCallMedia } from './types';

// Khung xem nhỏ góc dưới khi đã thu nhỏ phòng mà có người chia sẻ màn hình; bấm để mở lại.
// Chỉ là hình trực tiếp: không phải video, không lưu, không vào kho ảnh/video của hội thoại.
export default function CallMiniPlayer({
    sharer,
    renderMedia,
    onExpand,
}: {
    sharer: CallParticipantView;
    renderMedia?: RenderCallMedia;
    onExpand: () => void;
}) {
    return (
        <button
            type="button"
            data-testid="call-mini-player"
            className="absolute bottom-4 start-4 z-20 w-64 aspect-video overflow-hidden rounded-xl [&_img]:object-cover [&_video]:object-cover"
            title={t('CALLS.ROOM.EXPAND')}
            onClick={onExpand}
        >
            {renderMedia?.(sharer.identity, 'screen')}
            <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded-md bg-n-black/60 text-xs font-medium text-white">
                {t('CALLS.ROOM.SCREEN_OF', { name: sharer.name })}
            </span>
        </button>
    );
}
