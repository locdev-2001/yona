import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';
import { PHONE_TOUCH_MIN_WIDTH } from './touchTarget';
import type { OpenRoomSummary } from './types';

// Nút ở mũ khung chat nhóm. Phòng đang mở thì nổi màu và kèm số người đang ngồi.
export default function JoinRoomButton({
    openRoom,
    isInRoom,
    isCompact,
    onJoin,
    className = '',
}: {
    openRoom: OpenRoomSummary | null;
    // Người xem đang ngồi trong chính phòng này: bấm là mở lại màn phòng.
    isInRoom: boolean;
    isCompact: boolean;
    onJoin: () => void;
    className?: string;
}) {
    const label = isInRoom
        ? t('CALLS.ROOM.EXPAND')
        : openRoom
          ? t('CALLS.ROOM.JOIN_OPEN', { count: openRoom.total })
          : t('CALLS.ROOM.JOIN');
    // Mũ hẹp: chỉ icon, phòng đang mở thì kèm số người đang ngồi.
    const compactLabel = openRoom ? String(openRoom.total) : undefined;

    return (
        <Button
            sm
            {...(openRoom ? { teal: true, faded: true } : { slate: true, ghost: true })}
            icon="i-lucide-headphones"
            label={isCompact ? compactLabel : label}
            title={label}
            className={`justify-center ${PHONE_TOUCH_MIN_WIDTH} ${className}`}
            onClick={onJoin}
        />
    );
}
